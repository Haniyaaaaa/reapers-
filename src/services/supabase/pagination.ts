export const PAGE_SIZE = 20;

export type Page<T> = { rows: T[]; hasMore: boolean };

export function toPage<T>(rows: T[] | null, limit: number): Page<T> {
  const r = rows ?? [];
  return { rows: r, hasMore: r.length === limit };
}
