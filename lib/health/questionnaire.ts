// Reading the health questionnaire off a form, and refusing what cannot be
// read.
//
// Nothing here talks to a database or interprets anything clinically. It
// turns what a person typed into a version that can be stored, and says
// plainly what is missing when something is.

export const SEXES = ["female", "male", "unspecified"] as const;
export const PREGNANCY_STATUSES = [
  "not_applicable",
  "no",
  "pregnant",
  "breastfeeding",
  "planning"
] as const;
export const CYCLE_STATUSES = [
  "not_applicable",
  "regular",
  "irregular",
  "absent",
  "menopause"
] as const;

export type Sex = (typeof SEXES)[number];
export type PregnancyStatus = (typeof PREGNANCY_STATUSES)[number];
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export type QuestionnaireVersion = {
  birth_date: string | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  complaints: string | null;
  chronic_conditions: string | null;
  surgeries: string | null;
  allergies: string | null;
  habits: string | null;
  pregnancy_status: PregnancyStatus | null;
  cycle_status: CycleStatus | null;
  cycle_note: string | null;
  self_description: string | null;
};

// Which fields the form will not accept empty.
//
// Deliberately short. Every extra required field is a person who abandons
// the form, and a picture nobody filled in is worth less than a partial one
// somebody did. These four are here because without them the rest cannot be
// read: the same haemoglobin means different things at 25 and at 75, the
// cycle and pregnancy questions only make sense once sex is known, the
// complaint is what the person actually came about, and their own account
// is the half of the picture no set of boxes can hold.
export const REQUIRED_FIELDS = [
  "birth_date",
  "sex",
  "complaints",
  "self_description"
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

const TEXT_LIMIT = 4000;
const DESCRIPTION_LIMIT = 12000;

export type QuestionnaireReadResult =
  | { status: "ok"; version: QuestionnaireVersion }
  | { status: "incomplete"; missing: RequiredField[] }
  | { status: "invalid"; field: string };

function text(value: FormDataEntryValue | null, limit: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  // Line breaks are kept: a person listing four operations on four lines
  // meant four lines. Only the runs of spaces within a line are collapsed.
  const clean = value
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return clean.length > 0 ? clean.slice(0, limit) : null;
}

function choice<T extends string>(
  value: FormDataEntryValue | null,
  allowed: readonly T[]
): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

// A measurement typed by a person, in whichever way they type decimals.
function measurement(
  value: FormDataEntryValue | null,
  low: number,
  high: number
): number | null | "invalid" {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value.trim().replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < low || parsed > high) {
    return "invalid";
  }

  return Math.round(parsed * 10) / 10;
}

// A date of birth in the future, or from before anybody alive, is a typing
// slip rather than a fact — and an age computed from it would be read as
// one.
export function isPlausibleBirthDate(value: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const born = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(born.getTime())) {
    return false;
  }

  const earliest = new Date(today);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 120);

  return born <= today && born >= earliest;
}

export function readQuestionnaire(formData: FormData): QuestionnaireReadResult {
  const birthDate = text(formData.get("birth_date"), 10);

  if (birthDate && !isPlausibleBirthDate(birthDate)) {
    return { status: "invalid", field: "birth_date" };
  }

  const height = measurement(formData.get("height_cm"), 30, 260);

  if (height === "invalid") {
    return { status: "invalid", field: "height_cm" };
  }

  const weight = measurement(formData.get("weight_kg"), 2, 400);

  if (weight === "invalid") {
    return { status: "invalid", field: "weight_kg" };
  }

  const sex = choice(formData.get("sex"), SEXES);

  const version: QuestionnaireVersion = {
    birth_date: birthDate,
    sex,
    height_cm: height,
    weight_kg: weight,
    complaints: text(formData.get("complaints"), TEXT_LIMIT),
    chronic_conditions: text(formData.get("chronic_conditions"), TEXT_LIMIT),
    surgeries: text(formData.get("surgeries"), TEXT_LIMIT),
    allergies: text(formData.get("allergies"), TEXT_LIMIT),
    habits: text(formData.get("habits"), TEXT_LIMIT),
    // Asked of women only, so a man's questionnaire records that the
    // question did not apply rather than leaving a blank somebody later
    // reads as "not answered".
    pregnancy_status:
      sex === "female"
        ? choice(formData.get("pregnancy_status"), PREGNANCY_STATUSES)
        : "not_applicable",
    cycle_status:
      sex === "female"
        ? choice(formData.get("cycle_status"), CYCLE_STATUSES)
        : "not_applicable",
    cycle_note: sex === "female" ? text(formData.get("cycle_note"), TEXT_LIMIT) : null,
    self_description: text(formData.get("self_description"), DESCRIPTION_LIMIT)
  };

  const missing = REQUIRED_FIELDS.filter((field) => version[field] === null);

  return missing.length > 0
    ? { status: "incomplete", missing }
    : { status: "ok", version };
}

// Whether this version says anything the one before it did not.
//
// Opening the questionnaire, reading it and pressing save changes nothing,
// and writing that down as a new version would put a date on an answer the
// person never revisited — which is exactly the kind of false history the
// append-only table exists to avoid.
export function isSameAnswers(
  next: QuestionnaireVersion,
  previous: QuestionnaireVersion | null
): boolean {
  if (!previous) {
    return false;
  }

  return (Object.keys(next) as Array<keyof QuestionnaireVersion>).every(
    (field) => next[field] === previous[field]
  );
}
