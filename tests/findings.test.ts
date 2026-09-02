import { describe, expect, it } from "vitest";
import { formatMachineFindings, type StoredRun } from "@/lib/analysis/findings";
import { buildIdentityMismatchMessage, buildDuplicateMessage } from "@/lib/documents/processing";
import { clientDocumentStatusLabel, documentStatusLabel } from "@/lib/i18n/status-labels";

const comparison = (delta: number, rcv: number) => ({
  delta_percent: delta, rcv_used: rcv, rcv_source: "default" as const, is_significant: Math.abs(delta) > rcv, points_used: 2
});

const run: StoredRun = {
  human_review_count: 1,
  unit_unresolved: true,
  blocked: [{
    analyte: "ferritin", measuredOn: "2026-08-14", status: "blocked", reason: "Белок острой фазы",
    missing: ["crp"], satisfied: [], severity: null,
    request: "Чтобы прочитать ферритин (2026-08-14), нужно: С-реактивный белок в пределах 30 дн. от даты забора."
  }],
  requests: [],
  trends: {
    hemoglobin: { analyte: "hemoglobin", verdict: "significant", reason: null, versus_previous: comparison(-18.6, 9.7), versus_baseline: comparison(-18.6, 9.7), latest_within_reference: false, direction: null, reference_breaks: [] },
    tsh: { analyte: "tsh", verdict: "noise", reason: null, versus_previous: comparison(40, 65.7), versus_baseline: comparison(40, 65.7), latest_within_reference: true, direction: null, reference_breaks: [] },
    glucose: { analyte: "glucose", verdict: "insufficient_points", reason: "одна точка", versus_previous: null, versus_baseline: null, latest_within_reference: null, direction: null, reference_breaks: [] }
  }
};

describe("машинная проверка на экране Каррен", () => {
  const text = formatMachineFindings(run);

  it("говорит, для какого раздела она и чего не делать", () => {
    expect(text).toContain("ТРЕБУЕТ ПРОВЕРКИ");
    expect(text).toContain("трендом не называть");
  });

  it("заблокированный показатель назван с конкретным запросом, а не описан", () => {
    expect(text).toContain("Не интерпретировать — Ферритин");
    expect(text).toContain("С-реактивный белок");
  });

  it("значимое изменение и шум различены числами", () => {
    expect(text).toContain("Значимое изменение — Гемоглобин: −18.6% при пороге 9.7%");
    expect(text).toContain("Без значимого изменения — ТТГ: +40.0% при пороге 65.7%");
  });

  it("одна точка не порождает строки", () => {
    expect(text).not.toContain("Глюкоза");
  });

  it("пустой прогон говорит, что замечаний нет", () => {
    const empty = formatMachineFindings({ human_review_count: 0, unit_unresolved: false, blocked: [], requests: [], trends: {} });

    expect(empty).toContain("Замечаний нет");
  });
});

describe("документ, который остановлен до чтения", () => {
  it("человеку объясняют, что случилось, и дают выход — на обоих языках", () => {
    const ru = buildIdentityMismatchMessage("ru", "analiz.pdf", "Петров И.С.");
    const en = buildIdentityMismatchMessage("en", "analiz.pdf", "Петров И.С.");

    for (const text of [ru, en]) {
      expect(text).toContain("analiz.pdf");
      expect(text).toContain("Петров И.С.");
    }
    expect(ru).toContain("прежняя фамилия");
    expect(en).toContain("former surname");
  });

  it("дубликат не добавляется и об этом говорят", () => {
    expect(buildDuplicateMessage("ru", "a.pdf")).toContain("второй раз он не добавлен");
    expect(buildDuplicateMessage("en", "a.pdf")).toContain("not added a second time");
  });

  it("статус виден и команде, и клиенту, и не выглядит как «готово»", () => {
    expect(documentStatusLabel("identity_mismatch", "ru")).toContain("другого человека");
    expect(clientDocumentStatusLabel("identity_mismatch", "ru")).toBe("Нужна проверка");
    expect(clientDocumentStatusLabel("identity_mismatch", "en")).toBe("Needs checking");
  });
});
