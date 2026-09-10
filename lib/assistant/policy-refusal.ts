// Stable, provider-neutral copy. Never echo a provider error or user details.
export function providerPolicyRefusal(locale: "ru" | "en" = "ru") {
  return {
    status: "ok" as const,
    refusal: "provider_policy" as const,
    reply: locale === "en"
      ? "I can’t help with that request. I can help with a safe next step or questions about the center. If you or someone else is in immediate danger, contact local emergency services now."
      : "Я не могу помочь с этим запросом. Могу помочь с безопасным следующим шагом или вопросами центра. Если вам или другому человеку прямо сейчас угрожает опасность, немедленно обратитесь в местную экстренную службу.",
  };
}

export async function isExplicitPolicyError(response: Response): Promise<boolean> {
  if (response.status !== 400) return false;
  const body = await response.json().catch(() => null);
  // Observed and reproduced code; other 4xx/5xx are operational errors.
  return body?.error?.code === "cyber_policy" && body?.error?.type === "invalid_request_error";
}

export function isFilteredChoice(choice: {
  finish_reason?: string | null;
  message?: { refusal?: string | null };
} | undefined): boolean {
  return choice?.finish_reason === "content_filter" || Boolean(choice?.message?.refusal);
}
