import type { DocumentHeader } from "@/lib/assistant/metadata";

// Whose document this is, and whether the case has seen it before.
//
// Both questions are answered from the header, before the full reading,
// and both are answered conservatively. A document is called somebody
// else's only on positive evidence — a different date of birth, or two
// full names with no surname in common. Missing evidence is "unknown", and
// unknown goes to a person; it does not become a match because nothing
// contradicted it.

export type IdentityStatus = "match" | "mismatch" | "unknown";

export type IdentityVerdict = {
  status: IdentityStatus;
  reasons: string[];
};

export type KnownPerson = {
  fullName: string | null;
  birthDate: string | null;
};

// Lowercase, ё folded, punctuation gone, split into words. "Иванова А.А."
// and "Анна Иванова" share the word "иванова" and nothing else.
function nameTokens(name: string | null): string[] {
  if (!name) {
    return [];
  }

  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\s]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

// Words long enough to be a name rather than an initial.
function fullWords(tokens: string[]): string[] {
  return tokens.filter((token) => token.length >= 3);
}

export function resolveIdentity(header: DocumentHeader, person: KnownPerson): IdentityVerdict {
  const reasons: string[] = [];
  const headerName = nameTokens(header.fullName);
  const personName = nameTokens(person.fullName);

  // Date of birth is the strongest signal either way, so it is checked
  // first and a disagreement ends the question.
  if (header.birthDate && person.birthDate) {
    if (header.birthDate !== person.birthDate) {
      return {
        status: "mismatch",
        reasons: [
          `Дата рождения в документе (${header.birthDatePrinted ?? header.birthDate}) не совпадает с анкетой (${person.birthDate}).`
        ]
      };
    }

    reasons.push("Дата рождения совпадает с анкетой.");
  }

  if (headerName.length > 0 && personName.length > 0) {
    const shared = fullWords(headerName).filter((token) => fullWords(personName).includes(token));

    if (shared.length === 0) {
      return {
        status: "mismatch",
        reasons: [
          ...reasons,
          `В документе «${header.fullName}», в профиле «${person.fullName}» — ни одного общего слова в имени.`
        ]
      };
    }

    reasons.push(`Совпадает имя: ${shared.join(", ")}.`);

    return { status: "match", reasons };
  }

  if (reasons.length > 0) {
    // Date of birth agreed and there is no name to check against. A date
    // alone is shared by many people; it is not an identity.
    return {
      status: "unknown",
      reasons: [...reasons, "Имени в документе или в профиле нет, поэтому принадлежность не подтверждена."]
    };
  }

  return {
    status: "unknown",
    reasons: ["В шапке документа нет ни имени, ни даты рождения, поэтому принадлежность не установлена."]
  };
}

// Whether the case already holds this study.
//
// The same file twice is a duplicate: same bytes, same fingerprint. A
// corrected report is a version: different bytes, but the same laboratory
// order — the same accession number, or failing that the same laboratory
// and the same collection date. A version is kept and linked to the
// original rather than treated as a new study, because a trend drawn
// through the original and its correction would show a change that never
// happened in the person.

export type ExistingDocument = {
  documentId: string;
  fingerprint: string;
  header: DocumentHeader | null;
};

export type DocumentRelation =
  | { kind: "new" }
  | { kind: "duplicate"; of: string; reason: string }
  | { kind: "version"; of: string; reason: string };

export function relateDocument(
  candidate: { fingerprint: string; header: DocumentHeader | null },
  existing: ExistingDocument[]
): DocumentRelation {
  const duplicate = existing.find((doc) => doc.fingerprint === candidate.fingerprint);

  if (duplicate) {
    return { kind: "duplicate", of: duplicate.documentId, reason: "Тот же файл уже загружен в кейс." };
  }

  const header = candidate.header;

  if (!header) {
    return { kind: "new" };
  }

  if (header.accession) {
    const sameOrder = existing.find((doc) => doc.header?.accession === header.accession);

    if (sameOrder) {
      return {
        kind: "version",
        of: sameOrder.documentId,
        reason: `Тот же номер заказа (${header.accession}) — это версия уже загруженного отчёта, не новое исследование.`
      };
    }
  }

  if (header.laboratory && header.collectionDate) {
    const sameDraw = existing.find(
      (doc) =>
        doc.header?.laboratory?.toLowerCase() === header.laboratory?.toLowerCase() &&
        doc.header?.collectionDate === header.collectionDate
    );

    if (sameDraw) {
      return {
        kind: "version",
        of: sameDraw.documentId,
        reason: `Та же лаборатория и та же дата забора (${header.collectionDate}) — это версия уже загруженного отчёта.`
      };
    }
  }

  return { kind: "new" };
}
