import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { fonts, minTouch, radius, shadows, useTheme } from '../../theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, loading, disabled, style }: Props) {
  const { colors, gradients } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [shadows.glow, { opacity: pressed || disabled ? 0.72 : 1 }, style]}
    >
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.label, { color: colors.onPrimary }]}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: minTouch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderTopRightRadius: 8,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
