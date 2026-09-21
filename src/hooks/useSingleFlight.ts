import { useCallback, useEffect, useRef, useState } from 'react';

/** Wraps an action so it can only run once at a time and exposes `pending` while it does.
 *
 * Buttons that kick off network work otherwise look dead for a second or two, so people tap again
 * and again (double-submits, duplicate posts). With this, the first tap flips `pending` (show a
 * spinner / "Saving…") and every further tap is ignored until the returned promise settles.
 * Actions that return nothing (synchronous / optimistic ones) are passed straight through. */
export function useSingleFlight<Args extends unknown[]>(fn: (...args: Args) => unknown) {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback((...args: Args) => {
    if (inFlight.current) return undefined;
    const result = fnRef.current(...args);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      inFlight.current = true;
      setPending(true);
      const done = () => {
        inFlight.current = false;
        if (mounted.current) setPending(false);
      };
      (result as Promise<unknown>).then(done, done);
    }
    return result;
  }, []);

  return { run, pending };
}
