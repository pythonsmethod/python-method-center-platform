import { describe, expect, it } from "vitest";
import { relateDocument, resolveIdentity } from "@/lib/analysis/identity";
import type { DocumentHeader } from "@/lib/assistant/metadata";

function header(extra: Partial<DocumentHeader> = {}): DocumentHeader {
  return {
    fullName: null, birthDate: null, birthDatePrinted: null, laboratory: null, accession: null,
    collectionDate: null, collectionDatePrinted: null, reportDate: null, language: null, ...extra
  };
}

const anna = { fullName: "Анна Дубровенко", birthDate: "1980-04-12" };

describe("чей документ (приёмочный случай 8.5)", () => {
  it("документ другого человека — несовпадение по дате рождения", () => {
    const r = resolveIdentity(header({ fullName: "Дубровенко А.", birthDate: "1975-01-01", birthDatePrinted: "01.01.1975" }), anna);

    expect(r.status).toBe("mismatch");
    expect(r.reasons[0]).toContain("01.01.1975");
  });

  it("документ другого человека — ни одного общего слова в имени", () => {
    expect(resolveIdentity(header({ fullName: "Петров Иван Сергеевич" }), anna).status).toBe("mismatch");
  });

  it("фамилия с инициалами — совпадение", () => {
    expect(resolveIdentity(header({ fullName: "Дубровенко А. В." }), anna).status).toBe("match");
    expect(resolveIdentity(header({ fullName: "ДУБРОВЕНКО АННА", birthDate: "1980-04-12" }), anna).status).toBe("match");
  });

  it("нет данных — неизвестно, а не совпадение", () => {
    // Nothing contradicted it is not the same as it matched.
    expect(resolveIdentity(header(), anna).status).toBe("unknown");
    expect(resolveIdentity(header({ birthDate: "1980-04-12" }), anna).status).toBe("unknown");
    expect(resolveIdentity(header({ fullName: "Дубровенко Анна" }), { fullName: null, birthDate: null }).status).toBe("unknown");
  });
});

describe("дубликаты и версии (приёмочные случаи 8.5)", () => {
  const existing = [
    { documentId: "old", fingerprint: "abc", header: header({ laboratory: "Инвитро", accession: "123-45", collectionDate: "2026-08-14" }) }
  ];

  it("тот же PDF дважды — дубликат", () => {
    expect(relateDocument({ fingerprint: "abc", header: null }, existing)).toMatchObject({ kind: "duplicate", of: "old" });
  });

  it("исправленный отчёт — версия, не новое исследование", () => {
    const corrected = relateDocument({ fingerprint: "def", header: header({ accession: "123-45" }) }, existing);

    expect(corrected).toMatchObject({ kind: "version", of: "old" });
    expect((corrected as { reason: string }).reason).toContain("123-45");
  });

  it("та же лаборатория и дата забора без номера — тоже версия", () => {
    expect(relateDocument({ fingerprint: "def", header: header({ laboratory: "инвитро", collectionDate: "2026-08-14" }) }, existing)).toMatchObject({ kind: "version" });
  });

  it("другой день — новое исследование", () => {
    expect(relateDocument({ fingerprint: "def", header: header({ laboratory: "Инвитро", collectionDate: "2026-09-01" }) }, existing)).toEqual({ kind: "new" });
  });
});
