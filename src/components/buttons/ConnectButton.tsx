import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, minTouch, radius, useTheme } from '../../theme';

type State = 'connect' | 'pending' | 'connected';

export function ConnectButton({ state, onPress }: { state: State; onPress: () => void }) {
  const { colors } = useTheme();
  const label = state === 'connect' ? 'Connect' : state === 'pending' ? 'Pending' : 'Connected';
  return (
    <Pressable
      onPress={onPress}
      disabled={state === 'connected'}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.btn,
        { backgroundColor: colors.magenta },
        state !== 'connect' && { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: minTouch,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
