import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { BladeCard } from '../../../components/cards/BladeCard';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { fonts, radius, useTheme } from '../../../theme';
import type { SubscriptionPlanRow } from '../../../services/supabase/types';

const BILLING_LABELS: Record<string, string> = { monthly: '/ month', yearly: '/ year', '30_days': '/ 30 days' };

function planUnlocks(plan: SubscriptionPlanRow): string {
  const parts = [
    plan.community_limit === null ? 'Unlimited communities' : `${plan.community_limit} communit${plan.community_limit === 1 ? 'y' : 'ies'}`,
    plan.event_limit === null ? 'unlimited events' : `${plan.event_limit} event${plan.event_limit === 1 ? '' : 's'}`,
    plan.demo_upload_allowed ? 'demo uploads' : null,
    plan.avatar_custom_allowed ? 'custom avatar photos' : null,
    plan.expert_booking_allowed ? 'expert bookings' : null,
  ].filter(Boolean);
  return parts.join(', ');
}

export function SubscriptionScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const plans = useSubscriptionStore((s) => s.plans);
  const mySubscription = useSubscriptionStore((s) => s.mySubscription);
  const error = useSubscriptionStore((s) => s.error);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const fetchPlans = useSubscriptionStore((s) => s.fetchPlans);
  const fetchMySubscription = useSubscriptionStore((s) => s.fetchMySubscription);
  const cancelSubscription = useSubscriptionStore((s) => s.cancelSubscription);
  const startCheckout = useSubscriptionStore((s) => s.startCheckout);
  const checkingOut = useSubscriptionStore((s) => s.checkingOut);

  useEffect(() => {
    fetchPlans();
    if (user) fetchMySubscription(user.id);
  }, [user, fetchPlans, fetchMySubscription]);

  const pro = isPro();

  const onSubscribe = async (planId: string) => {
    if (!user || checkingOut) return;
    const orderId = await startCheckout(planId);
    if (orderId) nav.navigate('PaymentResult', { orderId });
  };

  return (
    <Screen>
      <ScreenHeader title="Subscription" onBack={() => nav.goBack()} />
      <Text style={[styles.note, { color: colors.muted }]}>
        Free accounts get 1 community and 3 events. Paid plans raise those limits and unlock more.
      </Text>
      {error ? <InlineErrorText message={error} /> : null}

      {mySubscription && pro ? (
        <BladeCard style={styles.statusCard}>
          <Text style={[styles.name, { color: colors.cyan }]}>
            {plans.find((p) => p.id === mySubscription.plan_id)?.name ?? 'Plan'} — active
          </Text>
          {mySubscription.expires_at ? (
            <Text style={[styles.price, { color: colors.muted }]}>
              Renews by {new Date(mySubscription.expires_at).toLocaleDateString()}
            </Text>
          ) : null}
          <Pressable
            onPress={() => cancelSubscription(mySubscription.id)}
            style={[styles.btn, { borderColor: colors.danger, marginTop: 10 }]}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed }}>Cancel</Text>
          </Pressable>
        </BladeCard>
      ) : null}

      {!pro
        ? plans.map((plan) => (
            <BladeCard key={plan.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.price, { color: colors.muted }]}>
                  Rs {plan.price.toFixed(0)} {BILLING_LABELS[plan.billing_interval] ?? ''}
                </Text>
                <Text style={[styles.unlocks, { color: colors.cyan }]}>{planUnlocks(plan)}</Text>
              </View>
              <Pressable
                onPress={() => onSubscribe(plan.id)}
                disabled={checkingOut}
                style={[styles.btn, { borderColor: colors.cyan, opacity: checkingOut ? 0.6 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>{checkingOut ? 'Opening…' : 'Subscribe'}</Text>
              </Pressable>
            </BladeCard>
          ))
        : null}
      {plans.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No plans available yet.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, marginBottom: 16, lineHeight: 20 },
  statusCard: { padding: 16, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  name: { fontFamily: fonts.displayMed, fontSize: 16 },
  price: { fontFamily: fonts.body, marginTop: 2 },
  unlocks: { fontFamily: fonts.body, fontSize: 12, marginTop: 6, lineHeight: 16 },
  btn: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderRadius: radius.md },
});
