import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { goBackOrHome } from '../../../navigation/goBackOrHome';
import type { MainStackParamList } from '../../../navigation/types';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { brandLogo } from '../../../data/brand';
import { streakOptions } from '../../../data/streaks';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useTourStore } from '../../../store/tourStore';
import { useUiStore } from '../../../store/uiStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { fonts, useTheme } from '../../../theme';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

function CyberRow({
  label,
  hint,
  value,
  onValueChange,
  activeColor,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeColor?: string;
}) {
  const { colors, light } = useTheme();
  const switchActive = activeColor ?? (light ? '#DC2626' : '#FF4D6D');

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.muted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{
          true: switchActive,
          false: light ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.15)',
        }}
      />
    </View>
  );
}

export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { logout, deleteAccount, user, refreshUser } = useAuth();
  const { colors, light } = useTheme();

  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const streakEmoji = useUiStore((s) => s.streakEmoji);
  const setStreakEmoji = useUiStore((s) => s.setStreakEmoji);

  const settings = useSettingsStore((s) => s.settings);
  const blocked = useSettingsStore((s) => s.blocked);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const updatePref = useSettingsStore((s) => s.updatePref);
  const fetchBlocked = useSettingsStore((s) => s.fetchBlocked);
  const unblockUser = useSettingsStore((s) => s.unblockUser);

  const refreshControl = useRefreshControl(async () => {
    if (!user) return;
    await Promise.all([refreshUser(), fetchSettings(user.id), fetchBlocked(user.id)]);
  });

  const [out, setOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'none' | 'confirm' | 'type'>('none');
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  useEffect(() => {
    if (user) {
      fetchSettings(user.id);
      fetchBlocked(user.id);
    }
  }, [user, fetchSettings, fetchBlocked]);

  const avatarSrc = user?.avatarUri
    ? { uri: user.avatarUri }
    : user?.avatarId
    ? getCyberAvatarSource(user.avatarId)
    : brandLogo;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => goBackOrHome(nav)} style={styles.headerBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.headerCutBox}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>

        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* User Profile Card */}
        <Pressable onPress={() => nav.navigate('Profile', {})} accessibilityRole="button" style={{ marginBottom: 20 }}>
          <CyberCutBox
            cutSize={10}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.profileCardCut}
          >
            <View style={styles.profileCardInner}>
              <CutAvatar source={avatarSrc} size={48} cut={12} borderColor={colors.electricAccent} borderWidth={1.5} fill={colors.surfaceElevated} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: colors.text }]}>{user?.displayName ?? 'Player'}</Text>
                <Text style={[styles.profileUser, { color: colors.muted }]}>@{user?.username ?? 'reaper'}</Text>
              </View>
              <Text style={[styles.editLinkText, { color: colors.electricAccent }]}>Edit</Text>
            </View>
          </CyberCutBox>
        </Pressable>

        {/* Section: Appearance */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Appearance</Text>
        <CyberCutBox
          cutSize={10}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.cardCut}
        >
          <View style={styles.cardInner}>
            <CyberRow
              label="Light mode"
              hint="Cool white surfaces, teal accents"
              value={theme === 'light'}
              onValueChange={(v) => setTheme(v ? 'light' : 'dark')}
              activeColor={colors.electricAccent}
            />
          </View>
        </CyberCutBox>

        {/* Section: Chat streak */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Chat streak</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Cyborg is the default. Tap an icon — it shows on DMs.</Text>

        <CyberCutBox
          cutSize={12}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.cardCut}
        >
          <View style={styles.streakGridWrap}>
            {streakOptions.map((o) => {
              const on = streakEmoji === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setStreakEmoji(o.id)}
                  style={styles.streakTouch}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <CyberCutBox
                    cutSize={6}
                    radius={6}
                    fill={
                      on
                        ? colors.cardFillActive
                        : light
                        ? 'rgba(15, 23, 42, 0.04)'
                        : 'rgba(255, 255, 255, 0.04)'
                    }
                    borderColor={
                      on
                        ? colors.cardBorderActive
                        : light
                        ? 'rgba(15, 23, 42, 0.08)'
                        : 'rgba(255, 255, 255, 0.08)'
                    }
                    borderWidth={on ? 1.5 : 1}
                    style={styles.streakCut}
                  >
                    <View style={styles.streakInner}>
                      <Text style={{ fontSize: 24 }}>{o.emoji}</Text>
                      <Text
                        style={[
                          styles.streakLabel,
                          { color: on ? (light ? colors.plum : '#FFFFFF') : colors.muted },
                        ]}
                        numberOfLines={1}
                      >
                        {o.label}
                      </Text>
                    </View>
                  </CyberCutBox>
                </Pressable>
              );
            })}
          </View>
        </CyberCutBox>

        {/* Section: Notifications */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Notifications</Text>
        <CyberCutBox
          cutSize={10}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.cardCut}
        >
          <View style={styles.cardInner}>
            <CyberRow
              label="Chat"
              hint="DMs and rooms"
              value={settings?.notify_chat ?? true}
              onValueChange={(v) => user && updatePref(user.id, 'notify_chat', v)}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <CyberRow
              label="Events"
              hint="RSVPs and reminders"
              value={settings?.notify_events ?? true}
              onValueChange={(v) => user && updatePref(user.id, 'notify_events', v)}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <CyberRow
              label="Demos"
              hint="Comments on your slices"
              value={settings?.notify_demos ?? false}
              onValueChange={(v) => user && updatePref(user.id, 'notify_demos', v)}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <CyberRow
              label="Bookings"
              hint="Expert office hours"
              value={settings?.notify_bookings ?? true}
              onValueChange={(v) => user && updatePref(user.id, 'notify_bookings', v)}
            />
          </View>
        </CyberCutBox>

        {/* Section: Privacy */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Privacy</Text>
        <CyberCutBox
          cutSize={10}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.cardCut}
        >
          <View style={styles.cardInner}>
            <CyberRow
              label="Discoverable in Network"
              hint="People can find you by skill"
              value={settings?.discoverable ?? true}
              onValueChange={(v) => user && updatePref(user.id, 'discoverable', v)}
              activeColor={colors.electricAccent}
            />
          </View>
        </CyberCutBox>

        {/* Section: Blocked */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Blocked</Text>
        <CyberCutBox
          cutSize={10}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.cardCut}
        >
          <View style={styles.cardInner}>
            {blocked.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.muted }]}>No blocked users.</Text>
            ) : null}
            {blocked.map((b, index) => (
              <React.Fragment key={b.id}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{b.displayName}</Text>
                  <Pressable
                    onPress={() => user && unblockUser(user.id, b.id)}
                    accessibilityRole="button"
                    style={styles.unblockBtn}
                  >
                    <Text style={[styles.cyanLinkText, { color: colors.electricAccent }]}>Unblock</Text>
                  </Pressable>
                </View>
              </React.Fragment>
            ))}
          </View>
        </CyberCutBox>

        {/* Section: Account */}
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Account</Text>
        <CyberCutBox
          cutSize={10}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.cardCut}
        >
          <View style={styles.cardInner}>
            <Pressable onPress={() => nav.navigate('Subscription')} style={styles.row} accessibilityRole="button">
              <Text style={[styles.rowLabel, { color: colors.text }]}>Subscription</Text>
              <Text style={[styles.cyanLinkText, { color: colors.electricAccent }]}>Manage</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable onPress={() => nav.navigate('Support')} style={styles.row} accessibilityRole="button">
              <Text style={[styles.rowLabel, { color: colors.text }]}>Support</Text>
              <Text style={[styles.cyanLinkText, { color: colors.electricAccent }]}>Open</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable onPress={() => useTourStore.getState().start()} style={styles.row} accessibilityRole="button">
              <Text style={[styles.rowLabel, { color: colors.text }]}>App tour</Text>
              <Text style={[styles.cyanLinkText, { color: colors.electricAccent }]}>Replay</Text>
            </Pressable>
            {user?.isAdmin ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Pressable onPress={() => nav.navigate('AdminConsole' as never)} style={styles.row} accessibilityRole="button">
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Back to Admin Console</Text>
                  <Text style={[styles.cyanLinkText, { color: colors.electricAccent }]}>Open</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </CyberCutBox>

        {/* Log Out Button */}
        <Pressable
          onPress={() => setOut(true)}
          style={styles.actionBtnTouch}
          accessibilityRole="button"
        >
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={light ? 'rgba(254, 242, 242, 0.85)' : 'rgba(40, 15, 25, 0.6)'}
            borderColor={light ? 'rgba(220, 38, 38, 0.35)' : 'rgba(255, 77, 109, 0.6)'}
            borderWidth={1}
            style={styles.actionBtnCut}
          >
            <View style={styles.actionBtnInner}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>Log out</Text>
            </View>
          </CyberCutBox>
        </Pressable>

        {/* Section: Danger zone */}
        <Text style={[styles.sectionHeader, { color: colors.danger }]}>Danger zone</Text>
        <Pressable
          onPress={() => setDeleteStep('confirm')}
          style={[styles.actionBtnTouch, { marginTop: 0 }]}
          accessibilityRole="button"
        >
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={light ? 'rgba(254, 242, 242, 0.85)' : 'rgba(40, 15, 25, 0.6)'}
            borderColor={light ? 'rgba(220, 38, 38, 0.35)' : 'rgba(255, 77, 109, 0.6)'}
            borderWidth={1}
            style={styles.actionBtnCut}
          >
            <View style={styles.actionBtnInner}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>Delete account</Text>
            </View>
          </CyberCutBox>
        </Pressable>
      </KeyboardAwareScrollView>

      {/* Confirmation Sheets & Modals */}
      <ConfirmSheet
        visible={out}
        title="Log out?"
        body="You’ll need to sign in again on this device."
        confirmLabel="Log out"
        danger={false}
        onClose={() => setOut(false)}
        onConfirm={async () => {
          setOut(false);
          await logout();
        }}
      />

      <ConfirmSheet
        visible={deleteStep === 'confirm'}
        title="Delete your account?"
        body="This permanently deletes your profile, demos, messages, bookings, and everything else tied to your account. This can't be undone."
        confirmLabel="Continue"
        onClose={() => setDeleteStep('none')}
        onConfirm={() => {
          setDeleteTyped('');
          setDeleteErr('');
          setDeleteStep('type');
        }}
      />

      <Modal visible={deleteStep === 'type'} transparent animationType="fade" onRequestClose={() => setDeleteStep('none')}>
        <Pressable style={styles.deleteBackdrop} onPress={() => setDeleteStep('none')}>
          <Pressable
            style={[
              styles.deleteSheet,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: light ? 'rgba(220, 38, 38, 0.4)' : 'rgba(255, 77, 109, 0.4)',
              },
            ]}
            onPress={() => undefined}
          >
            <Text style={[styles.deleteTitle, { color: colors.danger }]}>Last step</Text>
            <Text style={[styles.deleteBody, { color: colors.muted }]}>
              Type your username (<Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{user?.username}</Text>) to confirm.
            </Text>
            <AuthTextField label="Username" value={deleteTyped} onChangeText={setDeleteTyped} autoCapitalize="none" />
            {deleteErr ? <InlineErrorText message={deleteErr} /> : null}
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label={deleting ? 'Deleting…' : 'Permanently delete my account'}
                loading={deleting}
                disabled={deleting || deleteTyped.trim().toLowerCase() !== (user?.username ?? '').toLowerCase()}
                onPress={async () => {
                  setDeleting(true);
                  setDeleteErr('');
                  try {
                    await deleteAccount();
                    setDeleteStep('none');
                  } catch (e) {
                    setDeleteErr(e instanceof Error ? e.message : 'Could not delete account');
                  } finally {
                    setDeleting(false);
                  }
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
  },
  headerCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  profileCardCut: {
    width: '100%',
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileUser: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#8E9BB5',
    marginTop: 2,
  },
  editLinkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#00E5FF',
  },
  sectionHeader: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
    marginBottom: 10,
  },
  cardCut: {
    width: '100%',
  },
  cardInner: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 4,
  },
  rowLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  rowHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#8E9BB5',
    paddingVertical: 12,
  },
  unblockBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cyanLinkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: '#00E5FF',
  },
  streakGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
  },
  streakTouch: {
    width: '23%',
    height: 72,
  },
  streakCut: {
    width: '100%',
    height: '100%',
  },
  streakInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  streakLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    textAlign: 'center',
  },
  actionBtnTouch: {
    width: '100%',
    height: 48,
    marginTop: 24,
    marginBottom: 12,
  },
  actionBtnCut: {
    width: '100%',
    height: '100%',
  },
  actionBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FF4D6D',
    letterSpacing: 0.5,
  },
  deleteBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  deleteSheet: {
    borderRadius: 12,
    padding: 24,
    backgroundColor: '#0E1423',
    borderColor: 'rgba(255, 77, 109, 0.4)',
    borderWidth: 1,
  },
  deleteTitle: {
    color: '#FF4D6D',
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  deleteBody: {
    color: '#8E9BB5',
    fontFamily: fonts.body,
    marginBottom: 16,
    lineHeight: 20,
  },
});

