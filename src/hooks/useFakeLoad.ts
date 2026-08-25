import { useCallback, useEffect, useState } from 'react';

export function useFakeLoad(ms = 450) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const reload = useCallback(() => {
    setPhase('loading');
    const id = setTimeout(() => setPhase('ready'), ms);
    return () => clearTimeout(id);
  }, [ms]);
  useEffect(() => {
    const clear = reload();
    return clear;
  }, [reload]);
  return { phase, reload: () => reload(), setError: () => setPhase('error') };
}
