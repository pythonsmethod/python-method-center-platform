import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type PublishedReport = {
  id: string; approved_text: string; approved_at: string; documents_fingerprint: string;
  report_snapshot: { version: string; documents: { id: string; name: string; uploadedAt: string; pageCount: number | null; sourceHash: string | null; header?: Record<string, unknown> | null }[] };
};
/** Only the immutable approved text is client material. No internal draft, prompts or private knowledge. */
export async function renderPublishedReport(a: PublishedReport, locale: "ru" | "en", fontBytes: Uint8Array) {
  if (a.report_snapshot?.version !== "1" || !a.approved_text.trim() || a.approved_text.length > 8000 ||
      !/^pmc1:[a-f0-9]{32}$/.test(a.documents_fingerprint) || !Number.isFinite(Date.parse(a.approved_at))) throw new Error("INVALID_PUBLISHED_REPORT");
  const en = locale === "en";
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const date = new Date(a.approved_at); pdf.setCreationDate(date); pdf.setModificationDate(date);
  pdf.setTitle(en ? "Approved assessment" : "Утверждённый разбор"); pdf.setProducer("Python Method Center / published-report-v1"); pdf.setCreator("Python Method Center");
  let page = pdf.addPage([595.28, 841.89]), y = 770;
  const width = 483, left = 56, supported = new Set(font.getCharacterSet());
  const write = (text: string, size = 11, gap = 6) => {
    const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
    for (const paragraph of clean.split(/\r?\n/)) {
      let line = "";
      // Character wrapping also handles long identifiers and preserves the approved text.
      for (const c of paragraph) {
        if (!supported.has(c.codePointAt(0)!)) throw new Error("UNSUPPORTED_REPORT_CHARACTER");
        if (line && font.widthOfTextAtSize(line + c, size) > width) { draw(line, size); line = ""; }
        line += c;
      }
      if (line) draw(line, size); else y -= size + 5;
      y -= gap;
    }
  };
  const draw = (line: string, size: number) => {
    if (y < 70) { page = pdf.addPage([595.28, 841.89]); y = 770; }
    page.drawText(line, { x: left, y, font, size, color: rgb(.12,.16,.19) }); y -= size + 5;
  };
  write("Python Method Center", 12);
  write(en ? "Approved assessment" : "Утверждённый разбор", 22, 14);
  write(`${en ? "Approved" : "Утверждено"}: ${a.approved_at}`);
  write(`${en ? "Publication version" : "Версия публикации"}: ${a.id}`);
  write(en ? "Source documents" : "Документы-источники", 14, 10);
  for (const d of a.report_snapshot.documents) {
    write(`${d.name} · ${en ? "uploaded" : "загружен"}: ${d.uploadedAt} · ${en ? "pages" : "страниц"}: ${d.pageCount ?? "—"}`);
    for (const [key,label] of [["collectionDatePrinted", en ? "Collection date (printed)" : "Дата забора (в источнике)"], ["reportDatePrinted", en ? "Report date (printed)" : "Дата отчёта (в источнике)"]]) {
      const value = d.header?.[key]; if (typeof value === "string") write(`${label}: ${value}`, 10);
    }
  }
  write(en ? "Karen's approved assessment and recommendations" : "Утверждённый разбор и рекомендации Карена", 14, 10);
  write(a.approved_text, 11, 7);
  write(en ? "Scope: this file preserves the approved source text. Only the headings follow the selected language. It does not add automatic recommendations or follow-up services. Later uploads require a separate review." : "Ограничения: файл сохраняет утверждённый текст без перевода. Заголовки следуют выбранному языку. Автоматические рекомендации и сопровождение не добавляются. Новые документы требуют отдельной проверки.", 10);
  write(`${en ? "Source version" : "Версия источников"}: ${a.documents_fingerprint}`, 9);
  pdf.getPages().forEach((p,i) => p.drawText(`${i + 1} / ${pdf.getPageCount()}`, {x:left,y:35,font,size:9}));
  return pdf.save({ useObjectStreams: false });
}
