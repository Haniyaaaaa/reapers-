import { useNavigation } from '@react-navigation/native';
import { openExternalUrl } from '../../../utils/openUrl';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MainStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { BladeCard } from '../../../components/cards/BladeCard';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useExpertStore } from '../../../store/expertStore';
import { fonts, radius, useTheme } from '../../../theme';
import type { BookingSummary } from '../../../types/extra';

function BookingRow({
  booking,
  onCancel,
  onSetMeetingLink,
  reviewed,
  onRate,
}: {
  booking: BookingSummary;
  onCancel: () => void;
  onSetMeetingLink: (link: string) => Promise<void>;
  reviewed: boolean;
  onRate: () => void;
}) {
  const { colors } = useTheme();
  const past = new Date(booking.startsAt).getTime() < Date.now();
  const withWhom = booking.role === 'requester' ? booking.expertName : booking.requesterName;
  const cancellable = booking.status === 'confirmed' && !past;
  const reviewable = booking.role === 'requester' && booking.status === 'confirmed' && past && !reviewed;
  const [editingLink, setEditingLink] = useState(false);
  const [linkValue, setLinkValue] = useState(booking.expertMeetingLink ?? '');
  const [saving, setSaving] = useState(false);

  const saveLink = async () => {
    if (!linkValue.trim()) return;
    setSaving(true);
    try {
      await onSetMeetingLink(linkValue.trim());
      setEditingLink(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BladeCard style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]}>{withWhom}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>{new Date(booking.startsAt).toLocaleString()} · 15 min</Text>

        {booking.role === 'requester' && cancellable ? (
          booking.expertMeetingLink ? (
            <Pressable onPress={() => openExternalUrl(booking.expertMeetingLink)} accessibilityRole="button" style={{ marginTop: 4 }}>
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed, fontSize: 12 }}>Join call</Text>
            </Pressable>
          ) : (
            <Text style={[styles.muted, { color: colors.muted2, marginTop: 4 }]}>Link not shared yet — check back closer to your session.</Text>
          )
        ) : null}

        {booking.role === 'expert' && cancellable ? (
          editingLink ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              <AuthTextField label="Meeting link" value={linkValue} onChangeText={setLinkValue} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={saveLink} disabled={saving} accessibilityRole="button">
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi, fontSize: 12 }}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingLink(false)} accessibilityRole="button">
                  <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed, fontSize: 12 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setEditingLink(true)} accessibilityRole="button" style={{ marginTop: 4 }}>
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed, fontSize: 12 }}>
                {booking.expertMeetingLink ? 'Edit meeting link' : 'Set meeting link'}
              </Text>
            </Pressable>
          )
        ) : null}
      </View>
      {cancellable ? (
        <Pressable onPress={onCancel} style={styles.cancelBtn} accessibilityRole="button">
          <Text style={{ color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 12 }}>Cancel</Text>
        </Pressable>
      ) : reviewable ? (
        <Pressable onPress={onRate} style={styles.cancelBtn} accessibilityRole="button">
          <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi, fontSize: 12 }}>Rate session</Text>
        </Pressable>
      ) : (
        <Text style={[styles.status, { color: booking.status === 'cancelled' ? colors.danger : past ? colors.muted2 : colors.cyan }]}>
          {booking.status === 'cancelled' ? 'Cancelled' : reviewed ? 'Rated' : 'Past'}
        </Text>
      )}
    </BladeCard>
  );
}

export function MyBookingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const myBookings = useExpertStore((s) => s.myBookings);
  const loading = useExpertStore((s) => s.myBookingsLoading);
  const error = useExpertStore((s) => s.myBookingsError);
  const fetchMyBookings = useExpertStore((s) => s.fetchMyBookings);
  const cancelBooking = useExpertStore((s) => s.cancelBooking);
  const setMeetingLink = useExpertStore((s) => s.setMeetingLink);
  const reviewedBookingIds = useExpertStore((s) => s.reviewedBookingIds);
  const ensureReviewedBookingsLoaded = useExpertStore((s) => s.ensureReviewedBookingsLoaded);
  const submitExpertReview = useExpertStore((s) => s.submitExpertReview);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [ratingBooking, setRatingBooking] = useState<BookingSummary | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingErr, setRatingErr] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyBookings(user.id);
      ensureReviewedBookingsLoaded(user.id);
    }
  }, [user, fetchMyBookings, ensureReviewedBookingsLoaded]);

  const openRating = (booking: BookingSummary) => {
    setRatingBooking(booking);
    setRatingValue(0);
    setRatingComment('');
    setRatingErr('');
  };

  const submitRating = async () => {
    if (!ratingBooking || !user || ratingValue === 0) return;
    setRatingSubmitting(true);
    setRatingErr('');
    try {
      await submitExpertReview(ratingBooking.id, ratingBooking.expertId, user.id, ratingValue, ratingComment.trim());
      setRatingBooking(null);
    } catch (e) {
      setRatingErr(e instanceof Error ? e.message : 'Could not submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchMyBookings(user.id);
  });

  const mySessions = myBookings.filter((b) => b.role === 'requester');
  const sessionsWithYou = myBookings.filter((b) => b.role === 'expert');

  const confirmCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelId);
      setCancelId(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="My Bookings" onBack={() => nav.goBack()} />
      {loading ? <Skeleton width="100%" height={72} /> : null}
      {!loading && error ? <RetryBanner onRetry={() => user && fetchMyBookings(user.id)} /> : null}
      {!loading && !error && myBookings.length === 0 ? (
        <EmptyState
          title={
            user?.isExpert
              ? "No bookings yet. Once someone books a session with you, it'll show up here."
              : 'No bookings yet — book a session from Experts.'
          }
        />
      ) : null}
      {!loading && !error && mySessions.length > 0 ? (
        <>
          <SectionHeader title="My sessions" />
          <View style={{ gap: 10, marginBottom: 16 }}>
            {mySessions.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onCancel={() => setCancelId(b.id)}
                onSetMeetingLink={(link) => setMeetingLink(b.id, link)}
                reviewed={reviewedBookingIds.has(b.id)}
                onRate={() => openRating(b)}
              />
            ))}
          </View>
        </>
      ) : null}
      {!loading && !error && sessionsWithYou.length > 0 ? (
        <>
          <SectionHeader title="Sessions with you" />
          <View style={{ gap: 10 }}>
            {sessionsWithYou.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onCancel={() => setCancelId(b.id)}
                onSetMeetingLink={(link) => setMeetingLink(b.id, link)}
                reviewed={reviewedBookingIds.has(b.id)}
                onRate={() => openRating(b)}
              />
            ))}
          </View>
        </>
      ) : null}
      <ConfirmSheet
        visible={!!cancelId}
        title="Cancel this booking?"
        body="This frees the slot for someone else to book. This can't be undone."
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel booking'}
        onClose={() => setCancelId(null)}
        onConfirm={confirmCancel}
      />

      <Modal visible={!!ratingBooking} transparent animationType="fade" onRequestClose={() => setRatingBooking(null)}>
        <Pressable style={styles.ratingBackdrop} onPress={() => setRatingBooking(null)}>
          <Pressable style={[styles.ratingSheet, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]} onPress={() => undefined}>
            <Text style={[styles.ratingTitle, { color: colors.text }]}>Rate your session</Text>
            <Text style={[styles.ratingSub, { color: colors.muted }]}>{ratingBooking?.expertName}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRatingValue(n)} accessibilityRole="button" hitSlop={6}>
                  <Ionicons name={n <= ratingValue ? 'star' : 'star-outline'} size={32} color="#FFB800" />
                </Pressable>
              ))}
            </View>
            <AuthTextField label="Comment (optional)" value={ratingComment} onChangeText={setRatingComment} multiline maxLength={500} />
            {ratingErr ? <InlineErrorText message={ratingErr} /> : null}
            <PrimaryButton label="Submit rating" onPress={submitRating} loading={ratingSubmitting} disabled={ratingSubmitting || ratingValue === 0} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  muted: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  status: { fontFamily: fonts.mono, fontSize: 11 },
  cancelBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  ratingBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  ratingSheet: { backgroundColor: '#0E1423', borderRadius: radius.lg, padding: 20, gap: 12 },
  ratingTitle: { fontFamily: fonts.display, fontSize: 18, color: '#FFFFFF' },
  ratingSub: { fontFamily: fonts.body, fontSize: 13, color: '#A6B4CE', marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 4 },
});
