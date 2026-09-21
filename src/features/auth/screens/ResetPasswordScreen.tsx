import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AuthStackParamList } from '../../../navigation/types';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { parseRateLimitSeconds } from '../../../utils/authRateLimit';
import { fonts, space, useTheme } from '../../../theme';

const RESEND_COOLDOWN_SEC = 30;

/** Step 1 of password reset — verify the emailed code only. Step 2 (choosing the new
 * password) is its own screen, SetNewPasswordScreen, reached only after this succeeds — kept
 * separate so each screen has one job instead of showing every field at once. */
export function ResetPasswordScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>();
  const { verifyPasswordReset, resendPasswordReset } = useAuth();

  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setCodeErr('Enter the 6-digit code');
      return;
    }
    setCodeErr('');
    setSubmitting(true);
    try {
      await verifyPasswordReset(params.email, trimmed);
      nav.replace('SetNewPassword', { email: params.email });
    } catch (e) {
      setCodeErr(e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      await resendPasswordReset(params.email);
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not resend code';
      setCodeErr(message);
      // Supabase's own rate limit can outlast our guessed cooldown — sync the countdown to
      // the real wait it just told us about so the button doesn't re-enable before it will
      // actually work again.
      const realWait = parseRateLimitSeconds(message);
      if (realWait) setCooldown(realWait);
    }
  };

  const { run: runResend, pending: resending } = useSingleFlight(resend);

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Enter code" onBack={() => nav.goBack()} />
      <Text style={[styles.body, { color: colors.muted }]}>
        We sent a 6-digit code to <Text style={[styles.bold, { color: colors.text }]}>{params.email}</Text>.
        {'\n'}Can't find it? Check your spam or junk folder.
      </Text>
      <View style={{ height: space.lg }} />
      <AuthTextField
        label="Verification code"
        value={code}
        onChangeText={(v) => {
          setCode(v.replace(/[^0-9]/g, '').slice(0, 6));
          if (codeErr) setCodeErr('');
        }}
        keyboardType="number-pad"
        maxLength={6}
        error={codeErr}
        placeholder="123456"
      />
      <CyberButton label="Verify code" onPress={submit} loading={submitting} disabled={submitting} />
      {resent ? <Text style={[styles.resentNote, { color: colors.online }]}>Code resent.</Text> : null}
      <Pressable onPress={runResend} disabled={cooldown > 0 || resending} style={styles.linkWrap} accessibilityRole="button">
        <Text style={[styles.link, { color: colors.primary }, cooldown > 0 && { color: colors.muted2 }]}>
          {resending ? 'Sending…' : cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bold: { fontFamily: fonts.bodySemi },
  linkWrap: { minHeight: 44, justifyContent: 'center', marginTop: 8 },
  link: { fontFamily: fonts.bodyMed, textAlign: 'center' },
  resentNote: { fontFamily: fonts.bodyMed, textAlign: 'center', marginTop: 8 },
});
