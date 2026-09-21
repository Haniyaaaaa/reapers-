import { RouteProp, useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AuthStackParamList } from '../../../navigation/types';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, space, useTheme } from '../../../theme';
import { passwordStrength } from '../../../utils/validation';

/** Step 2 of password reset — only reachable after ResetPasswordScreen's code verification
 * already succeeded (a real recovery session exists at that point; see authStore's
 * `passwordRecovery` flag, which is what routes a reopened app straight back to this screen
 * instead of Welcome). "Back" here cancels the whole recovery rather than returning to the
 * code screen, since the code has already been consumed and can't be re-verified. */
export function SetNewPasswordScreen() {
  const { colors } = useTheme();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'SetNewPassword'>>();
  const { completePasswordReset, cancelPasswordRecovery } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const strength = passwordStrength(newPassword);
    const confirmOk = confirmPassword === newPassword;

    setPasswordErr(strength.ok ? '' : strength.message);
    setConfirmErr(confirmOk ? '' : 'Passwords do not match');
    if (!strength.ok || !confirmOk) return;

    setSubmitting(true);
    try {
      await completePasswordReset(newPassword);
      // Success signs the user straight in with the new password — RootNavigator's
      // passwordRecovery gate drops and takes it from here, nothing to navigate manually.
    } catch (e) {
      setPasswordErr(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Set new password" onBack={() => cancelPasswordRecovery()} />
      <Text style={[styles.body, { color: colors.muted }]}>
        {params?.email ? (
          <>
            Code verified for <Text style={[styles.bold, { color: colors.text }]}>{params.email}</Text>.
          </>
        ) : (
          'Code verified.'
        )}{' '}
        Choose a new
        password below.
      </Text>
      <View style={{ height: space.lg }} />
      <AuthTextField
        label="New password"
        value={newPassword}
        onChangeText={(v) => {
          setNewPassword(v);
          if (passwordErr) setPasswordErr('');
        }}
        secureTextEntry
        autoCapitalize="none"
        error={passwordErr}
        onBlur={() => setPasswordErr(passwordStrength(newPassword).ok ? '' : passwordStrength(newPassword).message)}
        hint="At least 8 characters, with an uppercase letter and a number"
      />
      <AuthTextField
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          if (confirmErr) setConfirmErr('');
        }}
        secureTextEntry
        autoCapitalize="none"
        error={confirmErr}
        onBlur={() => setConfirmErr(confirmPassword === newPassword ? '' : 'Passwords do not match')}
      />
      <CyberButton label="Update password" onPress={submit} loading={submitting} disabled={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bold: { fontFamily: fonts.bodySemi },
});
