import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, minTouch, radius, useTheme } from '../../theme';

type Props = {
  provider: 'google' | 'apple';
  onPress: () => void;
};

export function SocialLoginButton({ provider, onPress }: Props) {
  const { colors } = useTheme();
  const label = provider === 'google' ? 'Continue with Google' : 'Continue with Apple';
  const icon = provider === 'google' ? 'logo-google' : 'logo-apple';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: minTouch,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontFamily: fonts.bodyMed, fontSize: 15 },
});
