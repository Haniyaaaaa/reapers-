import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

export function StatPill({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  value: { fontFamily: fonts.monoBold, fontSize: 15 },
  label: { fontFamily: fonts.body, fontSize: 11, marginTop: 4 },
});
