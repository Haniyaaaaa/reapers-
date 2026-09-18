import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminStackParamList } from '../../../navigation/types';
import { BladeCard } from '../../../components/cards/BladeCard';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAdminStore } from '../../../store/adminStore';
import { fonts, radius, useTheme } from '../../../theme';

function Field({ label, value }: { label: string; value?: string | null }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const ALL_ROLES = ['gamer', 'developer', 'expert'] as const;

export function AdminUserDetailScreen() {
  const { params } = useRoute<RouteProp<AdminStackParamList, 'AdminUserDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors } = useTheme();
  const detail = useAdminStore((s) => s.userDetail[params.id]);
  const storeError = useAdminStore((s) => s.error);
  const fetchUserDetail = useAdminStore((s) => s.fetchUserDetail);
  const approveAccount = useAdminStore((s) => s.approveAccount);
  const rejectAccount = useAdminStore((s) => s.rejectAccount);
  const adminUpdateProfile = useAdminStore((s) => s.adminUpdateProfile);
  const approveExpert = useAdminStore((s) => s.approveExpert);
  const rejectExpert = useAdminStore((s) => s.rejectExpert);
  const cancelUserSubscription = useAdminStore((s) => s.cancelUserSubscription);
  const grantSubscription = useAdminStore((s) => s.grantSubscription);
  const extendSubscription = useAdminStore((s) => s.extendSubscription);
  const plans = useAdminStore((s) => s.plans);
  const fetchPlans = useAdminStore((s) => s.fetchPlans);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [rejectingExpert, setRejectingExpert] = useState(false);
  const [expertReason, setExpertReason] = useState('');
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPortfolio, setEditPortfolio] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [editGames, setEditGames] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [granting, setGranting] = useState(false);
  const [grantPlanId, setGrantPlanId] = useState<string | null>(null);
  const [grantDays, setGrantDays] = useState('30');
  const [grantErr, setGrantErr] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);

  const [extending, setExtending] = useState(false);
  const [extendDays, setExtendDays] = useState('30');
  const [extendErr, setExtendErr] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);

  useEffect(() => {
    fetchUserDetail(params.id);
    fetchPlans();
  }, [params.id, fetchUserDetail, fetchPlans]);

  const openGrant = () => {
    setGrantPlanId(plans.find((p) => p.is_active)?.id ?? plans[0]?.id ?? null);
    setGrantDays('30');
    setGrantErr('');
    setGranting(true);
  };

  const submitGrant = async () => {
    const days = Number(grantDays);
    if (!grantPlanId) {
      setGrantErr('Pick a plan');
      return;
    }
    if (!Number.isInteger(days) || days <= 0) {
      setGrantErr('Enter a whole number of days');
      return;
    }
    setGrantBusy(true);
    setGrantErr('');
    try {
      await grantSubscription(params.id, grantPlanId, days);
      setGranting(false);
    } catch (e) {
      setGrantErr(e instanceof Error ? e.message : 'Could not grant subscription');
    } finally {
      setGrantBusy(false);
    }
  };

  const openExtend = () => {
    setExtendDays('30');
    setExtendErr('');
    setExtending(true);
  };

  const submitExtend = async () => {
    if (!detail?.subscription) return;
    const days = Number(extendDays);
    if (!Number.isInteger(days) || days <= 0) {
      setExtendErr('Enter a whole number of days');
      return;
    }
    setExtendBusy(true);
    setExtendErr('');
    try {
      await extendSubscription(detail.subscription.id, days, params.id);
      setExtending(false);
    } catch (e) {
      setExtendErr(e instanceof Error ? e.message : 'Could not extend subscription');
    } finally {
      setExtendBusy(false);
    }
  };

  const startEditing = () => {
    if (!detail) return;
    const { profile } = detail;
    setEditBio(profile.bio);
    setEditLocation(profile.location ?? '');
    setEditPhone(profile.phone ?? '');
    setEditPortfolio(profile.portfolio_url ?? '');
    setEditLinkedin(profile.linkedin_url ?? '');
    setEditSkills(profile.skills.join(', '));
    setEditGames(profile.games.join(', '));
    setEditRoles(profile.roles);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await adminUpdateProfile(params.id, {
        bio: editBio,
        location: editLocation || null,
        phone: editPhone || null,
        portfolio_url: editPortfolio || null,
        linkedin_url: editLinkedin || null,
        skills: editSkills.split(',').map((s) => s.trim()).filter(Boolean),
        games: editGames.split(',').map((s) => s.trim()).filter(Boolean),
        roles: editRoles as ('gamer' | 'developer' | 'expert')[],
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!detail) {
    return (
      <Screen>
        <ScreenHeader title="User" onBack={() => nav.goBack()} />
        <Skeleton width="100%" height={200} />
      </Screen>
    );
  }

  const { profile, email, expert, subscription, ticketCount } = detail;

  return (
    <Screen>
      <ScreenHeader title={profile.display_name} onBack={() => nav.goBack()} />
      {storeError ? <InlineErrorText message={storeError} /> : null}

      <BladeCard style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.h, { color: colors.text }]}>Profile</Text>
          <Pressable onPress={editing ? () => setEditing(false) : startEditing} accessibilityRole="button">
            <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>{editing ? 'Cancel' : 'Edit profile'}</Text>
          </Pressable>
        </View>

        {editing ? (
          <>
            <View style={styles.roleChipRow}>
              {ALL_ROLES.map((r) => {
                const on = editRoles.includes(r);
                return (
                  <Pressable
                    key={r}
                    onPress={() => setEditRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))}
                    style={[styles.roleChip, { borderColor: on ? colors.cyan : colors.border, backgroundColor: on ? colors.surfaceElevated : 'transparent' }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={{ color: on ? colors.cyan : colors.muted, fontFamily: fonts.bodyMed, fontSize: 12, textTransform: 'capitalize' }}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
            <AuthTextField label="Bio" value={editBio} onChangeText={setEditBio} multiline />
            <AuthTextField label="Location" value={editLocation} onChangeText={setEditLocation} />
            <AuthTextField label="Phone" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <AuthTextField label="Portfolio" value={editPortfolio} onChangeText={setEditPortfolio} autoCapitalize="none" />
            <AuthTextField label="LinkedIn" value={editLinkedin} onChangeText={setEditLinkedin} autoCapitalize="none" />
            <AuthTextField label="Skills (comma-separated)" value={editSkills} onChangeText={setEditSkills} />
            <AuthTextField label="Games (comma-separated)" value={editGames} onChangeText={setEditGames} />
            <PrimaryButton label="Save changes" onPress={saveEdit} loading={saving} disabled={saving} />
          </>
        ) : (
          <>
            <Field label="Username" value={`@${profile.username}`} />
            <Field label="Name" value={`${profile.first_name} ${profile.last_name}`.trim()} />
            <Field label="Email" value={email} />
            <Field label="Phone" value={profile.phone} />
            <Field label="Location" value={profile.location} />
            <Field label="Bio" value={profile.bio} />
            <Field label="Roles" value={profile.roles.join(', ') || 'none'} />
            <Field label="Games" value={profile.games.join(', ')} />
            <Field label="Skills" value={profile.skills.join(', ')} />
            <Field label="Tags" value={profile.tags.join(', ')} />
            <Field label="Portfolio" value={profile.portfolio_url} />
            <Field label="LinkedIn" value={profile.linkedin_url} />
            <Field label="Support tickets" value={String(ticketCount)} />
          </>
        )}

        <View style={styles.statusRow}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Approval status</Text>
          <Text
            style={{
              color: profile.approval_status === 'approved' ? colors.cyan : profile.approval_status === 'rejected' ? colors.danger : colors.text,
              fontFamily: fonts.bodySemi,
              textTransform: 'capitalize',
            }}
          >
            {profile.approval_status}
          </Text>
        </View>
        {profile.approval_status === 'rejected' && profile.approval_rejection_reason ? (
          <Field label="Rejection reason" value={profile.approval_rejection_reason} />
        ) : null}

        {profile.approval_status === 'pending' ? (
          <View style={styles.actions}>
            <Pressable
              onPress={async () => {
                setBusy(true);
                await approveAccount(profile.id);
                setBusy(false);
              }}
              style={[styles.btn, { borderColor: colors.cyan }]}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Approve</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setReason('');
                setRejecting(true);
              }}
              style={[styles.btn, { borderColor: colors.danger }]}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed }}>Reject</Text>
            </Pressable>
          </View>
        ) : null}

        {profile.approval_status === 'approved' ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                setReason('');
                setRejecting(true);
              }}
              style={[styles.btn, { borderColor: colors.danger }]}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed }}>Suspend account</Text>
            </Pressable>
          </View>
        ) : null}
      </BladeCard>

      {expert ? (
        <BladeCard style={styles.card}>
          <Text style={[styles.h, { color: colors.text }]}>Expert application</Text>
          <Field label="Role" value={expert.role} />
          <Field label="Company" value={expert.company} />
          <Field label="Bio" value={expert.bio} />
          <Field label="Specialties" value={expert.specialties.join(', ')} />
          <Field label="Years experience" value={expert.years_experience != null ? String(expert.years_experience) : undefined} />
          <Field label="Portfolio" value={expert.portfolio_url} />
          <Field label="LinkedIn" value={expert.linkedin_url} />
          {!expert.verified && expert.rejection_reason ? <Field label="Rejection reason" value={expert.rejection_reason} /> : null}
          <View style={styles.statusRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Verified</Text>
            <Text style={{ color: expert.verified ? colors.cyan : colors.muted, fontFamily: fonts.bodySemi }}>{expert.verified ? 'Yes' : 'No'}</Text>
          </View>
          {!expert.verified ? (
            <View style={styles.actions}>
              <Pressable onPress={() => approveExpert(profile.id)} style={[styles.btn, { borderColor: colors.cyan }]} accessibilityRole="button">
                <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Approve expert</Text>
              </Pressable>
              <Pressable onPress={() => setRejectingExpert(true)} style={[styles.btn, { borderColor: colors.danger }]} accessibilityRole="button">
                <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed }}>Reject expert</Text>
              </Pressable>
            </View>
          ) : null}
        </BladeCard>
      ) : null}

      <BladeCard style={styles.card}>
        <Text style={[styles.h, { color: colors.text }]}>Subscription</Text>
        {subscription ? (
          <>
            <Field label="Plan" value={subscription.plan?.name} />
            <Field
              label="Price"
              value={subscription.plan ? `Rs ${subscription.plan.price.toFixed(0)} / ${subscription.plan.billing_interval}` : undefined}
            />
            <Field label="Expires" value={subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Never'} />
            <View style={styles.statusRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Status</Text>
              <Text style={{ color: subscription.status === 'active' ? colors.cyan : colors.muted, fontFamily: fonts.bodySemi, textTransform: 'capitalize' }}>
                {subscription.status}
              </Text>
            </View>
            {subscription.status === 'active' ? (
              <View style={styles.actions}>
                <Pressable onPress={openExtend} style={[styles.btn, { borderColor: colors.cyan }]} accessibilityRole="button">
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Extend</Text>
                </Pressable>
                <Pressable
                  onPress={() => cancelUserSubscription(subscription.id)}
                  style={[styles.btn, { borderColor: colors.danger }]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed }}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={openGrant} style={[styles.btn, { borderColor: colors.cyan, marginTop: 10 }]} accessibilityRole="button">
                <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Grant subscription</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 10 }}>No active subscription.</Text>
            <Pressable onPress={openGrant} style={[styles.btn, { borderColor: colors.cyan }]} accessibilityRole="button">
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Grant subscription</Text>
            </Pressable>
          </>
        )}
      </BladeCard>

      <Modal visible={rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setRejecting(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>
              {profile.approval_status === 'approved' ? 'Suspend' : 'Reject'} {profile.username}?
            </Text>
            <AuthTextField label="Reason (shown to the user)" value={reason} onChangeText={setReason} multiline />
            <PrimaryButton
              label={profile.approval_status === 'approved' ? 'Suspend' : 'Reject'}
              onPress={async () => {
                setBusy(true);
                await rejectAccount(profile.id, reason.trim());
                setBusy(false);
                setRejecting(false);
              }}
              disabled={!reason.trim() || busy}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={rejectingExpert} transparent animationType="fade" onRequestClose={() => setRejectingExpert(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setRejectingExpert(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>Reject expert application?</Text>
            <AuthTextField label="Reason (shown to the applicant)" value={expertReason} onChangeText={setExpertReason} multiline />
            <PrimaryButton
              label="Reject"
              onPress={async () => {
                setBusy(true);
                await rejectExpert(profile.id, expertReason.trim());
                setBusy(false);
                setRejectingExpert(false);
                setExpertReason('');
              }}
              disabled={!expertReason.trim() || busy}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={granting} transparent animationType="fade" onRequestClose={() => setGranting(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setGranting(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>Grant subscription</Text>
            <Text style={[styles.fieldLabel, { color: colors.muted, marginBottom: 8 }]}>Plan</Text>
            <View style={styles.roleChipRow}>
              {plans.map((p) => {
                const on = grantPlanId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setGrantPlanId(p.id)}
                    style={[styles.roleChip, { borderColor: on ? colors.cyan : colors.border, backgroundColor: on ? colors.surfaceElevated : 'transparent' }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={{ color: on ? colors.cyan : colors.muted, fontFamily: fonts.bodyMed, fontSize: 12 }}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {plans.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginBottom: 8 }}>No plans yet — create one in Billing first.</Text> : null}
            <AuthTextField label="Duration (days)" value={grantDays} onChangeText={setGrantDays} keyboardType="number-pad" />
            {grantErr ? <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginBottom: 8 }}>{grantErr}</Text> : null}
            <PrimaryButton label="Grant" onPress={submitGrant} loading={grantBusy} disabled={grantBusy || !grantPlanId} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={extending} transparent animationType="fade" onRequestClose={() => setExtending(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setExtending(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>Extend subscription</Text>
            <AuthTextField label="Add days" value={extendDays} onChangeText={setExtendDays} keyboardType="number-pad" />
            {extendErr ? <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginBottom: 8 }}>{extendErr}</Text> : null}
            <PrimaryButton label="Extend" onPress={submitExtend} loading={extendBusy} disabled={extendBusy} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  h: { fontFamily: fonts.display, fontSize: 18 },
  roleChipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleChip: { minHeight: 32, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderRadius: radius.md },
  field: { marginBottom: 8 },
  fieldLabel: { fontFamily: fonts.bodyMed, fontSize: 11, textTransform: 'uppercase' },
  fieldValue: { fontFamily: fonts.body, fontSize: 14, marginTop: 2 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderRadius: radius.md },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: radius.lg, padding: 20 },
});
