import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts, minTouch } from '../../theme';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { CyberCutBox } from '../cyber/CyberCutBox';

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

/** The app's main call-to-action: the brand cyan → purple → magenta gradient in the chamfered
 * cut-box shape, same as CyberButton, but it hugs its content unless the caller gives it a width. */
export function PrimaryButton({ label, onPress, loading, loadingLabel = 'Please wait…', disabled, style }: Props) {
  const { run, pending } = useSingleFlight(onPress);
  const busy = !!loading || pending;
  return (
    <Pressable
      onPress={run}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.outer,
        { opacity: pressed || disabled ? 0.8 : 1 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <CyberCutBox gradient cutSize={14} radius={4} style={styles.box}>
        <View style={styles.inner}>
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.label}>{loadingLabel}</Text>
            </View>
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    shadowColor: '#6D35FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.985 }] },
  box: { minHeight: Math.max(minTouch, 50), justifyContent: 'center', alignSelf: 'stretch' },
  inner: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 14 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
