import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';
import type { RubricScores } from '../../types/demo';

const CATEGORIES: { key: keyof RubricScores; label: string }[] = [
  { key: 'gameplay', label: 'Gameplay' },
  { key: 'art', label: 'Art' },
  { key: 'concept', label: 'Concept' },
  { key: 'polish', label: 'Polish' },
];

export function RubricInput({ value, onChange }: { value: RubricScores; onChange: (next: RubricScores) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {CATEGORIES.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
          <View style={styles.dots}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = value[key] >= n;
              return (
                <Pressable
                  key={n}
                  onPress={() => onChange({ ...value, [key]: n })}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${n} of 5`}
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.dot,
                    { borderColor: colors.border },
                    on && { backgroundColor: colors.magenta, borderColor: colors.magenta },
                  ]}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.bodyMed, fontSize: 13, width: 90 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 28, height: 28, borderRadius: radius.pill, borderWidth: 1 },
});
