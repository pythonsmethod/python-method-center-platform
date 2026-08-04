// Plural forms as data, never as a function.
//
// The dictionary crosses the server/client boundary: a cabinet page hands
// whole sections of it to client components as props. React serializes
// those props, and a function cannot be serialized — it throws "Functions
// cannot be passed directly to Client Components" and takes the page down
// with it. A pluralization helper written as a dictionary entry looks
// harmless and is not.
//
// So the dictionary holds the three words, and the choosing happens here.

export type PluralForms = {
  // Which language's counting rules apply. Carried in the data rather than
  // read from the locale, because the component holding these words often
  // does not know which language it was handed — the client cabinet and
  // the Russian-only team workspace share the same components.
  rule: "ru" | "en";
  // ru: 1, 21, 101 · en: 1 only
  one: string;
  // ru: 2–4, 22–24 · en: unused, same word as many
  few: string;
  // ru: 0, 5–20, 11–14 · en: everything except 1
  many: string;
};

export function plural(count: number, forms: PluralForms): string {
  const n = Math.abs(Math.trunc(count));

  if (forms.rule === "en") {
    return n === 1 ? forms.one : forms.many;
  }

  const mod10 = n % 10;
  const mod100 = n % 100;

  // The teens are the exception the modulo-10 rules alone would get wrong:
  // 11–14 take the "many" form despite ending in 1–4.
  if (mod100 >= 11 && mod100 <= 14) {
    return forms.many;
  }

  if (mod10 === 1) {
    return forms.one;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return forms.few;
  }

  return forms.many;
}
