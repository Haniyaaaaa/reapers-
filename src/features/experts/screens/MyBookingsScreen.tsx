import { useNavigation } from '@react-navigation/native';
import { openExternalUrl } from '../../../utils/openUrl';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MainStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { EXPERT_GOLD } from '../../../components/experts/ExpertBadge';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useExpertStore } from '../../../store/expertStore';
import { fonts, useTheme } from '../../../theme';
import type { BookingSummary } from '../../../types/extra';

function statusTone(status: string, past: boolean, reviewed: boolean, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'cancelled') return { label: 'CANCELLED', color: colors.danger };
  if (reviewed) return { label: 'RATED', color: '#F5C542' };
  if (past) return { label: 'PAST', color: colors.muted };
  return { label: 'UPCOMING', color: '#3DDC84' };
}

function BookingCard({
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
  const withWhomAvatarUri = booking.role === 'requester' ? booking.expertAvatarUri : booking.requesterAvatarUri;
  const withWhomAvatarId = booking.role === 'requester' ? booking.expertAvatarId : booking.requesterAvatarId;
  const cancellable = booking.status === 'confirmed' && !past;
  const reviewable = booking.role === 'requester' && booking.status === 'confirmed' && past && !reviewed;
  const [editingLink, setEditingLink] = useState(false);
  const [linkValue, setLinkValue] = useState(booking.expertMeetingLink ?? '');
  const [saving, setSaving] = useState(false);
  const tone = statusTone(booking.status, past, reviewed, colors);

  const when = new Date(booking.startsAt);
  const dateLabel = when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

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
    <CyberCutBox cutSize={12} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <CutAvatar source={resolveAvatarSource(withWhomAvatarUri, withWhomAvatarId)} size={44} cut={11} borderWidth={1} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{withWhom}</Text>
            <View style={styles.whenRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.muted} />
              <Text style={[styles.muted, { color: colors.muted }]}>{dateLabel}</Text>
              <Ionicons name="time-outline" size={12} color={colors.muted} style={{ marginLeft: 6 }} />
              <Text style={[styles.muted, { color: colors.muted }]}>{timeLabel} · 15 min</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { borderColor: `${tone.color}66`, backgroundColor: `${tone.color}1A` }]}>
            <Text style={[styles.statusText, { color: tone.color }]}>{tone.label}</Text>
          </View>
        </View>

        {booking.role === 'requester' && cancellable ? (
          booking.expertMeetingLink ? (
            <Pressable onPress={() => openExternalUrl(booking.expertMeetingLink)} accessibilityRole="button" style={styles.linkRow}>
              <Ionicons name="videocam-outline" size={14} color={colors.cyan} />
              <Text style={[styles.linkText, { color: colors.cyan }]}>Join call</Text>
            </Pressable>
          ) : (
            <Text style={[styles.mutedNote, { color: colors.muted2 }]}>Link not shared yet — check back closer to your session.</Text>
          )
        ) : null}

        {booking.role === 'expert' && cancellable ? (
          editingLink ? (
            <View style={styles.editLinkWrap}>
              <AuthTextField label="Meeting link" value={linkValue} onChangeText={setLinkValue} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
              <View style={styles.editLinkActions}>
                <Pressable onPress={saveLink} disabled={saving} accessibilityRole="button">
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi, fontSize: 12 }}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
                <Pressable onPress={() => setEditingLink(false)} accessibilityRole="button">
                  <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed, fontSize: 12 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setEditingLink(true)} accessibilityRole="button" style={styles.linkRow}>
              <Ionicons name="link-outline" size={14} color={colors.cyan} />
              <Text style={[styles.linkText, { color: colors.cyan }]}>{booking.expertMeetingLink ? 'Edit meeting link' : 'Set meeting link'}</Text>
            </Pressable>
          )
        ) : null}

        {cancellable ? (
          <Pressable onPress={onCancel} style={[styles.actionBtn, { borderColor: 'rgba(255, 77, 109, 0.4)', backgroundColor: 'rgba(255, 77, 109, 0.08)' }]} accessibilityRole="button">
            <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancel booking</Text>
          </Pressable>
        ) : reviewable ? (
          <Pressable onPress={onRate} style={styles.actionBtnGradientTouch} accessibilityRole="button">
            <CyberCutBox gradient cutSize={6} radius={4} style={styles.actionBtnGradientCut}>
              <View style={styles.actionBtnGradientInner}>
                <Ionicons name="star-outline" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnGradientText}>Rate session</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        ) : null}
      </View>
    </CyberCutBox>
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
      {loading ? <Skeleton width="100%" height={92} /> : null}
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
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>MY SESSIONS</Text>
            <View style={[styles.sectionLabelRule, { backgroundColor: colors.cardBorder }]} />
          </View>
          <View style={{ gap: 12 }}>
            {mySessions.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onCancel={() => setCancelId(b.id)}
                onSetMeetingLink={(link) => setMeetingLink(b.id, link)}
                reviewed={reviewedBookingIds.has(b.id)}
                onRate={() => openRating(b)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {!loading && !error && sessionsWithYou.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>SESSIONS WITH YOU</Text>
            <View style={[styles.sectionLabelRule, { backgroundColor: colors.cardBorder }]} />
          </View>
          <View style={{ gap: 12 }}>
            {sessionsWithYou.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onCancel={() => setCancelId(b.id)}
                onSetMeetingLink={(link) => setMeetingLink(b.id, link)}
                reviewed={reviewedBookingIds.has(b.id)}
                onRate={() => openRating(b)}
              />
            ))}
          </View>
        </View>
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
          <Pressable onPress={() => undefined}>
            <CyberCutBox cutSize={14} radius={10} fill={colors.surface} borderColor={colors.cardBorder} borderWidth={1} style={styles.ratingCut}>
              <View style={styles.ratingInner}>
                <Text style={[styles.ratingTitle, { color: colors.text }]}>Rate your session</Text>
                <Text style={[styles.ratingSub, { color: colors.muted }]}>{ratingBooking?.expertName}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRatingValue(n)} accessibilityRole="button" hitSlop={6}>
                      <Ionicons name={n <= ratingValue ? 'star' : 'star-outline'} size={32} color={n <= ratingValue ? EXPERT_GOLD : colors.muted2} />
                    </Pressable>
                  ))}
                </View>
                <AuthTextField label="Comment (optional)" value={ratingComment} onChangeText={setRatingComment} multiline maxLength={500} />
                {ratingErr ? <InlineErrorText message={ratingErr} /> : null}
                <PrimaryButton label="Submit rating" onPress={submitRating} loading={ratingSubmitting} disabled={ratingSubmitting || ratingValue === 0} />
              </View>
            </CyberCutBox>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  sectionLabelRule: { flex: 1, height: StyleSheet.hairlineWidth },
  card: { width: '100%' },
  cardInner: { padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  mutedNote: { fontFamily: fonts.body, fontSize: 12 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontFamily: fonts.bodyMed, fontSize: 12.5 },
  editLinkWrap: { gap: 8 },
  editLinkActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontFamily: fonts.bodySemi, fontSize: 12.5 },
  actionBtnGradientTouch: {},
  actionBtnGradientCut: { height: 38 },
  actionBtnGradientInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%' },
  actionBtnGradientText: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: '#FFFFFF' },
  ratingBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  ratingCut: { width: '100%' },
  ratingInner: { padding: 20, gap: 12 },
  ratingTitle: { fontFamily: fonts.display, fontSize: 18 },
  ratingSub: { fontFamily: fonts.body, fontSize: 13, marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 4 },
});
