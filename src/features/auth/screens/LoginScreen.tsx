import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { fonts, useTheme } from '../../../theme';
import { isEmail } from '../../../utils/validation';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FORM_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);

export function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

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
    try {
      await login(email.trim(), password);
    } catch (err) {
      setPassErr(err instanceof Error ? err.message : 'Invalid email or password');
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

      {/* Cyberpunk Artwork Background on Login */}
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
                <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                
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
                  Pick up where you left off — your communities,{'\n'}matches and sessions.
                </Text>
              </View>

              {/* Segmented Control Tabs */}
              <CyberTabs
                activeTab="login"
                onChangeTab={(tab) => {
                  if (tab === 'signup') nav.navigate('Signup');
                }}
              />

              {/* Form Fields */}
              <CyberTextField
                label="Email"
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
                onBlur={() => {
                  if (email) setEmailErr(isEmail(email) ? '' : 'Enter a valid email');
                }}
                editable={!submitting}
              />

              <CyberTextField
                label="Password"
                required
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (passErr) setPassErr('');
                }}
                secureTextEntry
                placeholder="••••••••••"
                error={passErr}
                onBlur={() => {
                  if (password) {
                    setPassErr(password.length >= 8 ? '' : 'Password must be at least 8 characters');
                  }
                }}
                editable={!submitting}
              />

              {/* Forgot password link */}
              <Pressable
                onPress={() => nav.navigate('ForgotPassword')}
                accessibilityRole="button"
                style={styles.forgotWrap}
                hitSlop={8}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </Pressable>

              {/* Main Log in Button */}
              <CyberButton
                label="Log in"
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
    paddingBottom: 24,
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
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12.5,
    color: '#8E9BB5',
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
