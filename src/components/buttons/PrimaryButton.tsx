import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { fonts, minTouch, radius, shadows, useTheme } from '../../theme';
import { useSingleFlight } from '../../hooks/useSingleFlight';

type Props = {
  label: string;
  /** If this returns a promise the button shows a spinner and ignores taps until it settles. */
  onPress: () => unknown;
  loading?: boolean;
  /** Status text shown next to the spinner while busy, e.g. "Saving…". */
  loadingLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, loading, loadingLabel = 'Please wait…', disabled, style }: Props) {
  const { colors, gradients } = useTheme();
  const { run, pending } = useSingleFlight(onPress);
  const busy = !!loading || pending;
  return (
    <Pressable
      onPress={run}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [shadows.glow, { opacity: pressed || disabled ? 0.72 : 1 }, style]}
    >
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.onPrimary} />
            <Text style={[styles.label, { color: colors.onPrimary }]}>{loadingLabel}</Text>
          </View>
        ) : (
          <Text style={[styles.label, { color: colors.onPrimary }]}>{label}</Text>
        )}
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
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
