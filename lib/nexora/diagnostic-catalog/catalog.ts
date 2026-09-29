import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { CatalogInput, CatalogLookup, CatalogSystem, CatalogTerm, DiagnosticCatalog } from "./types";

export const CATALOG_VERSION = "pmc-catalog-2026-09-28-v0.1";
export const MAX_CANDIDATES = 3;
type Row = Record<string, unknown>;
type FileEntry = { path: string; system: CatalogSystem | "UCUM"; records: number; sha256: string; uncompressedBytes: number };
type Manifest = { version: string; sources: Record<CatalogSystem, { version: string; count: number }>; files: FileEntry[]; ucumCount: number };
const tokens = (text: string) => [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
const text = (row: Row, key: string) => typeof row[key] === "string" ? row[key] as string : "";

export function emptyLookup(input: CatalogInput, state: CatalogLookup["state"], version = CATALOG_VERSION): CatalogLookup {
  return { version, state, query: input.name, queryBasis: "source_name", totalCandidates: 0, candidates: [], truncated: false,
    assignedStandardCode: null, clinicalFactVerified: false, requiresHumanReview: true, unit: null };
}

/** Public data is cached; patient labels and query results never enter a process-wide cache. */
export class LocalDiagnosticCatalog implements DiagnosticCatalog {
  readonly version: string;
  private readonly terms: CatalogTerm[] = [];
  private readonly codes = new Map<string, number>();
  private readonly words = new Map<string, number[]>();
  private readonly units = new Set<string>();

  constructor(root: string) {
    const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Manifest;
    if (manifest.version !== CATALOG_VERSION || !Array.isArray(manifest.files)) throw new Error("CATALOG_VERSION_MISMATCH");
    this.version = manifest.version;
    const counts: Record<string, number> = {};
    for (const file of manifest.files) {
      if (!/^[a-z_0-9-]+\.json\.gz$/.test(file.path) || file.uncompressedBytes > 20_000_000) throw new Error("CATALOG_FILE_INVALID");
      const bytes = readFileSync(join(root, file.path));
      if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("CATALOG_CHECKSUM_MISMATCH");
      const plain = gunzipSync(bytes, { maxOutputLength: 20_000_000 });
      if (plain.byteLength !== file.uncompressedBytes) throw new Error("CATALOG_LENGTH_MISMATCH");
      const rows = JSON.parse(plain.toString("utf8")) as Row[];
      if (!Array.isArray(rows) || rows.length !== file.records) throw new Error("CATALOG_COUNT_MISMATCH");
      counts[file.system] = (counts[file.system] ?? 0) + rows.length;
      for (const row of rows) {
        if (file.system === "UCUM") { this.units.add(text(row, "cs_code")); continue; }
        const system = file.system;
        const term: CatalogTerm = system === "LOINC" ? {
          system, code: text(row, "LOINC_NUM"), display: text(row, "LONG_COMMON_NAME") || text(row, "SHORTNAME"),
          version: manifest.sources.LOINC.version, method: text(row, "METHOD_TYP"), property: text(row, "PROPERTY"), copyrightNotice: text(row, "EXTERNAL_COPYRIGHT_NOTICE")
        } : system === "GTR" ? {
          system, code: text(row, "test_accession_ver"), display: text(row, "lab_test_name"), version: manifest.sources.GTR.version,
          laboratory: text(row, "name_of_laboratory"), testType: text(row, "nexora_test_type")
        } : { system, code: text(row, "id"), display: text(row, "name_ru"), version: manifest.sources.PMC_FAMILY.version };
        const key = `${system}:${term.code}`;
        if (!term.code || !term.display || this.codes.has(key)) throw new Error("CATALOG_TERM_INVALID");
        const index = this.terms.length;
        this.terms.push(term); this.codes.set(key, index);
        const searchable = [term.display, text(row, "SHORTNAME"), text(row, "name_en")].join(" ");
        for (const word of tokens(searchable)) {
          const list = this.words.get(word);
          if (list) list.push(index); else this.words.set(word, [index]);
        }
      }
    }
    for (const [system, source] of Object.entries(manifest.sources)) if (counts[system] !== source.count) throw new Error("CATALOG_COUNT_MISMATCH");
    if (this.units.size !== manifest.ucumCount) throw new Error("CATALOG_UNIT_COUNT_MISMATCH");
  }

  resolve(input: CatalogInput): CatalogLookup {
    const result = emptyLookup(input, "unknown", this.version);
    result.unit = input.unit ? { original: input.unit, listedCaseSensitiveCode: this.units.has(input.unit), conversionPerformed: false } : null;
    if (input.name.length > 300) return { ...result, state: "input_too_long" };
    const declared = new Map<string, { system: CatalogSystem; code: string }>();
    for (const match of input.name.matchAll(/\bLOINC(?:\s+(?:code|код))?\s*[:=#]?\s*(\d{1,8}-\d)\b/gi)) declared.set(`LOINC:${match[1]}`, { system: "LOINC", code: match[1] });
    for (const match of input.name.matchAll(/\bGTR\d{9}\.\d+\b/gi)) declared.set(`GTR:${match[0].toUpperCase()}`, { system: "GTR", code: match[0].toUpperCase() });
    if (declared.size > 1) return { ...result, state: "conflicting_codes" };
    if (declared.size === 1) {
      const index = this.codes.get([...declared.keys()][0]);
      return index === undefined ? { ...result, state: "declared_code_unknown" } : { ...result, state: "declared_code_found", totalCandidates: 1, candidates: [{ ...this.terms[index] }] };
    }
    const words = tokens(input.name);
    if (!words.length || words.length > 24) return result;
    const lists = words.map(word => this.words.get(word) ?? []).sort((a, b) => a.length - b.length);
    if (!lists[0].length) return result;
    const sets = lists.slice(1).map(list => new Set(list));
    const matches = lists[0].filter(index => sets.every(set => set.has(index)));
    // Source ordering is deterministic. It is not a clinical suitability/confidence score.
    const sorted = matches.sort((a, b) => this.terms[a].display.length - this.terms[b].display.length || this.terms[a].code.localeCompare(this.terms[b].code));
    return { ...result, state: sorted.length ? "candidates" : "unknown", totalCandidates: sorted.length,
      candidates: sorted.slice(0, MAX_CANDIDATES).map(index => ({ ...this.terms[index] })), truncated: sorted.length > MAX_CANDIDATES };
  }
}

let publicCatalog: DiagnosticCatalog | undefined;
export function getDiagnosticCatalog(): DiagnosticCatalog {
  if (!publicCatalog) publicCatalog = new LocalDiagnosticCatalog(join(process.cwd(), "data", "diagnostic-catalog"));
  return publicCatalog;
}
