import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

export function LiveBadge({ count }: { count?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.online }]}>
      <Text style={[styles.text, { color: colors.onPrimary }]}>{count != null ? `ONLINE · ${count}` : 'ONLINE'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { fontFamily: fonts.monoBold, fontSize: 10 },
});
