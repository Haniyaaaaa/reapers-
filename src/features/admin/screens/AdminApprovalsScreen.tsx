import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AdminStackParamList, AdminTabParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAdminStore } from '../../../store/adminStore';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { PendingApprovalList } from '../components/PendingApprovalList';

const SEGMENTS = ['Gamers', 'Developers', 'Experts'] as const;
type Segment = (typeof SEGMENTS)[number];

type Nav = CompositeNavigationProp<BottomTabNavigationProp<AdminTabParamList>, NativeStackNavigationProp<AdminStackParamList>>;

export function AdminApprovalsScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [segment, setSegment] = useState<Segment>('Gamers');

  const pendingGamers = useAdminStore((s) => s.pendingGamers);
  const pendingGamersHasMore = useAdminStore((s) => s.pendingGamersHasMore);
  const fetchPendingGamers = useAdminStore((s) => s.fetchPendingGamers);
  const loadMorePendingGamers = useAdminStore((s) => s.loadMorePendingGamers);

  const pendingDevelopers = useAdminStore((s) => s.pendingDevelopers);
  const pendingDevelopersHasMore = useAdminStore((s) => s.pendingDevelopersHasMore);
  const fetchPendingDevelopers = useAdminStore((s) => s.fetchPendingDevelopers);
  const loadMorePendingDevelopers = useAdminStore((s) => s.loadMorePendingDevelopers);

  const pendingExperts = useAdminStore((s) => s.pendingExperts);
  const pendingExpertsHasMore = useAdminStore((s) => s.pendingExpertsHasMore);
  const fetchPendingExperts = useAdminStore((s) => s.fetchPendingExperts);
  const loadMorePendingExperts = useAdminStore((s) => s.loadMorePendingExperts);
  const verifiedExperts = useAdminStore((s) => s.verifiedExperts);
  const verifiedExpertsHasMore = useAdminStore((s) => s.verifiedExpertsHasMore);
  const fetchVerifiedExperts = useAdminStore((s) => s.fetchVerifiedExperts);
  const loadMoreVerifiedExperts = useAdminStore((s) => s.loadMoreVerifiedExperts);

  const approveAccount = useAdminStore((s) => s.approveAccount);
  const rejectAccount = useAdminStore((s) => s.rejectAccount);
  const approveExpert = useAdminStore((s) => s.approveExpert);
  const rejectExpert = useAdminStore((s) => s.rejectExpert);
  const storeError = useAdminStore((s) => s.error);

  useEffect(() => {
    fetchPendingGamers();
    fetchPendingDevelopers();
    fetchPendingExperts();
    fetchVerifiedExperts();
  }, [fetchPendingGamers, fetchPendingDevelopers, fetchPendingExperts, fetchVerifiedExperts]);

  const refreshControl = useRefreshControl(() =>
    Promise.all([fetchPendingGamers(), fetchPendingDevelopers(), fetchPendingExperts(), fetchVerifiedExperts()]),
  );

  const [rejectingExpertId, setRejectingExpertId] = useState<string | null>(null);
  const [expertRejectReason, setExpertRejectReason] = useState('');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <Screen refreshControl={refreshControl}>
        <Text style={[styles.title, { color: colors.text }]}>Approvals</Text>
        {storeError ? <InlineErrorText message={storeError} /> : null}

        {/* Segment selector chips */}
        <View style={styles.segmentRow}>
          {SEGMENTS.map((s) => {
            const on = segment === s;
            const count = s === 'Gamers' ? pendingGamers.length : s === 'Developers' ? pendingDevelopers.length : pendingExperts.length;
            return (
              <Pressable
                key={s}
                onPress={() => setSegment(s)}
                style={styles.segmentBtnTouch}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <CyberCutBox
                  gradient={on}
                  cutSize={6}
                  radius={4}
                  fill={on ? undefined : colors.cardFill}
                  borderColor={on ? undefined : colors.cardBorder}
                  borderWidth={on ? 0 : 0.88}
                  style={{ width: '100%', height: 38 }}
                >
                  <View style={styles.segmentInner}>
                    <Text style={[styles.segmentText, { color: on ? '#FFFFFF' : colors.muted }, on && styles.segmentTextActive]}>
                      {s}
                      {count > 0 ? ` (${count})` : ''}
                    </Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            );
          })}
        </View>

        {segment === 'Gamers' ? (
          <PendingApprovalList
            people={pendingGamers}
            onApprove={approveAccount}
            onReject={rejectAccount}
            onViewDetails={(id) => nav.navigate('AdminUserDetail', { id })}
            emptyLabel="No pending gamer accounts."
            hasMore={pendingGamersHasMore}
            onLoadMore={loadMorePendingGamers}
          />
        ) : segment === 'Developers' ? (
          <PendingApprovalList
            people={pendingDevelopers}
            onApprove={approveAccount}
            onReject={rejectAccount}
            onViewDetails={(id) => nav.navigate('AdminUserDetail', { id })}
            emptyLabel="No pending developer accounts."
            hasMore={pendingDevelopersHasMore}
            onLoadMore={loadMorePendingDevelopers}
          />
        ) : (
          <>
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Pending Expert Applications</Text>
            {pendingExperts.length === 0 ? <Text style={[styles.emptyText, { color: colors.muted }]}>No pending expert applications.</Text> : null}
            {pendingExperts.map((exp) => (
              <View key={exp.id} style={{ marginBottom: 12 }}>
                <CyberCutBox
                  cutSize={12}
                  radius={8}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={0.88}
                  style={{ width: '100%' }}
                >
                  <View style={styles.cardInner}>
                    <Text style={[styles.nameText, { color: colors.text }]}>{exp.role || 'Applicant'}</Text>
                    <Text style={[styles.metaText, { color: colors.muted }]}>
                      {exp.company}
                    </Text>
                    <Text style={[styles.metaText, { color: colors.muted }]}>{exp.bio}</Text>
                    {exp.specialties.length ? <Text style={[styles.metaText, { color: colors.muted }]}>Specialties: {exp.specialties.join(', ')}</Text> : null}

                    <Pressable onPress={() => nav.navigate('AdminUserDetail', { id: exp.id })} accessibilityRole="button" style={{ marginTop: 6 }}>
                      <Text style={[styles.linkText, { color: colors.primary }]}>View user profile</Text>
                    </Pressable>

                    <View style={styles.actionsRow}>
                      <Pressable onPress={() => approveExpert(exp.id)} style={styles.actionBtnTouch} accessibilityRole="button">
                        <CyberCutBox gradient cutSize={6} radius={4} style={{ width: '100%', height: 38 }}>
                          <View style={styles.btnCenter}>
                            <Text style={styles.approveText}>Approve Expert</Text>
                          </View>
                        </CyberCutBox>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setExpertRejectReason('');
                          setRejectingExpertId(exp.id);
                        }}
                        style={styles.actionBtnTouch}
                        accessibilityRole="button"
                      >
                        <CyberCutBox
                          cutSize={6}
                          radius={4}
                          fill="rgba(40, 15, 25, 0.6)"
                          borderColor="rgba(255, 77, 109, 0.6)"
                          borderWidth={1}
                          style={{ width: '100%', height: 38 }}
                        >
                          <View style={styles.btnCenter}>
                            <Text style={styles.rejectText}>Reject</Text>
                          </View>
                        </CyberCutBox>
                      </Pressable>
                    </View>
                  </View>
                </CyberCutBox>
              </View>
            ))}
            <LoadMoreButton hasMore={pendingExpertsHasMore} onPress={loadMorePendingExperts} />

            <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 24 }]}>Verified Experts</Text>
            {verifiedExperts.length === 0 ? <Text style={[styles.emptyText, { color: colors.muted }]}>No verified experts yet.</Text> : null}
            {verifiedExperts.map((exp) => (
              <View key={exp.id} style={{ marginBottom: 12 }}>
                <CyberCutBox
                  cutSize={10}
                  radius={8}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={0.88}
                  style={{ width: '100%' }}
                >
                  <View style={styles.cardInner}>
                    <Text style={[styles.nameText, { color: colors.text }]}>{exp.role || 'Expert'}</Text>
                    <Text style={[styles.metaText, { color: colors.muted }]}>
                      {exp.role} at {exp.company}
                    </Text>
                    {exp.specialties.length ? <Text style={[styles.metaText, { color: colors.muted }]}>Specialties: {exp.specialties.join(', ')}</Text> : null}

                    <View style={styles.actionsRow}>
                      <Pressable onPress={() => nav.navigate('AdminUserDetail', { id: exp.id })} style={styles.actionBtnTouch} accessibilityRole="button">
                        <CyberCutBox
                          cutSize={6}
                          radius={4}
                          fill={colors.cardFill}
                          borderColor={colors.cardBorder}
                          borderWidth={0.88}
                          style={{ width: '100%', height: 38 }}
                        >
                          <View style={styles.btnCenter}>
                            <Text style={[styles.linkText, { color: colors.primary }]}>View details</Text>
                          </View>
                        </CyberCutBox>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setExpertRejectReason('');
                          setRejectingExpertId(exp.id);
                        }}
                        style={styles.actionBtnTouch}
                        accessibilityRole="button"
                      >
                        <CyberCutBox
                          cutSize={6}
                          radius={4}
                          fill="rgba(40, 15, 25, 0.6)"
                          borderColor="rgba(255, 77, 109, 0.6)"
                          borderWidth={1}
                          style={{ width: '100%', height: 38 }}
                        >
                          <View style={styles.btnCenter}>
                            <Text style={styles.rejectText}>Revoke Status</Text>
                          </View>
                        </CyberCutBox>
                      </Pressable>
                    </View>
                  </View>
                </CyberCutBox>
              </View>
            ))}
            <LoadMoreButton hasMore={verifiedExpertsHasMore} onPress={loadMoreVerifiedExperts} />
          </>
        )}

        {/* Modal for rejecting expert */}
        <Modal visible={!!rejectingExpertId} transparent animationType="fade" onRequestClose={() => setRejectingExpertId(null)}>
          <Pressable style={styles.backdrop} onPress={() => setRejectingExpertId(null)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.danger, borderWidth: 1 }]} onPress={() => undefined}>
              <Text style={styles.modalTitle}>Reject Expert Application?</Text>
              <AuthTextField label="Reason for rejection (shown to user)" value={expertRejectReason} onChangeText={setExpertRejectReason} multiline />
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  label="Reject application"
                  onPress={async () => {
                    if (!rejectingExpertId) return;
                    await rejectExpert(rejectingExpertId, expertRejectReason.trim());
                    setRejectingExpertId(null);
                  }}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentBtnTouch: {
    flex: 1,
    height: 38,
  },
  segmentInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: '#8E9BB5',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subSectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyText: {
    color: '#8E9BB5',
    fontFamily: fonts.body,
    marginBottom: 12,
  },
  cardInner: {
    padding: 14,
    gap: 4,
  },
  nameText: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#8E9BB5',
  },
  linkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: '#00E5FF',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtnTouch: {
    flex: 1,
    height: 38,
  },
  btnCenter: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FF4D6D',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalSheet: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#0E1423',
    borderColor: 'rgba(255, 77, 109, 0.4)',
    borderWidth: 1,
  },
  modalTitle: {
    color: '#FF4D6D',
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
});
