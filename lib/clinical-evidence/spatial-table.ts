import type { BoundingPolygon } from "@/lib/canonical-facts/types";

/** Coordinates must be normalized; pixel-only inputs are rejected, never mixed. */
export type SpatialToken = { id: string; text: string; page: number; coordinates: BoundingPolygon; confidence: number | null; textAnchor?: { start: number; end: number } | null };
export type Rect = { left: number; top: number; right: number; bottom: number };
export type SpatialCell = { text: string; tokens: SpatialToken[]; coordinates: BoundingPolygon; ocrConfidence: number | null };
export type SpatialRow = { cells: Array<SpatialCell | null>; page: number; layoutConfidence: number; verificationStatus: "VERIFIED" | "NEEDS_REVIEW"; issues: string[] };
export type SpatialTable = { headers: string[]; rows: SpatialRow[]; page: number; layoutConfidence: number };
export type SpatialOptions = { structuredTablesSufficient: boolean; headerRoles?: string[] };
export type SpatialResult = { tables: SpatialTable[]; counters: { table_objects_missing_but_fallback_used: number; spatial_rows_reconstructed: number; spatial_rows_needing_review: number; layout_reconstruction_failures: number } };

export function tokenRect(token: SpatialToken): Rect | null {
  const points = token.coordinates.normalizedVertices;
  if (!points || points.length < 3 || token.page < 1) return null;
  const xs = points.map((p) => p.x ?? 0), ys = points.map((p) => p.y ?? 0);
  if ([...xs, ...ys].some((n) => !Number.isFinite(n) || n < 0 || n > 1)) return null;
  const rect = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  return rect.right > rect.left && rect.bottom > rect.top ? rect : null;
}

export function aggregateCoordinates(tokens: SpatialToken[]): BoundingPolygon {
  const rects = tokens.map(tokenRect).filter((r): r is Rect => r !== null);
  if (rects.length !== tokens.length || !rects.length) throw new Error("Invalid normalized token geometry");
  const left = Math.min(...rects.map((r) => r.left)), right = Math.max(...rects.map((r) => r.right));
  const top = Math.min(...rects.map((r) => r.top)), bottom = Math.max(...rects.map((r) => r.bottom));
  return { normalizedVertices: [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }] };
}

const roleKey = (value: string) => value.trim().toLowerCase().replace(/:$/, "");
const center = (r: Rect) => (r.top + r.bottom) / 2;
function groupLines(tokens: SpatialToken[]): SpatialToken[][] {
  const lines: SpatialToken[][] = [];
  for (const token of [...tokens].sort((a, b) => center(tokenRect(a)!) - center(tokenRect(b)!) || tokenRect(a)!.left - tokenRect(b)!.left)) {
    const r = tokenRect(token)!;
    const line = lines.find((group) => {
      const anchor = tokenRect(group[0])!;
      const overlap = Math.min(r.bottom, anchor.bottom) - Math.max(r.top, anchor.top);
      return overlap / Math.min(r.bottom - r.top, anchor.bottom - anchor.top) >= 0.5;
    });
    if (line) line.push(token); else lines.push([token]);
  }
  return lines.map((line) => line.sort((a, b) => tokenRect(a)!.left - tokenRect(b)!.left || a.id.localeCompare(b.id)));
}

function cell(tokens: SpatialToken[]): SpatialCell {
  return { text: tokens.map((t) => t.text).join(" "), tokens, coordinates: aggregateCoordinates(tokens), ocrConfidence: tokens.every((t) => t.confidence !== null) ? Math.min(...tokens.map((t) => t.confidence!)) : null };
}

/** Generic header-confirmed geometry reconstruction; domain mapping is downstream. */
export function reconstructSpatialTables(tokens: SpatialToken[], options: SpatialOptions): SpatialResult {
  const counters = { table_objects_missing_but_fallback_used: 0, spatial_rows_reconstructed: 0, spatial_rows_needing_review: 0, layout_reconstruction_failures: 0 };
  const tables: SpatialTable[] = [];
  if (options.structuredTablesSufficient) return { tables, counters };
  const valid = tokens.filter((t) => tokenRect(t) && t.text.trim());
  if (valid.length !== tokens.length) counters.layout_reconstruction_failures++;
  const roles = options.headerRoles ?? ["test", "analyte", "marker", "result", "value", "status", "percentage", "intensity", "method", "assay"];
  for (const page of [...new Set(valid.map((t) => t.page))]) {
    let active: { anchors: SpatialToken[]; rows: SpatialRow[] } | null = null;
    const flush = () => {
      if (!active) return;
      // Require repeated column occupation, not a single prose line under a heading.
      const full = active.rows.filter((r) => r.cells.every(Boolean));
      if (full.length >= 2) tables.push({ headers: active.anchors.map((t) => roleKey(t.text)), rows: active.rows, page, layoutConfidence: Math.min(...active.rows.map((r) => r.layoutConfidence)) });
      else counters.layout_reconstruction_failures++;
      active = null;
    };
    let lastBottom = 0;
    for (const line of groupLines(valid.filter((t) => t.page === page))) {
      const anchors = line.filter((t) => roles.includes(roleKey(t.text)));
      const hasLabelHeader = anchors.some((t) => ["test", "analyte", "marker"].includes(roleKey(t.text)));
      if (hasLabelHeader && anchors.length >= 2 && anchors.every((t, i) => i === 0 || tokenRect(t)!.left - tokenRect(anchors[i - 1])!.right > 0.02)) {
        flush(); active = { anchors, rows: [] }; lastBottom = Math.max(...line.map((t) => tokenRect(t)!.bottom)); continue;
      }
      if (!active) continue;
      const top = Math.min(...line.map((t) => tokenRect(t)!.top));
      if (top - lastBottom > 0.07) { flush(); continue; }
      const groups = active.anchors.map(() => [] as SpatialToken[]);
      let crosses = false;
      const bounds = active.anchors.slice(1).map((a, i) => (tokenRect(active!.anchors[i])!.right + tokenRect(a)!.left) / 2);
      for (const token of line) {
        const r = tokenRect(token)!;
        const column = bounds.findIndex((boundary) => (r.left + r.right) / 2 < boundary);
        groups[column < 0 ? groups.length - 1 : column].push(token);
        if (bounds.some((boundary) => r.left < boundary && r.right > boundary)) crosses = true;
      }
      const previous = active.rows[active.rows.length - 1];
      if (!groups[0].length && previous && top - lastBottom < 0.025) {
        // A possible wrapped value is retained, but association requires review.
        groups.forEach((part, i) => { if (part.length) previous.cells[i] = cell([...(previous.cells[i]?.tokens ?? []), ...part]); });
        previous.layoutConfidence = 0.7; previous.verificationStatus = "NEEDS_REVIEW"; previous.issues.push("WRAPPED_ASSOCIATION");
      } else {
        const issues = [...(groups.some((g) => !g.length) ? ["MISSING_CELL"] : []), ...(crosses ? ["COLUMN_BOUNDARY_OVERLAP"] : [])];
        const layoutConfidence = issues.length ? 0.65 : 0.95;
        const cells = groups.map((g) => g.length ? cell(g) : null);
        const verified = layoutConfidence >= 0.9 && cells.every((c) => c && (c.ocrConfidence ?? 0) >= 0.9);
        active.rows.push({ cells, page, layoutConfidence, verificationStatus: verified ? "VERIFIED" : "NEEDS_REVIEW", issues });
      }
      lastBottom = Math.max(...line.map((t) => tokenRect(t)!.bottom));
    }
    flush();
  }
  // Headerless synoptic forms: require repeated known labels AND a stable gutter.
  // These remain review candidates; row adjacency cannot identify a missing marker.
  {
    for (const page of [...new Set(valid.map((t) => t.page))]) {
      const claimedTokens = new Set(tables.filter((t) => t.page === page)
        .flatMap((t) => t.rows.flatMap((r) => r.cells.flatMap((c) => c?.tokens.map((token) => token.id) ?? []))));
      let candidates: SpatialRow[] = [];
      let lastY = -1;
      let valueX: number | null = null;
      const flushKnown = () => {
        const unclaimed = candidates.filter((r) => r.cells.some((c) => c?.tokens.some((t) => !claimedTokens.has(t.id))));
        if (unclaimed.length >= 2) tables.push({ headers: ["source-label", "source-value"], rows: unclaimed, page, layoutConfidence: .7 });
        candidates = []; valueX = null;
      };
      for (const line of groupLines(valid.filter((t) => t.page === page))) {
        const y = tokenRect(line[0])!.top;
        if (lastY >= 0 && y - lastY > .07) flushKnown();
        const lineText = line.map((t) => t.text).join(" ");
        const previous = candidates[candidates.length - 1];
        const establishedValueX: number | null = valueX;
        // Value-only continuation in the established column. Never attach a
        // left-column label to the preceding marker based on adjacency alone.
        if (previous && establishedValueX !== null && y - lastY < .025 &&
            line.every((t) => tokenRect(t)!.left >= establishedValueX - .025)) {
          previous.cells[1] = cell([...(previous.cells[1]?.tokens ?? []), ...line]);
          previous.issues.push("WRAPPED_ASSOCIATION");
          lastY = y;
          continue;
        }
        // A repeated form separator is not a new unrelated narrative section.
        if (/^test\s*\(\s*s\s*\)\s*performed\s*$/i.test(lineText)) {
          lastY = y;
          continue;
        }
        let split = -1, largestGap = .08;
        for (let i = 1; i < line.length; i++) {
          const gap = tokenRect(line[i])!.left - tokenRect(line[i - 1])!.right;
          if (gap > largestGap) { largestGap = gap; split = i; }
        }
        if (split < 0) { flushKnown(); continue; }
        const label = line.slice(0, split).map((t) => t.text).join(" ");
        if (!/^(?:(?:estrogen|progesterone) receptor|ER\b|PR\b|PgR\b|HER2\b|percentage of cells|average intensity|status of internal controls)/i.test(label)) { flushKnown(); continue; }
        const x: number = tokenRect(line[split])!.left;
        if (valueX !== null && Math.abs(x - valueX) > .04) flushKnown();
        valueX = x; lastY = y;
        candidates.push({ cells: [cell(line.slice(0, split)), cell(line.slice(split))], page, layoutConfidence: .7, verificationStatus: "NEEDS_REVIEW", issues: ["INFERRED_HEADER", "SEMANTIC_ASSOCIATION_REQUIRES_REVIEW"] });
      }
      flushKnown();
    }
  }
  counters.table_objects_missing_but_fallback_used = tables.length ? 1 : 0;
  counters.spatial_rows_reconstructed = tables.reduce((n, t) => n + t.rows.length, 0);
  counters.spatial_rows_needing_review = tables.reduce((n, t) => n + t.rows.filter((r) => r.verificationStatus === "NEEDS_REVIEW").length, 0);
  return { tables, counters };
}
