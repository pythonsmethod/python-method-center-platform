import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { prepareDocumentSource, sourceAnchor } from "@/lib/documents/source";
import { buildReadPage } from "@/lib/documents/page-reading";
import { splitValue } from "@/lib/analysis/pipeline";
import { readAllRows } from "@/lib/documents/read-all";
const hash = "c".repeat(64);
const reading = (value = "5 mg/L", quality = "COMPLETE") => `wrong.pdf :: [CONTROL] :: [DOCUMENT COVERAGE] :: ${quality} :: - :: FILLED :: ДА :: -\nwrong.pdf :: LAB :: CRP :: ${value} :: 0-5 :: FILLED :: ДА :: -\n[[PMC_PAGE_END]]`;
describe("original source and complete page reading", () => {
  it("hashes immutable original PDF bytes and exposes each physical page independently", async () => {
    const pdf = await PDFDocument.create(); pdf.addPage([400, 600]); pdf.addPage([500, 700]);
    const bytes = await pdf.save(), before = Buffer.from(bytes);
    const source = await prepareDocumentSource(bytes, "application/pdf", "synthetic.pdf");
    expect(source.hash).toBe(createHash("sha256").update(bytes).digest("hex")); expect(source.pageCount).toBe(2);
    const part = await PDFDocument.load(Buffer.from((await source.page(2)).data, "base64"));
    expect(part.getPageCount()).toBe(1); expect(part.getPage(0).getWidth()).toBe(500); expect(Buffer.from(bytes)).toEqual(before);
    await expect(source.page(3)).rejects.toThrow("SOURCE_PAGE_INVALID");
  });
  it("rejects corrupt files and a forged MIME type before any model call", async () => {
    await expect(prepareDocumentSource(new Uint8Array([1,2,3]), "application/pdf", "fake.pdf")).rejects.toThrow();
    const png = await sharp({create:{width:40,height:40,channels:3,background:"white"}}).png().toBuffer();
    await expect(prepareDocumentSource(png, "image/jpeg", "fake.jpg")).rejects.toThrow("SOURCE_FORMAT_MISMATCH");
    const image = await prepareDocumentSource(png, "image/png", "source.png"); expect(image.pageCount).toBe(1); expect((await image.page(1)).mediaType).toBe("image/jpeg");
  });
  it("binds repeated labels on separate pages to the actual original and server filename", () => {
    const first = buildReadPage(reading(), reading(), 1, hash, "original.pdf");
    const second = buildReadPage(reading("6 mg/L"), reading("6 mg/L"), 2, hash, "original.pdf");
    expect(first.coverage.status).toBe("COMPLETE");
    expect(second.agreed.find(row => row.label === "CRP")).toMatchObject({ file:"original.pdf", value:"6 mg/L", source:{page:2,sourceHash:hash,region:null} });
    expect(first.agreed.find(row => row.label === "CRP")?.source?.page).toBe(1);
  });
  it("never calls a truncated response or an obscured page complete", () => {
    for (const text of [reading().replace("[[PMC_PAGE_END]]", ""), reading("5 mg/L", "PARTIAL"), ""]) {
      const page = buildReadPage(text, reading(), 1, hash, "original.pdf");
      expect(page.coverage.status).not.toBe("COMPLETE"); expect(page.disputed.some(row => row.section === "SOURCE COVERAGE")).toBe(true);
    }
  });
  it("preserves discrepant units and page anchors for review", () => {
    const page = buildReadPage(reading("5 mg/L"), reading("5 mg/dL"), 2, hash, "original.pdf");
    expect(page.disputed.find(row => row.label === "CRP")).toMatchObject({first:"5 mg/L",second:"5 mg/dL",source:{page:2,sourceHash:hash}});
    expect(sourceAnchor({source:{level:"PAGE",page:2,sourceHash:null,excerpt:null,region:null}}).level).toBe("DOCUMENT");
  });
  it.each(["<5 mg/L","1,234 mg/L","1.234 mg/L","3–5 mg/L","1 234 mg/L"])("does not turn ambiguous/censored/range %s into a precise value", value => { expect(splitValue(value)).toBeNull(); });
  it("keeps explicit count units and signed/exponential values", () => {
    expect(splitValue("4.5 10^9/L")).toEqual({value:4.5,unit:"10^9/L"}); expect(splitValue("−2.5 mg/L")).toEqual({value:-2.5,unit:"mg/L"}); expect(splitValue("2e-3 mg/L")).toEqual({value:0.002,unit:"mg/L"});
  });
  it("reads beyond the server row cap and fails explicitly if a later page is unavailable", async () => {
    const rows = Array.from({length:1203},(_,id)=>({id}));
    expect((await readAllRows(async (from,to) => ({data:rows.slice(from,to+1),error:null}))).data).toHaveLength(1203);
    expect((await readAllRows(async (from,to) => from ? {data:null,error:{code:"DOWN"}} : {data:rows.slice(from,to+1),error:null})).data).toBeNull();
  });
});

describe("literal row context and ambiguous row association", () => {
  it("preserves every duplicate caption instead of replacing the first row", () => {
    const text = reading().replace("[[PMC_PAGE_END]]", "wrong.pdf :: LAB :: CRP :: 7 mg/L :: 0-5 :: FILLED :: ДА :: -\n[[PMC_PAGE_END]]");
    const page = buildReadPage(text, text, 1, hash, "original.pdf");
    expect(page.first.filter(row => row.label === "CRP")).toHaveLength(2);
    expect(page.agreed.filter(row => row.label === "CRP")).toHaveLength(0);
    expect(page.disputed.filter(row => row.label === "CRP")).toHaveLength(4);
    expect(page.disputed.map(row => row.first ?? row.second)).toEqual(expect.arrayContaining(["5 mg/L","7 mg/L"]));
  });
  it("reads a result's own collection date, specimen and method literally", () => {
    const text = reading().replace("0-5 :: FILLED :: ДА :: -", "0-5 :: FILLED :: ДА :: - :: 2026-09-24 :: Serum :: Assay A");
    const page = buildReadPage(text, text, 1, hash, "original.pdf");
    expect(page.agreed.find(row=>row.label==="CRP")).toMatchObject({collectionDatePrinted:"2026-09-24",specimen:"Serum",method:"Assay A"});
    const mismatch = buildReadPage(text, text.replace("Assay A","Assay B"), 1, hash, "original.pdf");
    expect(mismatch.disputed.find(row=>row.label==="CRP")?.note).toBe("DATE_SPECIMEN_METHOD_CONFLICT");
    const ambiguous = text.replace("2026-09-24","09/10/2026");
    expect(buildReadPage(ambiguous,ambiguous,1,hash,"original.pdf").disputed.some(row=>row.note==="AMBIGUOUS_OR_UNSUPPORTED_DATE")).toBe(true);
  });
});
