"use server";

import { redirect } from "next/navigation";
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
  const ageConfirmed = formData.get("ageConfirmed") === "on";
  const guardianConfirmed = formData.get("guardianConfirmed") === "on";
  const minorFullName = readRequiredText(formData, "minorFullName");
  const minorBirthDate = readRequiredText(formData, "minorBirthDate");
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
  if (isGuardianPath) {
    if (!minorFullName || !isFullName(minorFullName) || !minorBirthDate) {
      return errorState(t.errorMinorFields);
    }

    const age = yearsSince(minorBirthDate);

    if (age === null || age < 0) {
      return errorState(t.errorMinorFields);
    }

    if (age >= MIN_PARTICIPANT_AGE) {
      // Not a refusal: this person can simply register in their own name.
      return errorState(t.errorMinorTooOld);
    }

    if (!guardianConfirmed) {
      return errorState(t.errorGuardian);
    }
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
        status: "ready_for_review",
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

  const submittedAt = new Date().toISOString();
  const payload = {
    full_name: fullName,
    phone,
    country_code: countryCode,
    delivery: deliveryProfile,
    care_recipient_type: careRecipientType,
    primary_goal: primaryGoal,
    situation_description: situationDescription,
    age_confirmed: isGuardianPath ? false : ageConfirmed,
    guardian_confirmed: isGuardianPath ? guardianConfirmed : false,
    minor_full_name: isGuardianPath ? minorFullName : null,
    minor_birth_date: isGuardianPath ? minorBirthDate : null,
    minor_age_years: isGuardianPath ? yearsSince(minorBirthDate) : null,
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
  if (isGuardianPath && !consentError) {
    await supabase.from("consent_records").insert({
      profile_id: user.id,
      case_id: caseId,
      consent_type: "offer_acceptance",
      status: "accepted",
      version: OFFER_VERSION,
      source: "onboarding_guardian",
      metadata: {
        guardian_for: minorFullName,
        minor_birth_date: minorBirthDate,
        minor_age_years: yearsSince(minorBirthDate),
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
      toStatus: "ready_for_review",
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
  redirect("/cabinet/health?onboarding=submitted");
}
