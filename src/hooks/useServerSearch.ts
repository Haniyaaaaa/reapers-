import { useEffect, useRef, useState } from 'react';

// Recent answers, kept briefly so retyping / re-opening a search doesn't hit the server again.
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 80;
const cache = new Map<string, { at: number; results: unknown[] }>();

function cacheGet(id: string): unknown[] | null {
  const hit = cache.get(id);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(id);
    return null;
  }
  return hit.results;
}

function cacheSet(id: string, results: unknown[]) {
  cache.set(id, { at: Date.now(), results });
  // Drop the oldest entries so this can never grow without bound.
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Server-side search for a screen's search bar.
 *
 * Client-side filtering only ever sees the page of data already loaded (20 items), so a search
 * misses everything else. This asks the server instead and returns:
 *  - `results`   — the server's answer for the CURRENT query, or null while it's still on its way
 *                  (so callers fall back to filtering what's loaded and typing never feels laggy);
 *  - `searching` — true while waiting for that answer.
 * Pass an already-debounced query. Only the latest request's answer is ever used, so a slow reply to
 * an earlier keystroke can't overwrite a newer one.
 *
 * Options:
 *  - `enabled`  — set false to hold the request back (e.g. a section that isn't on screen yet);
 *  - `minChars` — don't hit the server until the query is at least this long (default 1);
 *  - `cacheKey` — remember answers for 30 s under this key. Include anything the answer depends on
 *                 that isn't in `deps` (like the signed-in user's id);
 *  - `deps`     — extra inputs (e.g. an active filter) that make the same query run again.
 */
export function useServerSearch<T>(
  query: string,
  search: (needle: string) => Promise<T[]>,
  opts: { enabled?: boolean; deps?: unknown[]; minChars?: number; cacheKey?: string } = {},
) {
  const needle = query.trim().toLowerCase();
  const active = (opts.enabled ?? true) && needle.length >= (opts.minChars ?? 1);
  const [state, setState] = useState<{ key: string; results: T[] }>({ key: '', results: [] });
  const seq = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;
  // Extra dependencies (e.g. an active filter) make the same query re-run when they change.
  const depsKey = JSON.stringify(opts.deps ?? []);
  const key = `${needle}|${depsKey}`;
  const cacheId = opts.cacheKey ? `${opts.cacheKey}|${key}` : null;

  useEffect(() => {
    if (!active) return;
    const cached = cacheId ? cacheGet(cacheId) : null;
    if (cached) {
      seq.current++; // any request still in flight for an older query is now irrelevant
      setState({ key, results: cached as T[] });
      return;
    }
    const id = ++seq.current;
    searchRef.current(needle)
      .then((results) => {
        if (cacheId) cacheSet(cacheId, results);
        if (id === seq.current) setState({ key, results });
      })
      .catch(() => undefined);
  }, [needle, active, key, cacheId]);

  const ready = active && state.key === key;
  return {
    needle,
    results: ready ? state.results : null,
    searching: active && !ready,
  };
}
