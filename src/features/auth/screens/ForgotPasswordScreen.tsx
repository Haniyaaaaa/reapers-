import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AuthStackParamList } from '../../../navigation/types';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { fonts, useTheme } from '../../../theme';
import { isEmail } from '../../../utils/validation';
import { useAuth } from '../../../hooks/useAuth';

export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = email.trim();
    if (!isEmail(e)) {
      setError('Enter a valid email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(e);
      nav.navigate('ResetPassword', { email: e });
    } catch (err) {
      // Deliberately vague — a precise "no account for that email" error would let an
      // attacker enumerate registered addresses.
      setError(err instanceof Error ? err.message : 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Reset password" onBack={() => nav.goBack()} />
      <Text style={[styles.body, { color: colors.muted }]}>
        We’ll email you a 6-digit code. No password is changed until you enter it and choose a new one.
      </Text>
      <AuthTextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={error}
        onBlur={() => setError(isEmail(email) ? '' : 'Enter a valid email')}
      />
      <CyberButton label="Send reset code" onPress={submit} loading={loading} disabled={loading} />
      <Pressable onPress={() => nav.navigate('Login')} style={styles.link} accessibilityRole="button">
        <Text style={[styles.linkText, { color: colors.primary }]}>Return to login</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.body, marginBottom: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodyMed, textAlign: 'center' },
});
