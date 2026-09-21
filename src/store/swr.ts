/** Small stale-while-revalidate toolkit shared by the zustand stores.
 *
 * The stores used to refetch on every mount/focus, flip `loading` even when data was already on
 * screen (so lists were swapped for skeletons), and replace every row with a fresh object (so
 * everything re-rendered even when nothing changed). These helpers fix that without a data-layer
 * rewrite:
 *  - `swr`       — remembers when a key was last fetched and dedupes concurrent fetches, but ONLY
 *                  for callers that opt in with `ifStaleMs`; plain `fetchX(userId)` still always
 *                  refetches, so mutation flows that refresh a list keep working exactly as before.
 *  - `reconcile` — structural sharing: rows that didn't change keep their previous object, and if
 *                  nothing changed at all the previous array is returned, so subscribers don't
 *                  re-render.
 */

export type FetchOpts = {
  /** Skip the fetch if this key was successfully fetched less than this many ms ago (and reuse
   * an already-running fetch for the same key). Use for mount/focus refreshes, not after edits. */
  ifStaleMs?: number;
};

/** Default freshness window for mount/focus refreshes. */
export const STALE_MS = 30_000;

const stamps = new Map<string, number>();
const inflight = new Map<string, Promise<void>>();

export function swr(key: string, run: () => Promise<boolean>, opts?: FetchOpts): Promise<void> {
  if (opts?.ifStaleMs !== undefined) {
    const running = inflight.get(key);
    if (running) return running;
    const at = stamps.get(key);
    if (at !== undefined && Date.now() - at < opts.ifStaleMs) return Promise.resolve();
  }
  const p: Promise<void> = run()
    .then((ok) => {
      if (ok) stamps.set(key, Date.now());
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** Forget freshness for keys starting with `prefix` (all keys if omitted), so the next
 * opportunistic fetch goes to the network. Call after sign-out / big mutations. */
export function invalidate(prefix?: string): void {
  for (const key of Array.from(stamps.keys())) {
    if (!prefix || key.startsWith(prefix)) stamps.delete(key);
  }
}

export function resetSwr(): void {
  stamps.clear();
  inflight.clear();
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Reuse previous row objects where the refetched row is identical; return `prev` itself when the
 * whole list is unchanged (same rows, same order). */
export function reconcile<T extends { id: string }>(prev: T[], next: T[]): T[] {
  if (prev.length === 0) return next;
  const byId = new Map<string, T>();
  for (const p of prev) byId.set(p.id, p);
  let identical = prev.length === next.length;
  const out = next.map((n, i) => {
    const old = byId.get(n.id);
    if (old !== undefined && sameValue(old, n)) {
      if (prev[i] !== old) identical = false;
      return old;
    }
    identical = false;
    return n;
  });
  return identical ? prev : out;
}
