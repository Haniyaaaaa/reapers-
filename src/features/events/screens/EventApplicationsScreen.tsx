import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ApplicationCard } from '../../../components/events/ApplicationCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useEventStore } from '../../../store/eventStore';
import { fonts, radius, useTheme } from '../../../theme';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';

export function EventApplicationsScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'EventApplications'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const applications = useEventStore((s) => s.applications[params.eventId] ?? EMPTY_ARRAY);
  const hasMore = useEventStore((s) => s.applicationsHasMore[params.eventId] ?? false);
  const payoutAccounts = useEventStore((s) => s.payoutAccounts[params.eventId] ?? EMPTY_ARRAY);
  const fetchApplications = useEventStore((s) => s.fetchApplications);
  const loadMoreApplications = useEventStore((s) => s.loadMoreApplications);
  const fetchPayoutAccounts = useEventStore((s) => s.fetchPayoutAccounts);
  const respondApplication = useEventStore((s) => s.respondApplication);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchApplications(params.eventId);
    fetchPayoutAccounts(params.eventId);
  }, [params.eventId, fetchApplications, fetchPayoutAccounts]);

  const refreshControl = useRefreshControl(async () => {
    await Promise.all([fetchApplications(params.eventId), fetchPayoutAccounts(params.eventId)]);
  });

  const approve = async (id: string) => {
    setErr('');
    try {
      await respondApplication(params.eventId, id, true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not approve');
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setErr('');
    try {
      await respondApplication(params.eventId, rejectTarget, false, reason.trim() || undefined);
      setRejectTarget(null);
      setReason('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reject');
    }
  };

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="Payment applications" onBack={() => nav.goBack()} />
      {err ? <InlineErrorText message={err} /> : null}
      {applications.length === 0 ? <EmptyState title="No pending applications." /> : null}
      {applications.map((a) => {
        const account = payoutAccounts.find((acc) => acc.id === a.payoutAccountId);
        return (
          <ApplicationCard
            key={a.id}
            application={a}
            accountLabel={account ? `Paid to ${account.bankName} · ${account.accountNumber}` : undefined}
            onApprove={() => approve(a.id)}
            onReject={() => setRejectTarget(a.id)}
          />
        );
      })}
      <LoadMoreButton hasMore={hasMore} onPress={() => loadMoreApplications(params.eventId)} />

      <Modal
        visible={!!rejectTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setRejectTarget(null);
          setReason('');
        }}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => {
            setRejectTarget(null);
            setReason('');
          }}
        >
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: 8 }}>Reject this application?</Text>
            <AuthTextField label="Reason (shown to the applicant)" value={reason} onChangeText={setReason} multiline />
            <PrimaryButton label="Reject" onPress={reject} disabled={!reason.trim()} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: radius.lg, padding: 20 },
});
