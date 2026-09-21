/** Supabase/PostgREST errors are plain `{ message, code, details }` objects, not `Error`
 * instances, so `e instanceof Error ? e.message : 'fallback'` silently swallows the real reason
 * (a plan limit, a missing column, an RLS denial...) and shows only the generic fallback. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    const m = (e as { message: string }).message;
    if (m) return m;
  }
  return fallback;
}
