import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { Screen } from '../../../components/layout/Screen';
import { useAuth } from '../../../hooks/useAuth';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { fonts, useTheme } from '../../../theme';
import type { MainStackParamList } from '../../../navigation/types';

/** Landing screen after the Safepay hosted-checkout browser session returns (or the
 * reapers://payment-result deep link, still the fallback for the app being backgrounded/killed
 * mid-flow). Arriving here does NOT imply the payment was already
 * confirmed server-side — it only means the browser closed. This screen calls verifyPayment
 * (the authoritative check, re-derived from Safepay's own status endpoint) before refetching
 * the subscription, and treats a 'pending' result (the webhook hasn't landed yet) as "still
 * processing" rather than a failure, retrying once after a short delay. */
export function PaymentResultScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'PaymentResult'>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const fetchMySubscription = useSubscriptionStore((s) => s.fetchMySubscription);
  const verifyPayment = useSubscriptionStore((s) => s.verifyPayment);
  const [state, setState] = useState<'checking' | 'active' | 'pending' | 'failed'>('checking');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async (isRetry: boolean) => {
      if (!params?.orderId) {
        await fetchMySubscription(user.id);
        if (!cancelled) setState('active');
        return;
      }
      const status = await verifyPayment(params.orderId, user.id);
      if (cancelled) return;
      if (status === 'pending' && !isRetry) {
        // The webhook may not have landed yet — one short retry before settling on "pending".
        setTimeout(() => check(true), 3000);
        return;
      }
      setState(status === 'active' ? 'active' : status === 'pending' ? 'pending' : 'failed');
    };

    check(false);
    return () => {
      cancelled = true;
    };
  }, [user, params?.orderId, verifyPayment, fetchMySubscription]);

  const copy: Record<typeof state, { title: string; body: string }> = {
    checking: { title: 'Confirming payment…', body: 'Hang tight while we check with Safepay.' },
    active: { title: 'You’re Pro!', body: 'Your subscription is active — head back to see what’s unlocked.' },
    pending: {
      title: 'Still processing…',
      body: "Safepay hasn't confirmed this payment yet. It'll activate automatically — check the Subscription screen shortly.",
    },
    failed: { title: 'Payment not completed', body: "This payment didn't go through, and no charge was made. You can try again." },
  };

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.text }]}>{copy[state].title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{copy[state].body}</Text>
        <PrimaryButton label="Go to Subscription" onPress={() => nav.navigate('Subscription')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  title: { fontFamily: fonts.displayMed, fontSize: 18, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 8 },
});
