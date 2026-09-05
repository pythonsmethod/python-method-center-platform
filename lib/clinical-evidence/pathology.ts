/** Source syntax only: no diagnosis, inferred grade, or score calculated from counts. */
export type PathologyScore = { text: string; value: number | null; ambiguous: boolean };
export function extractMitoticScores(text: string): PathologyScore[] {
  const results: PathologyScore[] = [];
  const pattern = /\b(?:mitotic\s+(?:count|score|rate)|mitoses)\b([^.;]*(?:\.[0-9][^.;]*)?)/ig;
  for (const match of text.matchAll(pattern)) {
    // Stop at a new named field; allow only a value or "score" continuation.
    const tail = match[1].split(/\n(?=\s*(?!score\b)[A-Za-z])|\b(?:nuclear|tubule|overall|Nottingham)\b/i)[0];
    const source = match[0].slice(0, match[0].length - match[1].length) + tail;
    const scores = [...source.matchAll(/\bscore\s*[:=]?\s*([0-9]+)(?![0-9])/ig)].map((m) => Number(m[1]));
    const valid = scores.length === 1 && scores[0] >= 1 && scores[0] <= 3 && !/\b(?:or|to)\s+\d|\d\s*[-/]\s*\d\s*$/.test(source);
    results.push({ text: source.trim(), value: valid ? scores[0] : null, ambiguous: !valid });
  }
  return results;
}
