// The story of a case is told twice: once by what the analyses say, and
// once by when they arrive. A person in recovery uploads blood work again
// and again, and a flat list makes the third "analysis.pdf" look identical
// to the first. This groups uploads into rounds (one round = one calendar
// day) and numbers repeat uploads of the same file name as versions, so
// both the client and Professor Python see the history, not a pile.

export type TimelineDocument = {
  id: string;
  original_filename: string | null;
  created_at: string;
  document_status?: string | null;
};

export type TimelineEntry<T extends TimelineDocument> = {
  document: T;
  // 1 for the first upload of this file name, 2 for the next, and so on.
  version: number;
  // True when an earlier round already had a file with the same name.
  isUpdate: boolean;
};

export type UploadRound<T extends TimelineDocument> = {
  // UTC calendar day, e.g. "2026-08-03" — stable key for rendering.
  dayKey: string;
  entries: TimelineEntry<T>[];
  totalCount: number;
  updateCount: number;
};

// Same file, spelled slightly differently, is still the same file: case
// and repeated spaces don't make a new document. Anything cleverer (like
// stripping "(1)" suffixes) risks merging page 1 and page 2 of a scan,
// so the match stays deliberately literal.
function normalizeName(name: string | null): string | null {
  const clean = (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  return clean.length > 0 ? clean : null;
}

function dayKeyOf(createdAt: string): string {
  return createdAt.slice(0, 10);
}

// Rounds come back newest-first (the way history is read), while versions
// are counted oldest-first (the way history happened).
export function buildDocumentTimeline<T extends TimelineDocument>(
  documents: T[]
): UploadRound<T>[] {
  const chronological = [...documents].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  const seenNames = new Map<string, number>();
  const rounds = new Map<string, UploadRound<T>>();

  for (const document of chronological) {
    const name = normalizeName(document.original_filename);
    const version = name ? (seenNames.get(name) ?? 0) + 1 : 1;

    if (name) {
      seenNames.set(name, version);
    }

    const dayKey = dayKeyOf(document.created_at);
    const round = rounds.get(dayKey) ?? {
      dayKey,
      entries: [],
      totalCount: 0,
      updateCount: 0
    };

    const isUpdate = version > 1;

    round.entries.push({ document, version, isUpdate });
    round.totalCount += 1;

    if (isUpdate) {
      round.updateCount += 1;
    }

    rounds.set(dayKey, round);
  }

  return [...rounds.values()].sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}
