import { getStaffCaseDetail } from "@/lib/cases/staff-queries";
import { formatDateTime } from "@/lib/i18n/format";
import {
  caseDirectionLabel,
  caseStatusLabel,
  caseUrgencyLabel,
  documentStatusLabel,
  lifecycleEventLabel,
  paymentProductLabel,
  paymentStatusLabel
} from "@/lib/i18n/status-labels";

const MAX_PAYLOAD_CHARS = 4000;
const MAX_DOCUMENTS = 30;
const MAX_PAYMENTS = 15;
const MAX_EVENTS = 25;

// Builds a text snapshot of one case for the Karen-assistant system prompt.
// Metadata only: document files themselves are not read here.
export async function buildCaseContext(caseId: string): Promise<string | null> {
  const result = await getStaffCaseDetail(caseId);

  if (result.status !== "ready" || !result.case) {
    return null;
  }

  const detail = result.case;
  const lines: string[] = [];

  lines.push(`## Данные кейса из базы центра (снимок на ${formatDateTime(new Date().toISOString())})`);
  lines.push(
    `Клиент: ${detail.profiles?.full_name ?? "имя не указано"} · ${detail.profiles?.email ?? "email не указан"} · ${detail.profiles?.phone ?? "телефон не указан"}`
  );
  lines.push(
    `Кейс: статус «${caseStatusLabel(detail.status)}», срочность «${caseUrgencyLabel(detail.urgency)}», направление «${caseDirectionLabel(detail.direction)}». Создан ${formatDateTime(detail.created_at)}, обновлён ${formatDateTime(detail.updated_at)}.`
  );

  if (detail.summary) {
    lines.push(`Резюме кейса: ${detail.summary}`);
  }

  const submission = detail.onboarding_submissions?.[0];

  if (submission) {
    const payloadText = JSON.stringify(submission.payload, null, 1).slice(
      0,
      MAX_PAYLOAD_CHARS
    );
    lines.push(
      `\n### Анкета (статус: ${submission.status}${submission.submitted_at ? `, отправлена ${formatDateTime(submission.submitted_at)}` : ""})\n${payloadText}`
    );
  } else {
    lines.push("\n### Анкета\nАнкета ещё не заполнена.");
  }

  const documents = detail.uploaded_documents ?? [];
  lines.push(`\n### Документы (${documents.length})`);

  if (documents.length === 0) {
    lines.push("Документы не загружены.");
  } else {
    for (const doc of documents.slice(0, MAX_DOCUMENTS)) {
      lines.push(
        `- ${doc.original_filename ?? "без имени"} · ${documentStatusLabel(doc.document_status)} · ${formatDateTime(doc.created_at)}`
      );
    }
    if (documents.length > MAX_DOCUMENTS) {
      lines.push(`…и ещё ${documents.length - MAX_DOCUMENTS} документов.`);
    }
    lines.push(
      "Содержимое файлов тебе недоступно — только названия и статусы. Если для ответа нужно содержимое документа, попроси Карена вставить текст."
    );
  }

  const payments = detail.payments ?? [];

  if (payments.length > 0) {
    lines.push(`\n### Оплаты (${payments.length})`);
    for (const payment of payments.slice(0, MAX_PAYMENTS)) {
      lines.push(
        `- ${paymentProductLabel(payment.product)} · ${paymentStatusLabel(payment.status)} · ${(payment.amount_cents / 100).toFixed(2)} ${payment.currency} · ${formatDateTime(payment.paid_at ?? payment.created_at)}`
      );
    }
  }

  const events = detail.case_lifecycle_events ?? [];

  if (events.length > 0) {
    lines.push(`\n### История кейса (последние ${Math.min(events.length, MAX_EVENTS)} событий)`);
    for (const event of events.slice(0, MAX_EVENTS)) {
      const notes = event.notes ? ` — ${event.notes}` : "";
      lines.push(
        `- ${formatDateTime(event.created_at)} · ${lifecycleEventLabel(event.event_type)}${notes}`
      );
    }
  }

  lines.push(
    "\nПравила работы с этими данными: это фактический снимок из системы — не додумывай ничего сверх него; чего в снимке нет, того ты не знаешь. Сводки и черновики — предложения для Карена, решения принимает Карен."
  );

  return lines.join("\n");
}
