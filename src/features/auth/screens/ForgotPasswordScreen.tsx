import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AuthStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { colors, fonts } from '../../../theme';
import { isEmail } from '../../../utils/validation';

export function ForgotPasswordScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    setSent(true);
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Reset password" onBack={() => nav.goBack()} />
      {sent ? (
        <>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.body}>
            If an account exists for {email}, a reset link is on its way. It expires in 30 minutes.
          </Text>
          <PrimaryButton label="Back to login" onPress={() => nav.navigate('Login')} />
        </>
      ) : (
        <>
          <Text style={styles.body}>We’ll email you a reset link. No password is changed until you follow it.</Text>
          <AuthTextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={error}
            onBlur={() => setError(isEmail(email) ? '' : 'Enter a valid email')}
          />
          <PrimaryButton label="Send reset link" onPress={submit} loading={loading} />
        </>
      )}
      <Pressable onPress={() => nav.navigate('Login')} style={styles.link} accessibilityRole="button">
        <Text style={styles.linkText}>Return to login</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 24, marginBottom: 8 },
  body: { color: colors.muted, fontFamily: fonts.body, marginBottom: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.cyan, fontFamily: fonts.bodyMed, textAlign: 'center' },
});
