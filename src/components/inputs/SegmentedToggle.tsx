import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

export type Segment<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, gradients } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((opt) => {
        const on = opt.value === value;
        const content = (
          <>
            {opt.icon ? <Ionicons name={opt.icon} size={16} color={on ? colors.onPrimary : colors.muted} /> : null}
            <Text style={[styles.label, { color: on ? colors.onPrimary : colors.muted }]}>{opt.label}</Text>
          </>
        );
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={opt.label}
          >
            {on ? (
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inner}>
                {content}
              </LinearGradient>
            ) : (
              <View style={styles.inner}>{content}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  item: { flex: 1 },
  inner: {
    minHeight: 40,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
