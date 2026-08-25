import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { SocialLoginButton } from '../../../components/buttons/SocialLoginButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { brandLogo } from '../../../data/brand';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, space, useTheme } from '../../../theme';
import { isEmail } from '../../../utils/validation';
import type { AuthStackParamList } from '../../../navigation/types';

export function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = isEmail(email) ? '' : 'Enter a valid email';
    const p = password.length >= 8 ? '' : 'Password must be at least 8 characters';
    setEmailErr(e);
    setPassErr(p);
    return !e && !p;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    if (password === 'wrongpass') {
      setPassErr('Invalid credentials');
      setSubmitting(false);
      return;
    }
    await login(email.trim());
    setSubmitting(false);
  };

  return (
    <Screen footerPad={false}>
      <Image source={brandLogo} style={styles.logo} accessibilityLabel="Reapers logo" />
      <Text style={[styles.mark, { color: colors.text }]}>REAPERS</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>Sign in to the community</Text>
      <View style={styles.gap} />
      <AuthTextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={emailErr}
        onBlur={() => setEmailErr(isEmail(email) ? '' : 'Enter a valid email')}
        editable={!submitting}
      />
      <AuthTextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={passErr}
        onBlur={() => setPassErr(password.length >= 8 ? '' : 'Password must be at least 8 characters')}
        editable={!submitting}
      />
      <Pressable onPress={() => nav.navigate('ForgotPassword')} style={styles.linkWrap} accessibilityRole="button">
        <Text style={[styles.link, { color: colors.cyan }]}>Forgot password?</Text>
      </Pressable>
      <PrimaryButton label="Log in" onPress={submit} loading={submitting} disabled={submitting} />
      <SocialLoginButton provider="google" onPress={() => login('john@reapers.dev')} />
      <SocialLoginButton provider="apple" onPress={() => login('john@reapers.dev')} />
      <Pressable onPress={() => nav.navigate('Signup')} style={styles.linkWrap} accessibilityRole="button">
        <Text style={[styles.muted, { color: colors.muted }]}>
          New here? <Text style={[styles.link, { color: colors.cyan }]}>Create an account</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 72, height: 72, borderRadius: 20, marginBottom: 12, marginTop: 12 },
  mark: { fontFamily: fonts.display, fontSize: 32, letterSpacing: 3 },
  sub: { fontFamily: fonts.body, marginTop: 6 },
  gap: { height: space.xl },
  linkWrap: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: fonts.bodyMed },
  muted: { fontFamily: fonts.body, textAlign: 'center' },
});
