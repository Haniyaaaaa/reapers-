/** Turns what someone typed into a safe `%needle%` pattern for PostgREST `ilike` / `or()` filters.
 * Commas, parentheses, `%`, `*`, `_` and backslashes have special meaning in those filter strings,
 * so they're replaced with spaces instead of breaking the query. Returns null for an empty query. */
export function likePattern(query: string): string | null {
  const needle = query.replace(/[,()%*_\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return needle ? `%${needle}%` : null;
}

/** Case variants of a word ("unity" -> unity, Unity, UNITY) for matching text[] columns, which
 * only support exact element matches (`cs`), not `ilike`. */
export function caseVariants(query: string): string[] {
  const n = query.replace(/[",{}()\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return [];
  const cap = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  return Array.from(new Set([n.toLowerCase(), cap, n.toUpperCase()]));
}
