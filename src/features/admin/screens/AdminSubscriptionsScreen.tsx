import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { BladeCard } from '../../../components/cards/BladeCard';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAdminStore } from '../../../store/adminStore';
import { fonts, radius, useTheme } from '../../../theme';
import type { BillingInterval, SubscriptionPlanRow } from '../../../services/supabase/types';
import type { PaymentOrderSummary } from '../../../services/supabase/admin';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';

const ORDER_STATUS_LABELS: Record<PaymentOrderSummary['status'], string> = {
  pending: 'Pending',
  completed: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
  disputed: 'Disputed',
};

const INTERVALS: BillingInterval[] = ['30_days', 'monthly', 'yearly'];
const INTERVAL_LABELS: Record<BillingInterval, string> = { '30_days': '30 days', monthly: 'Monthly', yearly: 'Yearly' };

function limitLabel(n: number | null, unit: string): string {
  return n === null ? `Unlimited ${unit}` : `${n} ${unit}${n === 1 ? '' : 's'}`;
}

function planFeatures(plan: SubscriptionPlanRow): string[] {
  return [
    limitLabel(plan.community_limit, 'community'),
    limitLabel(plan.event_limit, 'event'),
    plan.demo_upload_allowed ? 'Demo uploads' : null,
    plan.avatar_custom_allowed ? 'Custom avatar' : null,
    plan.expert_booking_allowed ? 'Expert bookings' : null,
  ].filter((v): v is string => !!v);
}

export function AdminSubscriptionsScreen() {
  const { colors } = useTheme();
  const plans = useAdminStore((s) => s.plans);
  const fetchPlans = useAdminStore((s) => s.fetchPlans);
  const createPlan = useAdminStore((s) => s.createPlan);
  const updatePlan = useAdminStore((s) => s.updatePlan);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const subscriptionsHasMore = useAdminStore((s) => s.subscriptionsHasMore);
  const fetchSubscriptions = useAdminStore((s) => s.fetchSubscriptions);
  const loadMoreSubscriptions = useAdminStore((s) => s.loadMoreSubscriptions);
  const cancelUserSubscription = useAdminStore((s) => s.cancelUserSubscription);
  const extendSubscription = useAdminStore((s) => s.extendSubscription);
  const paymentOrders = useAdminStore((s) => s.paymentOrders);
  const fetchPaymentOrders = useAdminStore((s) => s.fetchPaymentOrders);
  const refundOrder = useAdminStore((s) => s.refundOrder);

  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const [extendErr, setExtendErr] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);

  const openExtend = (id: string) => {
    setExtendingId(id);
    setExtendDays('30');
    setExtendErr('');
  };

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const toggleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (!paymentOrders[userId]) fetchPaymentOrders(userId);
  };

  const [refunding, setRefunding] = useState<{ orderId: string; userId: string; remaining: number } | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundErr, setRefundErr] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);

  const openRefund = (order: PaymentOrderSummary, userId: string) => {
    const remaining = Number(order.amount) - Number(order.refunded_amount ?? 0);
    setRefunding({ orderId: order.id, userId, remaining });
    setRefundAmount(remaining.toFixed(2));
    setRefundReason('');
    setRefundErr('');
  };

  const submitRefund = async () => {
    if (!refunding) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > refunding.remaining + 0.01) {
      setRefundErr(`Enter an amount up to ${refunding.remaining.toFixed(2)}`);
      return;
    }
    if (!refundReason.trim()) {
      setRefundErr('A reason is required');
      return;
    }
    setRefundBusy(true);
    setRefundErr('');
    try {
      await refundOrder(refunding.orderId, amount, refundReason.trim(), refunding.userId);
      setRefunding(null);
    } catch (e) {
      setRefundErr(e instanceof Error ? e.message : 'Could not process refund');
    } finally {
      setRefundBusy(false);
    }
  };

  const submitExtend = async () => {
    if (!extendingId) return;
    const days = Number(extendDays);
    if (!Number.isInteger(days) || days <= 0) {
      setExtendErr('Enter a whole number of days');
      return;
    }
    setExtendBusy(true);
    setExtendErr('');
    try {
      await extendSubscription(extendingId, days);
      setExtendingId(null);
    } catch (e) {
      setExtendErr(e instanceof Error ? e.message : 'Could not extend subscription');
    } finally {
      setExtendBusy(false);
    }
  };

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [interval, setInterval] = useState<BillingInterval>('30_days');
  const [active, setActive] = useState(true);
  const [communityLimit, setCommunityLimit] = useState(''); // blank = unlimited
  const [eventLimit, setEventLimit] = useState('');
  const [demoUploadAllowed, setDemoUploadAllowed] = useState(true);
  const [avatarCustomAllowed, setAvatarCustomAllowed] = useState(true);
  const [expertBookingAllowed, setExpertBookingAllowed] = useState(true);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
  }, [fetchPlans, fetchSubscriptions]);

  const refreshControl = useRefreshControl(() => Promise.all([fetchPlans(), fetchSubscriptions()]));

  const resetForm = () => {
    setCreating(false);
    setEditingId(null);
    setName('');
    setPrice('');
    setInterval('30_days');
    setActive(true);
    setCommunityLimit('');
    setEventLimit('');
    setDemoUploadAllowed(true);
    setAvatarCustomAllowed(true);
    setExpertBookingAllowed(true);
    setErr('');
  };

  const startEditing = (plan: SubscriptionPlanRow) => {
    setCreating(false);
    setEditingId(plan.id);
    setName(plan.name);
    setPrice(String(plan.price));
    setInterval(plan.billing_interval);
    setActive(plan.is_active);
    setCommunityLimit(plan.community_limit === null ? '' : String(plan.community_limit));
    setEventLimit(plan.event_limit === null ? '' : String(plan.event_limit));
    setDemoUploadAllowed(plan.demo_upload_allowed);
    setAvatarCustomAllowed(plan.avatar_custom_allowed);
    setExpertBookingAllowed(plan.expert_booking_allowed);
    setErr('');
  };

  const parseLimit = (v: string): number | null | 'invalid' => {
    if (!v.trim()) return null; // blank = unlimited
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return 'invalid';
    return n;
  };

  const submit = async () => {
    const parsedPrice = Number(price);
    const parsedCommunityLimit = parseLimit(communityLimit);
    const parsedEventLimit = parseLimit(eventLimit);
    if (!name.trim() || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setErr('Enter a name and a valid price.');
      return;
    }
    if (parsedCommunityLimit === 'invalid' || parsedEventLimit === 'invalid') {
      setErr('Community/event limits must be a whole number, or blank for unlimited.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const payload = {
        name: name.trim(),
        price: parsedPrice,
        billing_interval: interval,
        is_active: active,
        community_limit: parsedCommunityLimit,
        event_limit: parsedEventLimit,
        demo_upload_allowed: demoUploadAllowed,
        avatar_custom_allowed: avatarCustomAllowed,
        expert_booking_allowed: expertBookingAllowed,
      };
      if (editingId) {
        await updatePlan(editingId, payload);
      } else {
        await createPlan(payload);
      }
      resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save plan');
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = creating || !!editingId;

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="Subscriptions" />

      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.h, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Plans</Text>
        {!showForm ? (
          <Pressable
            onPress={() => setCreating(true)}
            style={[styles.newPlanBtn, { borderColor: colors.magenta, backgroundColor: colors.magentaDeep }]}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={16} color={colors.magenta} />
            <Text style={{ color: colors.magenta, fontFamily: fonts.bodySemi, fontSize: 13 }}>New plan</Text>
          </Pressable>
        ) : null}
      </View>

      {plans.length === 0 ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 4 }}>No plans yet — tap "New plan" to create one.</Text>
      ) : null}
      {plans.map((plan) => (
        <BladeCard key={plan.id} style={styles.planCard}>
          <View style={styles.planCardTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.planNameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: plan.is_active ? colors.tealMuted : colors.surfaceElevated }]}>
                  <View style={[styles.statusDot, { backgroundColor: plan.is_active ? colors.online : colors.muted2 }]} />
                  <Text style={{ color: plan.is_active ? colors.cyan : colors.muted, fontFamily: fonts.bodyMed, fontSize: 11 }}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.price, { color: colors.text }]}>
                Rs {plan.price.toFixed(0)} <Text style={[styles.priceUnit, { color: colors.muted }]}>/ {INTERVAL_LABELS[plan.billing_interval]}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            {planFeatures(plan).map((f) => (
              <View key={f} style={[styles.featureChip, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="checkmark" size={12} color={colors.cyan} />
                <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 11 }}>{f}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planCardActions}>
            <Pressable onPress={() => startEditing(plan)} style={[styles.btn, { borderColor: colors.magenta }]} accessibilityRole="button">
              <Ionicons name="pencil" size={13} color={colors.magenta} />
              <Text style={{ color: colors.magenta, fontFamily: fonts.bodyMed }}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => updatePlan(plan.id, { is_active: !plan.is_active })}
              style={[styles.btn, { borderColor: plan.is_active ? colors.danger : colors.cyan }]}
              accessibilityRole="button"
            >
              <Ionicons name={plan.is_active ? 'pause' : 'play'} size={13} color={plan.is_active ? colors.danger : colors.cyan} />
              <Text style={{ color: plan.is_active ? colors.danger : colors.cyan, fontFamily: fonts.bodyMed }}>
                {plan.is_active ? 'Deactivate' : 'Activate'}
              </Text>
            </Pressable>
          </View>
        </BladeCard>
      ))}

      {showForm ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.h, { color: colors.text, marginBottom: 0 }]}>{editingId ? 'Edit plan' : 'New plan'}</Text>
            <Pressable onPress={resetForm} accessibilityRole="button" style={styles.closeFormBtn}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <BladeCard style={styles.formCard}>
          <AuthTextField label="Name" value={name} onChangeText={setName} placeholder="Pro" />
          <AuthTextField label="Price (PKR)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="2500" />

          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Billing interval</Text>
          <View style={styles.intervalRow}>
            {INTERVALS.map((i) => {
              const on = interval === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => setInterval(i)}
                  style={[styles.intervalChip, { borderColor: on ? colors.magenta : colors.border, backgroundColor: on ? colors.magentaDeep : colors.surface }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>{INTERVAL_LABELS[i]}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.activeRow}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>Active immediately</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.cyan, false: colors.border }} />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>What this plan unlocks</Text>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Free users get 1 community and 3 events with nothing else. Set what this plan raises those to — leave a limit blank
            for unlimited.
          </Text>

          <AuthTextField
            label="Community limit (blank = unlimited)"
            value={communityLimit}
            onChangeText={setCommunityLimit}
            keyboardType="number-pad"
            placeholder="Unlimited"
          />
          <AuthTextField
            label="Event limit (blank = unlimited)"
            value={eventLimit}
            onChangeText={setEventLimit}
            keyboardType="number-pad"
            placeholder="Unlimited"
          />

          <View style={styles.toggleRow}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>Demo uploads</Text>
            <Switch value={demoUploadAllowed} onValueChange={setDemoUploadAllowed} trackColor={{ true: colors.cyan, false: colors.border }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>Custom avatar photos</Text>
            <Switch value={avatarCustomAllowed} onValueChange={setAvatarCustomAllowed} trackColor={{ true: colors.cyan, false: colors.border }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>Expert bookings</Text>
            <Switch value={expertBookingAllowed} onValueChange={setExpertBookingAllowed} trackColor={{ true: colors.cyan, false: colors.border }} />
          </View>

          {err ? <InlineErrorText message={err} /> : null}
          <PrimaryButton
            label={editingId ? 'Save changes' : 'Create plan'}
            onPress={submit}
            loading={submitting}
            disabled={submitting}
            style={{ marginTop: 12 }}
          />
          </BladeCard>
        </>
      ) : null}

      <Text style={[styles.h, { color: colors.text }]}>Subscribers</Text>
      {subscriptions.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No subscribers yet.</Text> : null}
      {subscriptions.map((sub) => {
        const userId = sub.user?.id;
        const expanded = !!userId && expandedUserId === userId;
        const orders = userId ? paymentOrders[userId] : undefined;
        return (
          <BladeCard key={sub.id} style={styles.planCard}>
            <View style={styles.planCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{sub.user?.display_name ?? 'Unknown user'}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  @{sub.user?.username} · {sub.plan?.name ?? 'Unknown plan'} · {sub.status}
                  {sub.expires_at ? ` · expires ${new Date(sub.expires_at).toLocaleDateString()}` : ''}
                </Text>
              </View>
              {sub.status === 'active' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => openExtend(sub.id)} style={[styles.btn, { borderColor: colors.cyan }]} accessibilityRole="button">
                    <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Extend</Text>
                  </Pressable>
                  <Pressable onPress={() => cancelUserSubscription(sub.id)} style={[styles.btn, { borderColor: colors.danger }]} accessibilityRole="button">
                    <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed }}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {userId ? (
              <Pressable onPress={() => toggleExpand(userId)} style={styles.viewPaymentsBtn} accessibilityRole="button">
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
                <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed, fontSize: 12 }}>View payments</Text>
              </Pressable>
            ) : null}

            {expanded ? (
              <View style={styles.paymentsList}>
                {!orders ? (
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Loading…</Text>
                ) : orders.length === 0 ? (
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>No payments yet.</Text>
                ) : (
                  orders.map((order) => (
                    <View key={order.id} style={[styles.paymentRow, { borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontFamily: fonts.bodyMed, fontSize: 13 }}>
                          {order.currency} {Number(order.amount).toFixed(0)}
                          {order.refunded_amount ? ` (Rs ${Number(order.refunded_amount).toFixed(0)} refunded)` : ''}
                        </Text>
                        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 11 }}>
                          {new Date(order.created_at).toLocaleDateString()} · {ORDER_STATUS_LABELS[order.status]}
                        </Text>
                      </View>
                      {order.status === 'completed' || order.status === 'partially_refunded' ? (
                        <Pressable
                          onPress={() => openRefund(order, userId!)}
                          style={[styles.btn, { borderColor: colors.danger }]}
                          accessibilityRole="button"
                        >
                          <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed, fontSize: 12 }}>Refund</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </BladeCard>
        );
      })}
      <LoadMoreButton hasMore={subscriptionsHasMore} onPress={loadMoreSubscriptions} />

      <Modal visible={!!extendingId} transparent animationType="fade" onRequestClose={() => setExtendingId(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setExtendingId(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>Extend subscription</Text>
            <AuthTextField label="Add days" value={extendDays} onChangeText={setExtendDays} keyboardType="number-pad" />
            {extendErr ? <InlineErrorText message={extendErr} /> : null}
            <PrimaryButton label="Extend" onPress={submitExtend} loading={extendBusy} disabled={extendBusy} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!refunding} transparent animationType="fade" onRequestClose={() => setRefunding(null)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setRefunding(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>Refund payment</Text>
            <AuthTextField label="Refund amount (PKR)" value={refundAmount} onChangeText={setRefundAmount} keyboardType="decimal-pad" />
            <AuthTextField label="Reason" value={refundReason} onChangeText={setRefundReason} placeholder="Why is this being refunded?" />
            <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginBottom: 10 }}>
              This will refund Rs {refundAmount || '0'} to the customer's card via Safepay. This cannot be undone.
            </Text>
            {refundErr ? <InlineErrorText message={refundErr} /> : null}
            <PrimaryButton label="Confirm refund" onPress={submitRefund} loading={refundBusy} disabled={refundBusy} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8 },
  planCard: { padding: 14, marginBottom: 10, gap: 10 },
  planCardTop: { flexDirection: 'row', alignItems: 'center' },
  planCardActions: { flexDirection: 'row', gap: 8 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  price: { fontFamily: fonts.display, fontSize: 20, marginTop: 4 },
  priceUnit: { fontFamily: fonts.body, fontSize: 13 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  featureChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderRadius: radius.pill },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  summary: { fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderRadius: radius.md },
  h: { fontFamily: fonts.display, fontSize: 18, marginTop: 22, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  closeFormBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  formCard: { padding: 16, marginBottom: 8, gap: 4 },
  fieldLabel: { fontFamily: fonts.bodyMed, fontSize: 12, marginTop: 10, marginBottom: 8 },
  sectionLabel: { fontFamily: fonts.bodySemi, fontSize: 14, marginTop: 18, marginBottom: 4 },
  intervalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  intervalChip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderRadius: radius.md },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, minHeight: 40 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  hint: { fontFamily: fonts.body, fontSize: 11, marginBottom: 12, lineHeight: 15 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: radius.lg, padding: 20 },
  viewPaymentsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, minHeight: 32 },
  paymentsList: { gap: 8, marginTop: 6 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 8 },
});
