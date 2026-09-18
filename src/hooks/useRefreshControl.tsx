import { useCallback, useState } from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { ReactElement } from 'react';
import { useTheme } from '../theme';

const MIN_SPIN_MS = 600;

/** One shared pull-to-refresh wiring for every screen — owns its own `refreshing` state and
 * returns a themed RefreshControl element to pass to Screen's `refreshControl` prop (or a
 * FlatList directly, e.g. ChatDetailScreen's inverted message list).
 *
 * Enforces the same minimum-visible-duration HomeScreen's own hand-rolled refresh already used
 * — a Supabase fetch on a fast connection can resolve in under one frame, which flips
 * `refreshing` back to false before the native spinner gets a chance to actually spin, making
 * it look broken/static rather than just fast. */
export function useRefreshControl(onRefresh: () => Promise<unknown>): ReactElement<RefreshControlProps> {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const started = Date.now();
    try {
      await onRefresh();
    } finally {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SPIN_MS) await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed));
      setRefreshing(false);
    }
  }, [onRefresh]);
  return <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.cyan} colors={[colors.cyan, colors.magenta]} />;
}
