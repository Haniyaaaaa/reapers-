import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CyberCutBox } from './CyberCutBox';
import { fonts, useTheme } from '../../theme';

/** One pill in a horizontal filter/tab row (Demos' FOR YOU/TOP RATED/NEW, Experts' ALL/SYSTEMS/…,
 * Network's ALL/OPEN ROLES/…, and similar). Every one of these used to hand-roll its own active
 * vs. inactive rendering, and the active state consistently used a plain `LinearGradient` as a
 * child of the cut-box instead of the cut-box's own `gradient` fill — the gradient is a normal
 * rectangle sitting on top of the SVG-chamfered shape, so it covers the cut corners with its own
 * square ones the moment a tab becomes selected, while the inactive tabs (plain `fill`, no
 * gradient child) kept the chamfer correctly. One shared component for both states, so a tab row
 * can't drift back to that mismatch again. */
export function CyberTabPill({
  label,
  active,
  onPress,
  cutSize = 8,
  radius = 4,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  cutSize?: number;
  radius?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <CyberCutBox
        gradient={active}
        cutSize={cutSize}
        radius={radius}
        fill={active ? undefined : colors.cardFill}
        borderColor={active ? undefined : colors.cardBorder}
        borderWidth={active ? 0 : 1}
      >
        <View style={styles.inner}>
          <Text style={[styles.text, { color: active ? '#FFFFFF' : colors.muted }]}>{label}</Text>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: { height: 38, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
});
