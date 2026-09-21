import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import type { AuthStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { CyberSocialRow } from '../../../components/cyber/CyberSocialRow';
import { CyberTabs } from '../../../components/cyber/CyberTabs';
import { CyberTextField } from '../../../components/cyber/CyberTextField';
import { useAuth } from '../../../hooks/useAuth';
import { isUsernameAvailable } from '../../../services/supabase/profiles';
import { fonts, useTheme } from '../../../theme';
import { isEmail, isPhone, passwordStrength } from '../../../utils/validation';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FORM_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);

export function SignupScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signup, loginWithGoogle, loginWithApple } = useAuth();
  const { colors, isDark } = useTheme();

  // All fields preserved for complete business logic
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error states
  const [firstErr, setFirstErr] = useState('');
  const [lastErr, setLastErr] = useState('');
  const [userErr, setUserErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  // Validation handlers
  const onEmailBlur = () => setEmailErr(isEmail(email) ? '' : 'Enter a valid email');
  const onPassBlur = () => {
    const s = passwordStrength(password);
    setPassErr(s.ok ? '' : s.message);
  };
  const onConfirmBlur = () => setConfirmErr(confirmPassword === password ? '' : 'Passwords do not match');
  const onPhoneBlur = () => setPhoneErr(phone.trim() === '' || isPhone(phone) ? '' : 'Enter a valid phone number');

  const onUsernameBlur = async () => {
    const u = username.trim();
    if (u.length < 3) {
      setUserErr('Username must be at least 3 characters');
      return false;
    }
    try {
      const available = await isUsernameAvailable(u);
      setUserErr(available ? '' : 'That username is already taken');
      return available;
    } catch {
      setUserErr('');
      return true;
    }
  };

  const submit = async () => {
    const first = firstName.trim() ? '' : 'First name is required';
    const last = lastName.trim() ? '' : 'Last name is required';
    setFirstErr(first);
    setLastErr(last);

    const usernameOk = await onUsernameBlur();
    onEmailBlur();
    const s = passwordStrength(password);
    setPassErr(s.ok ? '' : s.message);
    const confirmOk = confirmPassword === password;
    setConfirmErr(confirmOk ? '' : 'Passwords do not match');
    onPhoneBlur();

    if (
      first ||
      last ||
      !usernameOk ||
      !isEmail(email) ||
      !s.ok ||
      !confirmOk ||
      (phone.trim() && !isPhone(phone))
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const { session } = await signup({
        email: email.trim(),
        password,
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });

      // If Supabase project requires email confirmation, navigate to code verification
      if (!session) {
        nav.navigate('VerifyEmail', { email: email.trim() });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      if (message.toLowerCase().includes('email')) setEmailErr(message);
      else setConfirmErr(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithApple();
    } catch (err) {
      Alert.alert('Sign-in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Cyberpunk Artwork Background on Signup */}
      <CyberBackground showArtwork />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.innerContent, { maxWidth: FORM_MAX_WIDTH }]}>
              {/* Header Title & Subtitle */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>

                {/* Glowing cyan-to-magenta accent line */}
                <View style={styles.accentLineContainer}>
                  <LinearGradient
                    colors={['#00E5FF', '#D83CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accentLine}
                  />
                </View>

                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  Join 240,000 gamers, developers and industry{'\n'}experts building together.
                </Text>
              </View>

              {/* Segmented Control Tabs */}
              <CyberTabs
                activeTab="signup"
                onChangeTab={(tab) => {
                  if (tab === 'login') {
                    if (nav.canGoBack()) {
                      nav.goBack();
                    } else {
                      nav.navigate('Login');
                    }
                  }
                }}
              />

              {/* First Name & Last Name (Side by side) */}
              <View style={styles.nameRow}>
                <View style={styles.halfField}>
                  <CyberTextField
                    label="FIRST NAME"
                    required
                    value={firstName}
                    onChangeText={(val) => {
                      setFirstName(val);
                      if (firstErr) setFirstErr('');
                    }}
                    placeholder="First name"
                    error={firstErr}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.halfField}>
                  <CyberTextField
                    label="LAST NAME"
                    required
                    value={lastName}
                    onChangeText={(val) => {
                      setLastName(val);
                      if (lastErr) setLastErr('');
                    }}
                    placeholder="Last name"
                    error={lastErr}
                    editable={!submitting}
                  />
                </View>
              </View>

              {/* User Name */}
              <CyberTextField
                label="USER NAME"
                required
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
                  if (userErr) setUserErr('');
                }}
                autoCapitalize="none"
                placeholder="HiraFatima"
                error={userErr}
                onBlur={onUsernameBlur}
                editable={!submitting}
              />

              {/* Email */}
              <CyberTextField
                label="EMAIL"
                required
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (emailErr) setEmailErr('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@studio.dev"
                error={emailErr}
                onBlur={onEmailBlur}
                editable={!submitting}
              />

              {/* Phone (Optional) */}
              <CyberTextField
                label="PHONE (OPTIONAL)"
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (phoneErr) setPhoneErr('');
                }}
                keyboardType="phone-pad"
                placeholder="+92 300 1234567"
                error={phoneErr}
                onBlur={onPhoneBlur}
                editable={!submitting}
              />

              {/* Password */}
              <CyberTextField
                label="PASSWORD"
                required
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (passErr) setPassErr('');
                }}
                secureTextEntry
                placeholder="••••••••••"
                hint={passErr ? undefined : '8+ characters, 1 uppercase, 1 number'}
                error={passErr}
                onBlur={onPassBlur}
                editable={!submitting}
              />

              {/* Confirm Password */}
              <CyberTextField
                label="CONFIRM PASSWORD"
                required
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (confirmErr) setConfirmErr('');
                }}
                secureTextEntry
                placeholder="••••••••••"
                error={confirmErr}
                onBlur={onConfirmBlur}
                editable={!submitting}
                containerStyle={styles.lastField}
              />

              {/* Main SIGN UP Button */}
              <CyberButton
                label="SIGN UP"
                onPress={submit}
                loading={submitting}
                disabled={submitting}
                style={styles.actionButton}
              />

              {/* Divider: OR CONTINUE WITH */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.muted2 }]}>OR CONTINUE WITH</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Social Login Buttons: Google, Apple */}
              <CyberSocialRow
                onGooglePress={() => handleSocial('google')}
                onApplePress={() => handleSocial('apple')}
                loadingProvider={socialLoading}
                disabled={submitting}
                style={styles.socialRow}
              />

              {/* Footer Disclaimer */}
              <Text style={[styles.footerText, { color: colors.muted2 }]}>
                By continuing you agree to the REAPERS Terms and Community Guidelines.
              </Text>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  innerContent: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
    width: '100%',
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  accentLineContainer: {
    marginVertical: 10,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  accentLine: {
    width: 48,
    height: 2.5,
    borderRadius: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#8E9BB5',
    textAlign: 'center',
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  lastField: {
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  dividerText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    letterSpacing: 1,
    color: '#64748B',
    marginHorizontal: 12,
  },
  socialRow: {
    marginBottom: 26,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(142, 155, 181, 0.65)',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
