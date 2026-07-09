"use server";

import { redirect } from "next/navigation";
import type {
  CareRecipientType,
  OnboardingActionState
} from "@/lib/onboarding/types";
import { writeAuditLogs, type AuditLogInput } from "@/lib/audit/log";
import { OFFER_VERSION } from "@/lib/legal/offer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const careRecipientTypes: CareRecipientType[] = ["self", "family_member"];

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
    return errorState("Сервис временно недоступен: не настроено подключение к базе данных.");
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
  const careRecipientType = readRequiredText(formData, "careRecipientType");
  const primaryGoal = readRequiredText(formData, "primaryGoal");
  const situationDescription = readRequiredText(
    formData,
    "situationDescription"
  );
  const offerAccepted = formData.get("offerAccepted") === "on";
  const consentAccepted = formData.get("consentAccepted") === "on";

  if (!fullName || !phone || !primaryGoal || !situationDescription) {
    return errorState("Заполните все обязательные поля анкеты.");
  }

  if (!isCareRecipientType(careRecipientType)) {
    return errorState("Укажите, для кого запрос.");
  }

  if (!offerAccepted) {
    return errorState("Для отправки анкеты необходимо принять условия публичной оферты.");
  }

  if (!consentAccepted) {
    return errorState("Для отправки анкеты необходимо согласие на обработку данных.");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      phone,
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

  const submittedAt = new Date().toISOString();
  const payload = {
    full_name: fullName,
    phone,
    care_recipient_type: careRecipientType,
    primary_goal: primaryGoal,
    situation_description: situationDescription,
    offer_accepted: true,
    offer_version: OFFER_VERSION,
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

  const { data: offerConsentRecord, error: offerConsentError } = await supabase
    .from("consent_records")
    .insert({
      profile_id: user.id,
      case_id: caseId,
      consent_type: "offer_acceptance",
      status: "accepted",
      version: OFFER_VERSION,
      source: "onboarding_form",
      metadata: {
        onboarding_submission_id: onboardingSubmission.id
      }
    })
    .select("id")
    .single();

  if (offerConsentError) {
    return errorState(offerConsentError.message);
  }

  const { data: consentRecord, error: consentError } = await supabase
    .from("consent_records")
    .insert({
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
    })
    .select("id")
    .single();

  if (consentError) {
    return errorState(consentError.message);
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
        consent_version: OFFER_VERSION
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

  await writeAuditLogs(auditLogs);

  redirect("/cabinet?onboarding=submitted");
}
