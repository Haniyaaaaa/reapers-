import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { EXPERT_GOLD_GRADIENT, ExpertTick } from '../../../components/experts/ExpertBadge';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { ExpertCalendar } from '../../../components/experts/ExpertCalendar';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { ProRequiredSheet } from '../../../components/feedback/ProRequiredSheet';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useExpertStore } from '../../../store/expertStore';
import { fonts, useTheme } from '../../../theme';
import { googleCalUrl, type WeeklyAvailability } from '../../../utils/expertSlots';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import type { ExpertSlot } from '../../../types/extra';
import type { ExpertReview } from '../../../types/expert';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { openExternalUrl } from '../../../utils/openUrl';

export function ExpertProfileScreen() {
  const route = useRoute<RouteProp<MainStackParamList, 'ExpertProfile'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const expert = useExpertStore((s) => s.experts.find((e) => e.id === route.params?.id));
  const fetchExpert = useExpertStore((s) => s.fetchExpert);
  const booked = useExpertStore((s) => (route.params?.id ? s.bookedSlots[route.params.id] ?? (EMPTY_ARRAY as unknown as ExpertSlot[]) : (EMPTY_ARRAY as unknown as ExpertSlot[])));
  const fetchBookedSlots = useExpertStore((s) => s.fetchBookedSlots);
  const availability = useExpertStore((s) => (route.params?.id ? s.availability[route.params.id] ?? (EMPTY_ARRAY as unknown as WeeklyAvailability) : (EMPTY_ARRAY as unknown as WeeklyAvailability)));
  const fetchAvailability = useExpertStore((s) => s.fetchAvailability);
  const bookSlot = useExpertStore((s) => s.bookSlot);
  const reviews = useExpertStore((s) => (route.params?.id ? s.expertReviews[route.params.id] ?? (EMPTY_ARRAY as unknown as ExpertReview[]) : (EMPTY_ARRAY as unknown as ExpertReview[])));
  const fetchExpertReviews = useExpertStore((s) => s.fetchExpertReviews);

  const [pick, setPick] = useState<{ day: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingExpert, setLoadingExpert] = useState(!expert);
  const [conflict, setConflict] = useState('');
  const [showProSheet, setShowProSheet] = useState(false);
  const [confirmed, setConfirmed] = useState<{ day: string; time: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const expertId = route.params?.id;
    if (!expertId) return;

    if (!expert) {
      setLoadingExpert(true);
      fetchExpert(expertId).finally(() => {
        if (!cancelled) setLoadingExpert(false);
      });
    }
    fetchBookedSlots(expertId);
    fetchAvailability(expertId);
    fetchExpertReviews(expertId);
    return () => {
      cancelled = true;
    };
  }, [route.params?.id, expert, fetchExpert, fetchBookedSlots, fetchAvailability, fetchExpertReviews]);

  const refreshControl = useRefreshControl(() => {
    const expertId = route.params?.id;
    if (!expertId) return Promise.resolve();
    return Promise.all([fetchExpert(expertId), fetchBookedSlots(expertId), fetchAvailability(expertId)]);
  });

  if (!expert) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <CyberBackground showArtwork={false} />
        <View style={styles.headerBar}>
          <Pressable onPress={() => nav.goBack()} style={styles.backBtnTouch} accessibilityRole="button">
            <CyberCutBox cutSize={8} radius={4} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.backCutBox}>
              <View style={styles.backInner}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </View>
            </CyberCutBox>
          </Pressable>
          <Text style={[styles.headerTitleText, { color: colors.text }]}>Expert Profile</Text>
        </View>
        <View style={{ padding: 16 }}>
          {loadingExpert ? <Skeleton width="100%" height={160} /> : <Text style={[styles.notFoundText, { color: colors.muted }]}>Expert not found.</Text>}
        </View>
      </View>
    );
  }

  const confirm = async () => {
    if (!pick || !user) return;
    setBusy(true);
    setConflict('');
    const res = await bookSlot(expert.id, user.id, pick.day, pick.time);
    setBusy(false);
    if (res === 'requires_pro') {
      setShowProSheet(true);
      setPick(null);
      return;
    }
    if (res === 'conflict') {
      setConflict('That slot was just taken. Pick another time.');
      setPick(null);
      return;
    }
    setConfirmed(pick);
    setPick(null);
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtnTouch} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.backCutBox}
          >
            <View style={styles.backInner}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </View>
          </CyberCutBox>
        </Pressable>

        <Text style={[styles.headerTitleText, { color: colors.text }]}>{expert.name}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {/* Expert Profile Hero Card */}
        <View style={styles.profileHeroRow}>
          <View style={styles.avatarGlowWrap}>
            <CutAvatar
              source={resolveAvatarSource(expert.avatar, expert.avatarId)}
              size={72}
              cut={20}
              borderWidth={3}
              gradientBorder={expert.verified ? EXPERT_GOLD_GRADIENT : ['#00F0FF', '#7928CA', '#D83CFF']}
              fill={colors.surfaceElevated}
            />
          </View>

          <View style={styles.expertInfoWrap}>
            <View style={styles.nameRow}>
              <Text style={[styles.expertNameText, { color: colors.text }]}>{expert.name}</Text>
              {expert.verified ? <ExpertTick size={18} /> : null}
            </View>
            <Text style={[styles.expertSubtext, { color: colors.muted }]}>
              {expert.role || 'Senior Dev'} · {expert.company || 'Studio'} · {expert.reviewCount > 0 ? `${expert.rating.toFixed(1)}★` : 'No reviews yet'}
            </Text>
          </View>
        </View>

        {/* Bio */}
        <Text style={[styles.bioText, { color: colors.text }]}>
          {expert.bio || 'Industry expert with more than 15 years of experience.'}
        </Text>

        {/* Specialties */}
        {expert.specialties.length > 0 ? (
          <View style={styles.chipsRow}>
            {expert.specialties.map((tag) => (
              <View key={tag} style={[styles.specialtyChip, { borderColor: `${colors.primary}66`, backgroundColor: `${colors.primary}14` }]}>
                <Text style={[styles.specialtyChipText, { color: colors.primary }]}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Portfolio & Links — only real links; an empty one used to render as a dead button */}
        {expert.portfolioUrl || expert.linkedinUrl ? (
          <View style={styles.linksRow}>
            {expert.portfolioUrl ? (
              <LinkCard icon="link-outline" label="Portfolio" hint="View work" onPress={() => openExternalUrl(expert.portfolioUrl)} />
            ) : null}
            {expert.linkedinUrl ? (
              <LinkCard icon="logo-linkedin" label="LinkedIn" hint="View profile" onPress={() => openExternalUrl(expert.linkedinUrl)} />
            ) : null}
          </View>
        ) : null}

        {/* Section: Book a Session */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Book a session</Text>
          <LinearGradient
            colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.glowingLine}
          />
        </View>

        {conflict ? <InlineErrorText message={conflict} /> : null}

        {/* Calendar Picker */}
        <CyberCutBox
          cutSize={12}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={1}
          style={styles.calendarCutCard}
        >
          <View style={styles.calendarInner}>
            <ExpertCalendar
              booked={booked}
              pick={pick}
              onPick={(day, time) => setPick({ day, time })}
              availability={availability}
            />
          </View>
        </CyberCutBox>

        {/* Booking Done Message */}
        {confirmed ? (
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.doneBox}
          >
            <View style={styles.doneInner}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
              <Text style={[styles.doneTitle, { color: colors.text }]}>You're Booked!</Text>
              <Text style={[styles.doneText, { color: colors.muted }]}>
                {confirmed.day} {confirmed.time} · 15-minute office hours session with {expert.name}.
              </Text>
              <PrimaryButton
                label="Add to Google Calendar"
                onPress={() => {
                  Linking.openURL(
                    googleCalUrl(
                      `Reapers office hours · ${expert.name}`,
                      '15-minute expert session',
                      confirmed.day,
                      confirmed.time,
                    ),
                  );
                }}
              />
            </View>
          </CyberCutBox>
        ) : null}

        {/* Section: Reviews — written by people who actually had a session with this expert */}
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.reviewsTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Reviews</Text>
            {expert.reviewCount > 0 ? (
              <View style={styles.reviewsSummary}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={[styles.reviewsSummaryText, { color: colors.text }]}>{expert.rating.toFixed(1)}</Text>
                <Text style={[styles.reviewsSummaryCount, { color: colors.muted }]}>· {expert.reviewCount} {expert.reviewCount === 1 ? 'REVIEW' : 'REVIEWS'}</Text>
              </View>
            ) : null}
          </View>
          <LinearGradient
            colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.glowingLine, { marginTop: 6 }]}
          />
        </View>

        {reviews.length === 0 ? (
          <Text style={[styles.reviewsEmpty, { color: colors.muted }]}>
            No reviews yet. After a session, the person who booked can rate and review it.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {reviews.map((r) => (
              <CyberCutBox key={r.id} cutSize={10} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.reviewCard}>
                <View style={styles.reviewInner}>
                  <View style={styles.reviewHeader}>
                    <CutAvatar source={resolveAvatarSource(r.reviewerAvatarUri, r.reviewerAvatarId)} size={34} cut={9} borderWidth={1} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reviewName, { color: colors.text }]} numberOfLines={1}>{r.reviewerName}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={12} color="#FFB800" />
                        ))}
                      </View>
                    </View>
                    <Text style={[styles.reviewDate, { color: colors.muted2 }]}>
                      {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  {r.comment ? <Text style={[styles.reviewComment, { color: colors.text }]}>{r.comment}</Text> : null}
                </View>
              </CyberCutBox>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal Sheet */}
      <ConfirmSheet
        visible={!!pick && !confirmed}
        title="Confirm booking"
        body={pick ? `${pick.day} at ${pick.time} · 15 min session with ${expert.name}` : ''}
        confirmLabel={busy ? 'Booking…' : 'Book slot'}
        danger={false}
        onClose={() => setPick(null)}
        onConfirm={confirm}
      />

      <ProRequiredSheet
        visible={showProSheet}
        title="Booking is a Pro feature"
        body={`Booking a 15-minute session with ${expert.name} is a paid feature. Upgrade to Pro to book expert sessions.`}
        onClose={() => setShowProSheet(false)}
        onUpgrade={() => {
          setShowProSheet(false);
          nav.navigate('Subscription');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtnTouch: {
    width: 38,
    height: 38,
  },
  backCutBox: {
    width: 38,
    height: 38,
  },
  backInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#8E9BB5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 14,
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  avatarGlowWrap: {
    width: 72,
    height: 72,
  },
  avatarRingGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerBox: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#090F1C',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  expertInfoWrap: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expertNameText: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  expertSubtext: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#A6B4CE',
  },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: '#A6B4CE',
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  specialtyChipText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkCardPress: {
    flex: 1,
  },
  linkCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  linkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardText: {
    flex: 1,
  },
  linkCardLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 14,
  },
  linkCardHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  sectionHeaderWrap: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  glowingLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  calendarCutCard: {
    width: '100%',
  },
  calendarInner: {
    padding: 14,
  },
  reviewsTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewsSummary: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewsSummaryText: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700' },
  reviewsSummaryCount: { fontFamily: fonts.mono, fontSize: 11 },
  reviewsEmpty: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  reviewCard: { width: '100%' },
  reviewInner: { padding: 14, gap: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewName: { fontFamily: fonts.bodySemi, fontSize: 13.5 },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewDate: { fontFamily: fonts.mono, fontSize: 10 },
  reviewComment: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20 },
  doneBox: {
    width: '100%',
    marginTop: 12,
  },
  doneInner: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  doneTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: '#FFFFFF',
  },
  doneText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    textAlign: 'center',
  },
});

function LinkCard({ icon, label, hint, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; hint: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${label}, ${hint}`} style={({ pressed }) => [styles.linkCardPress, pressed && { opacity: 0.8 }]}>
      <CyberCutBox cutSize={10} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88}>
        <View style={styles.linkCardInner}>
          <View style={[styles.linkIconWrap, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name={icon} size={17} color={colors.primary} />
          </View>
          <View style={styles.linkCardText}>
            <Text style={[styles.linkCardLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
            <Text style={[styles.linkCardHint, { color: colors.muted }]} numberOfLines={1}>{hint}</Text>
          </View>
          <Ionicons name="arrow-up-outline" size={14} color={colors.muted} style={{ transform: [{ rotate: '45deg' }] }} />
        </View>
      </CyberCutBox>
    </Pressable>
  );
}
