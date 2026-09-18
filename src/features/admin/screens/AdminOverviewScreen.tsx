import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import type { AdminTabParamList, RootStackParamList } from '../../../navigation/types';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Screen } from '../../../components/layout/Screen';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAdminStore } from '../../../store/adminStore';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { Role } from '../../../types/user';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<AdminTabParamList>, NativeStackNavigationProp<RootStackParamList>>;

const ROLE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  gamer: 'game-controller',
  developer: 'code-slash',
  expert: 'ribbon',
};

export function AdminOverviewScreen() {
  const nav = useNavigation<Nav>();
  const { colors, isDark } = useTheme();
  const { logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const summary = useAdminStore((s) => s.summary);
  const error = useAdminStore((s) => s.error);
  const fetchSummary = useAdminStore((s) => s.fetchSummary);
  const pendingGamers = useAdminStore((s) => s.pendingGamers);
  const pendingDevelopers = useAdminStore((s) => s.pendingDevelopers);
  const pendingExperts = useAdminStore((s) => s.pendingExperts);
  const fetchPendingGamers = useAdminStore((s) => s.fetchPendingGamers);
  const fetchPendingDevelopers = useAdminStore((s) => s.fetchPendingDevelopers);
  const fetchPendingExperts = useAdminStore((s) => s.fetchPendingExperts);
  const setUserFilters = useAdminStore((s) => s.setUserFilters);

  useEffect(() => {
    fetchSummary();
    fetchPendingGamers();
    fetchPendingDevelopers();
    fetchPendingExperts();
  }, [fetchSummary, fetchPendingGamers, fetchPendingDevelopers, fetchPendingExperts]);

  const refreshControl = useRefreshControl(() =>
    Promise.all([fetchSummary(), fetchPendingGamers(), fetchPendingDevelopers(), fetchPendingExperts()]),
  );

  const pendingTotal = pendingGamers.length + pendingDevelopers.length + pendingExperts.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <Screen refreshControl={refreshControl}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.wordmark, { color: colors.primary }]}>REAPERS · OPS</Text>
            <Text style={[styles.title, { color: colors.text }]}>Admin Console</Text>
          </View>
          <View style={styles.badgeWrap}>
            <LinearGradient colors={['#00E5FF', '#D83CFF']} style={styles.badge}>
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </View>

        {error ? <RetryBanner message={error} onRetry={fetchSummary} /> : null}

        {pendingTotal > 0 ? (
          <Pressable onPress={() => nav.navigate('AdminApprovals')} accessibilityRole="button" style={{ marginBottom: 14 }}>
            <CyberCutBox
              cutSize={10}
              radius={8}
              fill={isDark ? 'rgba(0, 229, 255, 0.12)' : 'rgba(8, 145, 178, 0.12)'}
              borderColor={isDark ? 'rgba(0, 229, 255, 0.6)' : 'rgba(8, 145, 178, 0.4)'}
              borderWidth={1}
              style={{ width: '100%' }}
            >
              <View style={styles.alertInner}>
                <View style={[styles.alertIcon, { backgroundColor: isDark ? 'rgba(0, 229, 255, 0.2)' : 'rgba(8, 145, 178, 0.15)' }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{pendingTotal} awaiting approval</Text>
                  <Text style={[styles.alertSub, { color: colors.muted }]}>Open the Approvals tab to review them</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
            </CyberCutBox>
          </Pressable>
        ) : null}

        <View style={styles.statRow}>
          <CyberCutBox
            cutSize={10}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.statCut}
          >
            <View style={styles.statInner}>
              <View style={[styles.statIconCyan, { backgroundColor: isDark ? 'rgba(0, 229, 255, 0.15)' : 'rgba(8, 145, 178, 0.12)' }]}>
                <Ionicons name="people" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{summary?.totalUsers ?? '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Total users</Text>
            </View>
          </CyberCutBox>

          <CyberCutBox
            cutSize={10}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.statCut}
          >
            <View style={styles.statInner}>
              <View style={styles.statIconPink}>
                <Ionicons name="card" size={18} color="#D83CFF" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{summary?.activeSubscriptions ?? '—'}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Active subscriptions</Text>
            </View>
          </CyberCutBox>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text }]}>By role</Text>
        <CyberCutBox
          cutSize={12}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={{ width: '100%' }}
        >
          <View style={styles.cardInner}>
            {(summary?.roleBreakdown ?? []).map((r, i) => (
              <Pressable
                key={r.role}
                onPress={() => {
                  setUserFilters({ role: r.role as Role });
                  nav.navigate('AdminUsersTab');
                }}
                accessibilityRole="button"
              >
                <View style={[styles.roleRow, i > 0 && [styles.roleDivider, { borderTopColor: colors.border }]]}>
                  <View style={styles.roleRowLeft}>
                    <View style={[styles.roleIcon, { backgroundColor: colors.surfaceElevated }]}>
                      <Ionicons name={ROLE_ICON[r.role] ?? 'person'} size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.roleText, { color: colors.text }]}>{r.role}</Text>
                  </View>
                  <View style={styles.roleRowRight}>
                    <Text style={[styles.roleCount, { color: colors.muted }]}>{r.count}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted2} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </CyberCutBox>

        <Pressable
          onPress={() => nav.navigate('Main')}
          style={styles.memberBtnTouch}
          accessibilityRole="button"
        >
          <CyberCutBox
            cutSize={8}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={{ width: '100%', height: 48 }}
          >
            <View style={styles.btnInner}>
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.memberBtnText, { color: colors.primary }]}>View as member</Text>
            </View>
          </CyberCutBox>
        </Pressable>

        <Pressable
          onPress={() => setConfirmingLogout(true)}
          style={styles.memberBtnTouch}
          accessibilityRole="button"
        >
          <CyberCutBox
            cutSize={8}
            radius={6}
            fill={isDark ? 'rgba(40, 15, 25, 0.6)' : 'rgba(254, 226, 226, 0.6)'}
            borderColor={isDark ? 'rgba(255, 77, 109, 0.6)' : 'rgba(239, 68, 68, 0.4)'}
            borderWidth={1}
            style={{ width: '100%', height: 48 }}
          >
            <View style={styles.btnInner}>
              <Ionicons name="log-out-outline" size={16} color="#FF4D6D" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Log out</Text>
            </View>
          </CyberCutBox>
        </Pressable>

        <ConfirmSheet
          visible={confirmingLogout}
          title="Log out?"
          body="You’ll need to sign in again on this device."
          confirmLabel="Log out"
          danger={false}
          onClose={() => setConfirmingLogout(false)}
          onConfirm={async () => {
            setConfirmingLogout(false);
            await logout();
          }}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  wordmark: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: '#00E5FF',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  badgeWrap: {
    width: 40,
    height: 40,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  alertSub: {
    color: '#8E9BB5',
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCut: {
    flex: 1,
    height: 110,
  },
  statInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
  },
  statIconCyan: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconPink: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(216, 60, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#8E9BB5',
  },
  sectionHeader: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 10,
  },
  cardInner: {
    paddingHorizontal: 14,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
  },
  roleDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  roleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  roleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleCount: {
    color: '#8E9BB5',
    fontFamily: fonts.mono,
    fontSize: 13,
  },
  memberBtnTouch: {
    width: '100%',
    height: 48,
    marginTop: 14,
  },
  btnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBtnText: {
    color: '#00E5FF',
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  logoutBtnText: {
    color: '#FF4D6D',
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
  },
});

