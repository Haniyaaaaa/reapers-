import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import type { AuthStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;

export function VerifyEmailScreen() {
  const { colors, isLight } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'VerifyEmail'>>();
  const email = route.params?.email ?? 'your email';

  const { verifyEmail, resendVerification } = useAuth();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async () => {
    if (code.trim().length < CODE_LENGTH) {
      setErr(`Please enter all ${CODE_LENGTH} digits`);
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await verifyEmail(email, code.trim());
      // Auth listener transitions into Onboarding/Main flow
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      await resendVerification(email);
      setResent(true);
      setErr('');
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not resend code');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {/* Cyberpunk Background Artwork with bottom gradient reflections */}
      <CyberBackground showArtwork />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
              {/* STEP 1 OF 5 · CODE & 20% Bar */}
              <View style={styles.stepHeader}>
                <View style={styles.stepRow}>
                  <Text style={[styles.stepText, { color: colors.muted }]}>STEP 1 OF 5 · CODE</Text>
                  <Text style={styles.percentageText}>20%</Text>
                </View>

                {/* 20% Progress bar with cyan-to-magenta gradient fill */}
                <View style={[styles.progressTrack, { backgroundColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                  <LinearGradient
                    colors={['#00E5FF', '#D83CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFill}
                  />
                </View>
              </View>

              {/* Title & Glowing Accent Line */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Verification Code</Text>

                <View style={styles.accentLineContainer}>
                  <LinearGradient
                    colors={['#00E5FF', '#D83CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accentLine}
                  />
                </View>

                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  Please enter the code that we sent to you on{'\n'}
                  <Text style={[styles.emailHighlight, { color: colors.text }]}>{email}</Text>
                </Text>
              </View>

              {/* Hidden TextInput for native keyboard capture */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
                  setCode(cleaned);
                  if (err) setErr('');
                  if (cleaned.length === CODE_LENGTH) {
                    Keyboard.dismiss();
                  }
                }}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                style={styles.hiddenInput}
              />

              {/* OTP Digits Row */}
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={styles.otpRow}
                accessibilityRole="button"
                accessibilityLabel="Enter verification code digits"
              >
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const digit = code[i] ?? '';
                  const isCurrent = i === code.length;
                  const isFilled = !!digit;

                  return (
                    <CyberCutBox
                      key={i}
                      cutSize={8}
                      radius={6}
                      fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
                      borderColor={
                        isCurrent
                          ? (isLight ? colors.primary : '#00E5FF')
                          : isFilled
                          ? (isLight ? '#6D35FF' : 'rgba(109, 53, 255, 0.7)')
                          : (isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)')
                      }
                      borderWidth={isCurrent ? 1.5 : 1}
                      style={styles.otpBox}
                    >
                      <View style={styles.otpBoxInner}>
                        {digit ? (
                          <Text style={[styles.otpDigit, { color: colors.text }]}>{digit}</Text>
                        ) : (
                          <View
                            style={[
                              styles.dash,
                              { backgroundColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255, 255, 255, 0.25)' },
                              isCurrent && styles.dashActive,
                            ]}
                          />
                        )}
                      </View>
                    </CyberCutBox>
                  );
                })}
              </Pressable>

              {/* Error or Resent Notice */}
              {err ? <Text style={styles.errorText}>{err}</Text> : null}
              {resent ? <Text style={styles.resentText}>Code resent to {email}</Text> : null}

              {/* Continue Action Button */}
              <CyberButton
                label="Continue"
                onPress={submit}
                loading={submitting}
                disabled={submitting}
                style={styles.continueButton}
              />

              {/* Resend Link: Didn't get? Send me a new code */}
              <View style={styles.resendRow}>
                <Text style={[styles.resendPrompt, { color: colors.muted }]}>Didn't get? </Text>
                <Pressable
                  onPress={resend}
                  disabled={cooldown > 0}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.resendLink,
                      { color: colors.primary },
                      cooldown > 0 && styles.resendDisabled,
                    ]}
                  >
                    {cooldown > 0 ? `Send me a new code (${cooldown}s)` : 'Send me a new code'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
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
  stepHeader: {
    width: '100%',
    marginBottom: 28,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  percentageText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    fontWeight: '700',
    color: '#D83CFF',
  },
  progressTrack: {
    width: '100%',
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '20%',
    height: '100%',
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
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
    fontSize: 13.5,
    lineHeight: 20,
    color: '#8E9BB5',
    textAlign: 'center',
    marginTop: 2,
  },
  emailHighlight: {
    color: '#E2E8F0',
    fontFamily: fonts.bodyMed,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    height: 56,
  },
  otpBoxInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpDigit: {
    fontFamily: fonts.bodySemi,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dash: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dashActive: {
    backgroundColor: '#00E5FF',
    width: 20,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#FF4D6D',
    marginBottom: 16,
    textAlign: 'center',
  },
  resentText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12.5,
    color: '#00E5FF',
    marginBottom: 16,
    textAlign: 'center',
  },
  continueButton: {
    marginBottom: 24,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendPrompt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#8E9BB5',
  },
  resendLink: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontStyle: 'italic',
  },
  resendDisabled: {
    color: '#64748B',
    textDecorationLine: 'none',
  },
});
