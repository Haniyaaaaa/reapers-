import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AuthStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { useAuth } from '../../../hooks/useAuth';
import { colors, fonts, space } from '../../../theme';
import { isEmail, passwordStrength } from '../../../utils/validation';

export function SignupScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onEmailBlur = () => setEmailErr(isEmail(email) ? '' : 'Enter a valid email');
  const onPassBlur = () => {
    const s = passwordStrength(password);
    setPassErr(s.ok ? '' : s.message);
  };

  const submit = async () => {
    onEmailBlur();
    const s = passwordStrength(password);
    setPassErr(s.ok ? '' : s.message);
    if (!isEmail(email) || !s.ok) return;
    setSubmitting(true);
    await signup(email.trim());
    setSubmitting(false);
  };

  return (
    <Screen footerPad={false}>
      <Text style={styles.mark}>Join Reapers</Text>
      <Text style={styles.sub}>Create your gamer / developer identity</Text>
      <View style={{ height: space.xl }} />
      <AuthTextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        error={emailErr}
        onBlur={onEmailBlur}
        editable={!submitting}
      />
      <AuthTextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={passErr}
        onBlur={onPassBlur}
        editable={!submitting}
      />
      <Text style={styles.hint}>8+ characters, one uppercase letter, one number</Text>
      <PrimaryButton label="Create account" onPress={submit} loading={submitting} disabled={submitting} />
      <Pressable onPress={() => nav.navigate('Login')} style={styles.linkWrap} accessibilityRole="button">
        <Text style={styles.muted}>
          Already have an account? <Text style={styles.link}>Log in</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { color: colors.text, fontFamily: fonts.display, fontSize: 28, marginTop: 24 },
  sub: { color: colors.muted, fontFamily: fonts.body, marginTop: 6 },
  hint: { color: colors.muted2, fontFamily: fonts.body, fontSize: 12 },
  linkWrap: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.cyan, fontFamily: fonts.bodyMed },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
});
