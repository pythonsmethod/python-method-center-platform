// PostgREST imposes a per-request row limit. Never call a truncated page a Case.
type Result<T> = { data: T[] | null; error: { code?: string; message?: string } | null };
export async function readAllRows<T>(page: (from: number, to: number) => PromiseLike<Result<T>>): Promise<Result<T>> {
  const rows: T[] = [], size = 500;
  for (let start = 0; start < 100000; start += size) {
    const result = await page(start, start + size - 1);
    if (result.error || !result.data) return { data: null, error: result.error ?? { code: "PAGE_UNAVAILABLE" } };
    rows.push(...result.data);
    if (result.data.length < size) return { data: rows, error: null };
  }
  return { data: null, error: { code: "CASE_REQUIRES_PAGED_REVIEW" } };
}
