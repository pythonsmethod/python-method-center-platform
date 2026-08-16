export const CASE_STATUSES = [
  "created",
  "awaiting_onboarding",
  "ready_for_review",
  "in_review",
  "active_support",
  "inactive_support",
  "completed",
  "archived"
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_URGENCIES = ["normal", "elevated", "critical"] as const;

export type CaseUrgency = (typeof CASE_URGENCIES)[number];

export const CASE_DIRECTIONS = [
  "not_set",
  "recovery",
  "rehabilitation",
  "preservation"
] as const;

export type CaseDirection = (typeof CASE_DIRECTIONS)[number];

export const PAYMENT_PRODUCTS = [
  "preliminary_assessment",
  "support_5_weeks",
  "support_15_weeks"
] as const;

export type PaymentProduct = (typeof PAYMENT_PRODUCTS)[number];

export function includesValue<T extends readonly string[]>(
  values: T,
  value: string
): value is T[number] {
  return (values as readonly string[]).includes(value);
}
