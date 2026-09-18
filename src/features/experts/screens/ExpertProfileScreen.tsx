import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  Image,
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
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useExpertStore } from '../../../store/expertStore';
import { fonts, useTheme } from '../../../theme';
import { googleCalUrl, type WeeklyAvailability } from '../../../utils/expertSlots';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import type { ExpertSlot } from '../../../types/extra';

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

  const [pick, setPick] = useState<{ day: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingExpert, setLoadingExpert] = useState(!expert);
  const [conflict, setConflict] = useState('');
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
    return () => {
      cancelled = true;
    };
  }, [route.params?.id, expert, fetchExpert, fetchBookedSlots, fetchAvailability]);

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
      setConflict('Booking an expert requires an active Pro subscription.');
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

  const openUrl = (url: string) => Linking.openURL(url.startsWith('http') ? url : `https://${url}`);

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
            <LinearGradient
              colors={['#00F0FF', '#7928CA', '#D83CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRingGradient}
            >
              <View style={[styles.avatarInnerBox, { backgroundColor: colors.surfaceElevated }]}>
                <Image
                  source={getCyberAvatarSource(expert.avatarId)}
                  style={styles.avatarImg}
                />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.expertInfoWrap}>
            <View style={styles.nameRow}>
              <Text style={[styles.expertNameText, { color: colors.text }]}>{expert.name}</Text>
              {expert.verified ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
            </View>
            <Text style={[styles.expertSubtext, { color: colors.muted }]}>
              {expert.role || 'Senior Dev'} · {expert.company || 'Studio'} · {expert.rating.toFixed(1)}★
            </Text>
          </View>
        </View>

        {/* Bio */}
        <Text style={[styles.bioText, { color: colors.text }]}>
          {expert.bio || 'Industry expert with more than 15 years of experience.'}
        </Text>

        {/* Specialties Tags */}
        <View style={styles.specialtiesRow}>
          <Text style={[styles.specialtiesText, { color: colors.primary }]}>
            {(expert.specialties.length > 0 ? expert.specialties : ['Systems', 'Live ops', 'Netcode']).join('  ·  ')}
          </Text>
        </View>

        {/* Portfolio & Links */}
        <View style={styles.linksGroup}>
          {expert.portfolioUrl ? (
            <Pressable onPress={() => openUrl(expert.portfolioUrl!)} style={styles.linkTouch} accessibilityRole="link">
              <Ionicons name="link-outline" size={16} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Work / portfolio</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => {}} style={styles.linkTouch} accessibilityRole="link">
              <Ionicons name="link-outline" size={16} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Work / portfolio</Text>
            </Pressable>
          )}

          {expert.linkedinUrl ? (
            <Pressable onPress={() => openUrl(expert.linkedinUrl!)} style={styles.linkTouch} accessibilityRole="link">
              <Ionicons name="logo-linkedin" size={16} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>LinkedIn profile</Text>
            </Pressable>
          ) : null}
        </View>

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
        {conflict.toLowerCase().includes('pro subscription') ? (
          <Pressable onPress={() => nav.navigate('Subscription')} accessibilityRole="button" style={styles.proLinkTouch}>
            <Text style={[styles.proLinkText, { color: colors.primary }]}>Subscribe to Pro to book sessions</Text>
          </Pressable>
        ) : null}

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
  specialtiesRow: {
    marginVertical: 2,
  },
  specialtiesText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  linksGroup: {
    gap: 6,
    marginBottom: 6,
  },
  linkTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  linkText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: '#00F0FF',
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
  proLinkTouch: {
    paddingVertical: 6,
  },
  proLinkText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: '#00F0FF',
  },
  calendarCutCard: {
    width: '100%',
  },
  calendarInner: {
    padding: 14,
  },
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
