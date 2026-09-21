import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';
import { useSingleFlight } from '../../hooks/useSingleFlight';

/** Shared pagination footer — every paginated list (admin panel, and the main app's
 * demos/events/communities/experts/team-requests/chatrooms feeds) uses the same
 * `{ rows, hasMore }` page shape (src/services/supabase/pagination.ts) so every list in the
 * app is bounded instead of an unbounded `select *`. */
export function LoadMoreButton({ hasMore, onPress }: { hasMore: boolean; onPress: () => unknown }) {
  const { colors } = useTheme();
  // One page request at a time: a double-tap used to append the same page twice.
  const { run, pending } = useSingleFlight(onPress);
  if (!hasMore) return null;
  return (
    <Pressable onPress={run} disabled={pending} style={[styles.btn, { borderColor: colors.border, opacity: pending ? 0.6 : 1 }]} accessibilityRole="button" accessibilityState={{ busy: pending }}>
      <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>{pending ? 'Loading…' : 'Load more'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, marginTop: 4, marginBottom: 16 },
});
