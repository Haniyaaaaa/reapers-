import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';

type State = 'connect' | 'pending' | 'connected';

/** Same cut-box gradient/outline convention as the rest of the app's connect buttons
 * (PersonListCard, TeamRequestCard's action row) — this one, on the profile screen itself, used
 * to be a plain magenta pill that didn't match any of them.
 *
 * Pending is tappable too — undoes a request you sent, via onCancel — instead of sitting there
 * disabled with no way back once you've tapped Connect. Already-connected stays inert; there's
 * no "unfriend from here" button. */
export function ConnectButton({
  state,
  onPress,
  onCancel,
}: {
  state: State;
  onPress: () => void;
  /** Required when a caller can ever show state="pending" — omit only where a pending state
   * genuinely can't occur. */
  onCancel?: () => void;
}) {
  const { colors } = useTheme();
  const label = state === 'connect' ? 'Connect' : state === 'pending' ? 'Pending' : 'Connected';

  if (state === 'connect') {
    return (
      <CyberCutBox gradient cutSize={10} radius={4} style={styles.cut}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.inner}>
          <Text style={styles.labelActive}>{label}</Text>
        </Pressable>
      </CyberCutBox>
    );
  }

  const connected = state === 'connected';
  const cancellable = state === 'pending' && !!onCancel;
  return (
    <CyberCutBox
      cutSize={10}
      radius={4}
      fill={connected ? 'rgba(61, 220, 132, 0.14)' : colors.cardFill}
      borderColor={connected ? 'rgba(61, 220, 132, 0.5)' : colors.cardBorder}
      borderWidth={1}
      style={styles.cut}
    >
      <Pressable
        disabled={!cancellable}
        onPress={cancellable ? onCancel : undefined}
        style={styles.inner}
        accessibilityRole="button"
        accessibilityLabel={cancellable ? `${label} — tap to cancel` : label}
      >
        {connected ? <Ionicons name="checkmark" size={15} color="#3DDC84" /> : null}
        <Text style={[styles.label, { color: connected ? '#3DDC84' : colors.muted }]}>{label}</Text>
        {cancellable ? <Ionicons name="close" size={14} color={colors.muted} /> : null}
      </Pressable>
    </CyberCutBox>
  );
}

const styles = StyleSheet.create({
  cut: { height: 42, alignSelf: 'flex-start' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 6, height: '100%', paddingHorizontal: 20, justifyContent: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 13 },
  labelActive: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#FFFFFF' },
});
