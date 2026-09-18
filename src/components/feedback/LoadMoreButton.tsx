import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

/** Shared pagination footer — every paginated list (admin panel, and the main app's
 * demos/events/communities/experts/team-requests/chatrooms feeds) uses the same
 * `{ rows, hasMore }` page shape (src/services/supabase/pagination.ts) so every list in the
 * app is bounded instead of an unbounded `select *`. */
export function LoadMoreButton({ hasMore, onPress }: { hasMore: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  if (!hasMore) return null;
  return (
    <Pressable onPress={onPress} style={[styles.btn, { borderColor: colors.border }]} accessibilityRole="button">
      <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Load more</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.md, marginTop: 4, marginBottom: 16 },
});
