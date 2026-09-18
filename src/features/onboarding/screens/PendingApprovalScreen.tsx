import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);

/**
 * Shown for a signed-in, onboarded account still in approval_status='pending'.
 * Styled with the cyberpunk neon theme, ground reflections, chamfer cuts, and gradients.
 */
export function PendingApprovalScreen() {
  const { colors, isLight } = useTheme();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {/* Cyberpunk Artwork Background with ground reflections */}
      <CyberBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
            {/* Glowing Hourglass Aura Badge */}
            <View style={styles.badgeWrapper}>
              <LinearGradient
                colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badgeGlowRing}
              >
                <View style={[styles.badgeInner, { backgroundColor: isLight ? '#FFFFFF' : '#0D1322' }]}>
                  <Ionicons name="hourglass-outline" size={38} color={isLight ? colors.primary : '#00E5FF'} />
                </View>
              </LinearGradient>
            </View>

            {/* Header Title */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>You’re Almost In</Text>
              <View style={styles.accentLineContainer}>
                <LinearGradient
                  colors={['#00E5FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.accentLine}
                />
              </View>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Your account is being reviewed by the Reapers team. This usually only takes a bit — we’ll let you know the moment you’re approved.
              </Text>
            </View>

            {/* Status Checklist Card */}
            <CyberCutBox
              cutSize={14}
              radius={6}
              fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
              borderColor={isLight ? colors.cardBorder : 'rgba(109, 53, 255, 0.45)'}
              borderWidth={1}
              style={styles.checklistCard}
            >
              <View style={styles.cardInner}>
                {/* 1: Profile submitted */}
                <View style={styles.checkRow}>
                  <View style={[styles.iconBubble, styles.iconBubbleComplete]}>
                    <Ionicons name="checkmark-sharp" size={16} color="#00E699" />
                  </View>
                  <View style={styles.checkTextWrap}>
                    <Text style={[styles.checkTitle, { color: colors.text }]}>Profile submitted</Text>
                    <Text style={[styles.checkSubtitle, { color: colors.muted }]}>All details successfully saved</Text>
                  </View>
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>DONE</Text>
                  </View>
                </View>

                <View style={[styles.rowDivider, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.06)' }]} />

                {/* 2: Awaiting review */}
                <View style={styles.checkRow}>
                  <View style={[styles.iconBubble, styles.iconBubblePending]}>
                    <Ionicons name="time-outline" size={16} color={isLight ? colors.primary : '#00E5FF'} />
                  </View>
                  <View style={styles.checkTextWrap}>
                    <Text style={[styles.checkTitle, styles.checkTitleActive, { color: isLight ? colors.primary : '#00E5FF' }]}>Awaiting review</Text>
                    <Text style={[styles.checkSubtitle, { color: colors.muted }]}>Reapers team evaluating submission</Text>
                  </View>
                  <LinearGradient
                    colors={['rgba(0, 229, 255, 0.25)', 'rgba(216, 60, 255, 0.25)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pendingBadge}
                  >
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </LinearGradient>
                </View>

                <View style={[styles.rowDivider, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.06)' }]} />

                {/* 3: Full access once approved */}
                <View style={styles.checkRow}>
                  <View style={[styles.iconBubble, styles.iconBubbleLocked, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)', borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255, 255, 255, 0.1)' }]}>
                    <Ionicons name="rocket-outline" size={16} color={colors.muted2} />
                  </View>
                  <View style={styles.checkTextWrap}>
                    <Text style={[styles.checkTitle, styles.checkTitleLocked, { color: colors.muted2 }]}>Full access once approved</Text>
                    <Text style={[styles.checkSubtitle, { color: colors.muted }]}>Chat, demos, bounties & matching</Text>
                  </View>
                </View>
              </View>
            </CyberCutBox>

            {/* Signed In User Pill */}
            <View style={styles.profileChipWrap}>
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={isLight ? colors.cardFill : 'rgba(18, 24, 42, 0.85)'}
                borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.15)'}
                borderWidth={1}
                style={styles.profileCutBox}
              >
                <View style={styles.profileInner}>
                  <AvatarRing
                    name={user?.displayName ?? user?.username ?? 'You'}
                    uri={user?.avatarUri}
                    avatarId={user?.avatarId}
                    look={user?.avatarLook}
                    size={32}
                  />
                  <Text style={[styles.usernameText, { color: colors.muted }]} numberOfLines={1}>
                    Signed in as <Text style={[styles.highlightUser, { color: isLight ? colors.primary : '#00E5FF' }]}>@{user?.username}</Text>
                  </Text>
                </View>
              </CyberCutBox>
            </View>

            {/* Log Out Section */}
            {confirmingLogout ? (
              <CyberCutBox
                cutSize={10}
                radius={5}
                fill={isLight ? colors.cardFill : 'rgba(18, 24, 42, 0.95)'}
                borderColor={isLight ? 'rgba(255, 77, 109, 0.4)' : 'rgba(255, 77, 109, 0.5)'}
                borderWidth={1}
                style={styles.logoutConfirmCard}
              >
                <View style={styles.logoutConfirmInner}>
                  <Text style={[styles.confirmTitle, { color: colors.text }]}>Log out of this account?</Text>
                  <Text style={[styles.confirmSubtitle, { color: colors.muted }]}>
                    You can sign back in at any time to check review status.
                  </Text>

                  <View style={styles.confirmActionRow}>
                    <Pressable
                      onPress={() => setConfirmingLogout(false)}
                      style={styles.cancelActionBtn}
                      accessibilityRole="button"
                    >
                      <CyberCutBox
                        cutSize={6}
                        radius={3}
                        fill={isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.08)'}
                        borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.15)'}
                        borderWidth={1}
                        style={styles.cancelCutBox}
                      >
                        <Text style={[styles.cancelActionText, { color: colors.muted }]}>Cancel</Text>
                      </CyberCutBox>
                    </Pressable>

                    <CyberButton
                      label={loggingOut ? 'Logging out…' : 'Log out'}
                      loading={loggingOut}
                      onPress={async () => {
                        setLoggingOut(true);
                        await logout();
                        setLoggingOut(false);
                      }}
                      style={styles.confirmButton}
                    />
                  </View>
                </View>
              </CyberCutBox>
            ) : (
              <Pressable
                onPress={() => setConfirmingLogout(true)}
                style={styles.logoutLink}
                accessibilityRole="button"
              >
                <Text style={[styles.logoutLinkText, { color: colors.muted2 }]}>Log out</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  innerContent: {
    width: '100%',
    alignItems: 'center',
  },
  badgeWrapper: {
    marginBottom: 20,
    shadowColor: '#6D35FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
  },
  badgeGlowRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeInner: {
    width: 77,
    height: 77,
    borderRadius: 38.5,
    backgroundColor: '#0D1322',
    justifyContent: 'center',
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
    fontSize: 13.5,
    lineHeight: 20,
    color: '#8E9BB5',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  checklistCard: {
    width: '100%',
    padding: 18,
    marginBottom: 24,
  },
  cardInner: {
    width: '100%',
    gap: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBubbleComplete: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.4)',
  },
  iconBubblePending: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  iconBubbleLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkTextWrap: {
    flex: 1,
  },
  checkTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkTitleActive: {
    color: '#00E5FF',
  },
  checkTitleLocked: {
    color: '#64748B',
  },
  checkSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
    marginTop: 2,
  },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.35)',
  },
  doneBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00E699',
    letterSpacing: 0.5,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.4)',
  },
  pendingBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.5,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
  },
  profileChipWrap: {
    marginBottom: 28,
    alignSelf: 'center',
  },
  profileCutBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  profileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileInfo: {
    maxWidth: 220,
  },
  usernameText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: '#8E9BB5',
  },
  highlightUser: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  logoutLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoutLinkText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: '#64748B',
    letterSpacing: 0.4,
  },
  logoutConfirmCard: {
    width: '100%',
    padding: 16,
    marginTop: 8,
  },
  logoutConfirmInner: {
    width: '100%',
    alignItems: 'center',
  },
  confirmTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelActionBtn: {
    flex: 1,
    height: 44,
  },
  cancelCutBox: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: '#8E9BB5',
  },
  confirmButton: {
    flex: 1,
  },
});
