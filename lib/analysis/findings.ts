import { REFERENCE_TABLES } from "@/lib/reference/tables";
import type { BlockAssessment } from "@/lib/analysis/blockers";
import type { TrendAssessment } from "@/lib/analysis/trend-gate";

// What the machine found, written for Professor Python's screen.
//
// This is the routing_karen_screen stage: modules 1, 3 and 4 reach a
// person here, as a short block beside the transcribed values. It is for
// the team's eyes — the significance label never goes to the client, by
// the owner's decision — and it is deliberately not prose: a list of
// facts with the numbers that produced them, so nothing in it can be
// read as a conclusion.

export type StoredRun = {
  human_review_count: number;
  unit_unresolved: boolean;
  blocked: BlockAssessment[];
  requests: string[];
  trends: Record<string, TrendAssessment>;
};

const LABELS = REFERENCE_TABLES.analyteLabels.labels as Record<string, string[]>;

function name(analyte: string): string {
  return LABELS[analyte]?.[0] ?? analyte;
}

function percent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";

  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatMachineFindings(run: StoredRun): string {
  const lines: string[] = [];

  lines.push(
    "Это проверка для раздела «ТРЕБУЕТ ПРОВЕРКИ», не для текста клиенту. Заблокированные показатели в текст клиенту не описывать. Изменение ниже порога не называть трендом, ухудшением или улучшением — ни клиенту, ни в списке проверки."
  );

  if (run.human_review_count > 0) {
    lines.push(
      `Требуют проверки человеком: ${run.human_review_count} знач. — подпись или единица не определены. Не использовать до проверки.`
    );
  }

  for (const block of run.blocked) {
    lines.push(`Не интерпретировать — ${name(block.analyte)}: ${block.request ?? block.reason ?? "нет спутника"}`);
  }

  for (const [analyte, trend] of Object.entries(run.trends)) {
    const c = trend.versus_previous;

    if (trend.verdict === "significant" && c) {
      lines.push(
        `Значимое изменение — ${name(analyte)}: ${percent(c.delta_percent)} при пороге ${c.rcv_used}% (${c.rcv_source === "exact" ? "точный порог" : "порог по умолчанию"})${trend.latest_within_reference ? ", внутри референса" : ""}.`
      );
    } else if (trend.verdict === "noise" && c) {
      lines.push(
        `Без значимого изменения — ${name(analyte)}: ${percent(c.delta_percent)} при пороге ${c.rcv_used}%. В пределах естественного разброса; трендом не называть.`
      );
    } else if (trend.verdict === "not_comparable") {
      lines.push(`Не сравнимо — ${name(analyte)}: ${trend.reason ?? ""}`.trim());
    }
    // insufficient_points: one value is not a comparison and needs no line.

    if (trend.reference_breaks.length > 0) {
      lines.push(`Смена референса — ${name(analyte)}: между документами изменился интервал; на линии разрыв.`);
    }
  }

  if (lines.length === 1) {
    lines.push("Замечаний нет: все значения определены и читаемы, значимых изменений не найдено.");
  }

  return lines.join("\n");
}
