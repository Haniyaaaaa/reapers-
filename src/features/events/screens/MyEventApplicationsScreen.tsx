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
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useEventStore } from '../../../store/eventStore';
import { fonts, radius, useTheme } from '../../../theme';

/** Every pending payment application across every event this user hosts — the aggregated
 * counterpart to EventApplicationsScreen (which is scoped to one event). Reachable from the
 * profile screen. */
export function MyEventApplicationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const applications = useEventStore((s) => s.myHostApplications);
  const hasMore = useEventStore((s) => s.myHostApplicationsHasMore);
  const fetchMyHostApplications = useEventStore((s) => s.fetchMyHostApplications);
  const loadMoreMyHostApplications = useEventStore((s) => s.loadMoreMyHostApplications);
  const respondApplication = useEventStore((s) => s.respondApplication);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; eventId: string } | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) fetchMyHostApplications(user.id);
  }, [user, fetchMyHostApplications]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchMyHostApplications(user.id);
  });

  const approve = async (eventId: string, id: string) => {
    setErr('');
    try {
      await respondApplication(eventId, id, true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not approve');
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setErr('');
    try {
      await respondApplication(rejectTarget.eventId, rejectTarget.id, false, reason.trim() || undefined);
      setRejectTarget(null);
      setReason('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not reject');
    }
  };

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="Payment applications" onBack={() => nav.goBack()} />
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 14 }}>Across every event you host.</Text>
      {err ? <InlineErrorText message={err} /> : null}
      {applications.length === 0 ? <EmptyState title="No pending applications." /> : null}
      {applications.map((a) => (
        <ApplicationCard
          key={a.id}
          application={a}
          onApprove={() => approve(a.eventId, a.id)}
          onReject={() => setRejectTarget({ id: a.id, eventId: a.eventId })}
        />
      ))}
      <LoadMoreButton hasMore={hasMore} onPress={() => user && loadMoreMyHostApplications(user.id)} />

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
