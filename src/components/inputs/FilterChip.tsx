import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: colors.border },
        selected && { backgroundColor: colors.magentaDeep, borderColor: colors.magenta },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.text : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.bodyMed, fontSize: 13 },
});
