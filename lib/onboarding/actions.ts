"use server";

import { redirect } from "next/navigation";
import { recordProductEvent } from "@/lib/product-analytics/record";
import type {
  CareRecipientType,
  OnboardingActionState
} from "@/lib/onboarding/types";
import { writeAuditLogs, type AuditLogInput } from "@/lib/audit/log";
import {
  writeLifecycleEvents,
  type LifecycleEventInput
} from "@/lib/cases/lifecycle";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import {
  getOfferDocumentLocale,
  OFFER_BINDING_LOCALE,
  OFFER_VERSION
} from "@/lib/legal/offer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { syncCaseFromOnboarding } from "@/lib/onboarding/case-sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isCountryCode, isFullName } from "@/lib/profile/identity";
import { isDeliveryProfileComplete, readDeliveryProfile } from "@/lib/delivery/profile";
import { ensureDeliveryTaskForPayment } from "@/lib/delivery/create-task";

const careRecipientTypes: CareRecipientType[] = [
  "self",
  "family_member",
  "minor"
];

// Clause 7 of the offer. Computed from the date of birth rather than
// trusted from a checkbox, because the guardian path exists precisely for
// people who cannot tick one for themselves.
const MIN_PARTICIPANT_AGE = 21;

function yearsSince(isoDate: string): number | null {
  const born = new Date(isoDate);

  if (Number.isNaN(born.getTime())) {
    return null;
  }

  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
    years -= 1;
  }

  return years;
}

function errorState(message: string): OnboardingActionState {
  return { status: "error", message };
}

function readRequiredText(formData: FormData, fieldName: string): string {
  return String(formData.get(fieldName) ?? "").trim();
}

function isCareRecipientType(value: string): value is CareRecipientType {
  return careRecipientTypes.includes(value as CareRecipientType);
}

export async function submitOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/onboarding");
  }

  const fullName = readRequiredText(formData, "fullName");
  const phone = readRequiredText(formData, "phone");
  const countryCode = readRequiredText(formData, "countryCode").toUpperCase();
  const careRecipientType = readRequiredText(formData, "careRecipientType");
  const primaryGoal = readRequiredText(formData, "primaryGoal");
  const situationDescription = readRequiredText(
    formData,
    "situationDescription"
  );
  // Which language the offer was actually shown in. Not always the
  // language of the site: the English client is shown the Russian text
  // until a translation exists, and the record has to say so.
  const uiLocale = await getLocale();
  // Validation messages come back from the server, so they have to follow
  // the visitor's language too — an English client was being refused in
  // Russian.
  const t = getDictionary(uiLocale).onboarding;
  const offerLocale = getOfferDocumentLocale(uiLocale);
  const isGuardianPath = careRecipientType === "minor";
  const isRepresentedPatient = careRecipientType !== "self";
  const ageConfirmed = formData.get("ageConfirmed") === "on";
  const representativeConfirmed = formData.get("representativeConfirmed") === "on";
  const patientDataConsent = formData.get("patientDataConsent") === "on";
  const responsibilityAcknowledged = formData.get("responsibilityAcknowledged") === "on";
  const patientFullName = readRequiredText(formData, "patientFullName");
  const patientBirthDate = readRequiredText(formData, "patientBirthDate");
  const patientRelationship = readRequiredText(formData, "patientRelationship");
  const accountOwnerRole = readRequiredText(formData, "accountOwnerRole");
  const representationReason = readRequiredText(formData, "representationReason");
  const offerAccepted = formData.get("offerAccepted") === "on";
  const consentAccepted = formData.get("consentAccepted") === "on";
  const deliveryProfile = readDeliveryProfile(formData);

  if (!fullName || !phone || !countryCode || !primaryGoal || !situationDescription) {
    return errorState(t.errorFields);
  }

  if (!isFullName(fullName)) {
    return errorState(t.errorFullName);
  }

  if (!isCountryCode(countryCode)) {
    return errorState(t.errorCountry);
  }

  if (!isDeliveryProfileComplete(deliveryProfile)) {
    return errorState(uiLocale === "ru"
      ? "Заполните полный адрес для доставки, email, индекс и телефон с кодом страны."
      : "Enter the complete delivery address, email, postal code, and a phone number with country code.");
  }

  if (!isCareRecipientType(careRecipientType)) {
    return errorState(t.errorRecipient);
  }

  // Age, before anything is written down.
  if (isRepresentedPatient) {
    if (!patientFullName || !isFullName(patientFullName) || !patientBirthDate || !patientRelationship || !accountOwnerRole || !representationReason) {
      return errorState(t.errorMinorFields);
    }

    const age = yearsSince(patientBirthDate);

    if (age === null || age < 0) {
      return errorState(t.errorMinorFields);
    }

    if (isGuardianPath && age >= MIN_PARTICIPANT_AGE) {
      // Not a refusal: this person can simply register in their own name.
      return errorState(t.errorMinorTooOld);
    }

    if (!isGuardianPath && age < MIN_PARTICIPANT_AGE) return errorState(t.errorAge);
    if (!representativeConfirmed) {
      return errorState(t.errorGuardian);
    }
    if (!patientDataConsent || !responsibilityAcknowledged) return errorState(t.errorRepresentative);
  } else if (!ageConfirmed) {
    return errorState(t.errorAge);
  }

  if (!offerAccepted) {
    return errorState(t.errorOffer);
  }

  if (!consentAccepted) {
    return errorState(t.errorConsent);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      phone,
      country_code: countryCode,
      ...deliveryProfile,
      status: "active"
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return errorState(profileError.message);
  }

  const { data: existingCase, error: caseLookupError } = await supabase
    .from("client_cases")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (caseLookupError) {
    return errorState(caseLookupError.message);
  }

  let caseId = existingCase?.id as string | undefined;
  let caseCreated = false;

  if (caseId) {
    // P1-01: this update must NOT run under the client's own session —
    // client_cases has no client UPDATE policy (case decisions are
    // staff-owned), so RLS silently updates zero rows and the client's
    // corrected answers vanish behind a success message. The narrow sync
    // goes through the service role with an explicit ownership check.
    const syncResult = await syncCaseFromOnboarding(
      createSupabaseServiceClient(),
      {
        caseId,
        profileId: user.id,
        primaryGoal,
        situationDescription
      }
    );

    if (syncResult.status === "error") {
      return errorState(syncResult.message);
    }
  }

  if (!caseId) {
    const { data: createdCase, error: caseCreateError } = await supabase
      .from("client_cases")
      .insert({
        profile_id: user.id,
        title: primaryGoal,
        summary: situationDescription
      })
      .select("id")
      .single();

    if (caseCreateError) {
      return errorState(caseCreateError.message);
    }

    caseId = createdCase.id;
    caseCreated = true;
  }

  if (!caseId) {
    return errorState(t.errorCase);
  }

  const service = createSupabaseServiceClient();
  if (!service) return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  const recipientQuery = isRepresentedPatient
    ? service.from("care_recipients").upsert({
        case_id: caseId, profile_id: user.id, recipient_type: isGuardianPath ? "minor" : "adult",
        full_name: patientFullName, birth_date: patientBirthDate,
        relationship_to_client: patientRelationship, client_role_for_recipient: accountOwnerRole,
        reason_for_representation: representationReason, representative_confirmed: true,
        data_processing_consent: true, responsibility_acknowledged: true, is_current: true
      }, { onConflict: "case_id" })
    : service.from("care_recipients").update({ is_current: false }).eq("case_id", caseId).eq("profile_id", user.id);
  const { error: recipientError } = await recipientQuery;
  if (recipientError) return errorState(recipientError.message);

  const submittedAt = new Date().toISOString();
  const payload = {
    full_name: fullName,
    phone,
    country_code: countryCode,
    delivery: deliveryProfile,
    care_recipient_type: careRecipientType,
    primary_goal: primaryGoal,
    situation_description: situationDescription,
    age_confirmed: isRepresentedPatient ? false : ageConfirmed,
    representative_confirmed: isRepresentedPatient ? representativeConfirmed : false,
    patient_full_name: isRepresentedPatient ? patientFullName : null,
    patient_birth_date: isRepresentedPatient ? patientBirthDate : null,
    patient_age_years: isRepresentedPatient ? yearsSince(patientBirthDate) : null,
    patient_relationship: isRepresentedPatient ? patientRelationship : null,
    account_owner_role: isRepresentedPatient ? accountOwnerRole : null,
    representation_reason: isRepresentedPatient ? representationReason : null,
    patient_data_consent: isRepresentedPatient ? patientDataConsent : false,
    responsibility_acknowledged: isRepresentedPatient ? responsibilityAcknowledged : false,
    offer_accepted: true,
    offer_version: OFFER_VERSION,
    offer_document_locale: offerLocale,
        offer_binding_locale: OFFER_BINDING_LOCALE,
    ui_locale: uiLocale,
    consent_accepted: true,
    submitted_at: submittedAt
  };

  const { data: onboardingSubmission, error: onboardingError } = await supabase
    .from("onboarding_submissions")
    .insert({
      profile_id: user.id,
      case_id: caseId,
      status: "submitted",
      submitted_at: submittedAt,
      payload
    })
    .select("id")
    .single();

  if (onboardingError) {
    return errorState(onboardingError.message);
  }

  const { data: consentRows, error: consentError } = await supabase
    .from("consent_records")
    .insert([
      {
        profile_id: user.id,
        case_id: caseId,
        consent_type: "offer_acceptance",
        status: "accepted",
        version: OFFER_VERSION,
        source: "onboarding_form",
        metadata: {
          onboarding_submission_id: onboardingSubmission.id,
          offer_document_locale: offerLocale,
        offer_binding_locale: OFFER_BINDING_LOCALE,
          ui_locale: uiLocale
        }
      },
      {
        profile_id: user.id,
        case_id: caseId,
        consent_type: "data_processing",
        status: "accepted",
        version: "onboarding-v1",
        source: "onboarding_form",
        metadata: {
          onboarding_submission_id: onboardingSubmission.id,
          care_recipient_type: careRecipientType
        }
      }
    ])
    .select("id, consent_type");

  // A guardian accepting on a minor's behalf is a distinct consent, and the
  // record has to name whose behalf it was given on.
  if (isRepresentedPatient && !consentError) {
    await supabase.from("consent_records").insert({
      profile_id: user.id,
      case_id: caseId,
      consent_type: "offer_acceptance",
      status: "accepted",
      version: OFFER_VERSION,
      source: isGuardianPath ? "onboarding_guardian" : "onboarding_representative",
      metadata: {
        care_recipient: patientFullName,
        patient_birth_date: patientBirthDate,
        patient_age_years: yearsSince(patientBirthDate),
        relationship_to_client: patientRelationship,
        client_role_for_recipient: accountOwnerRole,
        reason_for_representation: representationReason,
        offer_document_locale: offerLocale,
        offer_binding_locale: OFFER_BINDING_LOCALE,
        ui_locale: uiLocale
      }
    });
  }

  if (consentError) {
    return errorState(consentError.message);
  }

  const offerConsentRecord = consentRows?.find(
    (row) => row.consent_type === "offer_acceptance"
  );
  const consentRecord = consentRows?.find(
    (row) => row.consent_type === "data_processing"
  );

  if (!offerConsentRecord || !consentRecord) {
    return errorState(t.errorConsentSave);
  }

  const auditLogs: AuditLogInput[] = [
    {
      profileId: user.id,
      caseId,
      actorId: user.id,
      actorRole: "client",
      action: "onboarding_submitted",
      entityTable: "onboarding_submissions",
      entityId: onboardingSubmission.id,
      metadata: {
        care_recipient_type: careRecipientType
      }
    },
    {
      profileId: user.id,
      caseId,
      actorId: user.id,
      actorRole: "client",
      action: "offer_accepted",
      entityTable: "consent_records",
      entityId: offerConsentRecord.id,
      metadata: {
        consent_type: "offer_acceptance",
        consent_version: OFFER_VERSION,
        offer_document_locale: offerLocale,
        offer_binding_locale: OFFER_BINDING_LOCALE,
        ui_locale: uiLocale
      }
    },
    {
      profileId: user.id,
      caseId,
      actorId: user.id,
      actorRole: "client",
      action: "consent_captured",
      entityTable: "consent_records",
      entityId: consentRecord.id,
      metadata: {
        consent_type: "data_processing",
        consent_version: "onboarding-v1"
      }
    }
  ];

  if (caseCreated) {
    auditLogs.unshift({
      profileId: user.id,
      caseId,
      actorId: user.id,
      actorRole: "client",
      action: "client_case_created",
      entityTable: "client_cases",
      entityId: caseId,
      metadata: {
        source: "onboarding_form"
      }
    });
  }

  const lifecycleEvents: LifecycleEventInput[] = [
    {
      profileId: user.id,
      caseId,
      eventType: "onboarding_submitted",
      actorId: user.id,
      actorRole: "client",
      metadata: { onboarding_submission_id: onboardingSubmission.id }
    },
    {
      profileId: user.id,
      caseId,
      eventType: "consent_recorded",
      actorId: user.id,
      actorRole: "client",
      metadata: {
        consent_types: ["offer_acceptance", "data_processing"],
        offer_version: OFFER_VERSION
      }
    }
  ];

  if (caseCreated) {
    lifecycleEvents.unshift({
      profileId: user.id,
      caseId,
      eventType: "case_created",
      actorId: user.id,
      actorRole: "client",
      metadata: { source: "onboarding_form" }
    });
  }

  await Promise.all([
    writeAuditLogs(auditLogs),
    writeLifecycleEvents(lifecycleEvents)
  ]);

  // A client may have paid before completing the new delivery form. Recheck
  // paid purchases now so the volunteer task appears without manual work.
  const serviceDb = createSupabaseServiceClient();
  if (serviceDb) {
    const { data: paidPayments } = await serviceDb.from("payments")
      .select("id, case_id, product").eq("profile_id", user.id).eq("status", "paid");
    await Promise.all((paidPayments ?? []).map(payment => ensureDeliveryTaskForPayment(serviceDb, {
      paymentId: payment.id,
      profileId: user.id,
      caseId: payment.case_id,
      product: payment.product
    })));
  }

  // Straight on to the health questionnaire rather than the cabinet home.
  // The form just submitted is the contract and the contact details; the
  // picture of the person is the next thing the centre needs, and it is
  // asked for while they are still filling things in rather than left for
  // them to discover in a menu.
  await recordProductEvent("onboarding_completed", uiLocale);
  redirect("/cabinet/health?onboarding=submitted");
}
