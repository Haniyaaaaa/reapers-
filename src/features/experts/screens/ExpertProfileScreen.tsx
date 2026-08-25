import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { VerifiedBadge } from '../../../components/avatars/VerifiedBadge';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ExpertCalendar } from '../../../components/experts/ExpertCalendar';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { experts } from '../../../data/mock';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, useTheme } from '../../../theme';
import { googleCalUrl } from '../../../utils/expertSlots';
import { callClient } from '../../../services/video/callClient';
import { Ionicons } from '@expo/vector-icons';

export function ExpertProfileScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'ExpertProfile'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { phase } = useFakeLoad(300);
  const expert = experts.find((e) => e.id === params.id);
  const booked = useCommunityStore((s) => s.slots[params.id] ?? []);
  const bookSlot = useCommunityStore((s) => s.bookSlot);
  const [pick, setPick] = useState<{ day: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState('');
  const [confirmed, setConfirmed] = useState<{ day: string; time: string } | null>(null);

  if (!expert) {
    return (
      <Screen>
        <ScreenHeader title="Expert" onBack={() => nav.goBack()} />
        <Text style={[styles.muted, { color: colors.muted }]}>Not found.</Text>
      </Screen>
    );
  }

  const confirm = async () => {
    if (!pick) return;
    setBusy(true);
    setConflict('');
    const res = await bookSlot(expert.id, pick.day, pick.time);
    setBusy(false);
    if (res === 'conflict') {
      setConflict('That slot was just taken. Pick another time.');
      setPick(null);
      return;
    }
    setConfirmed(pick);
    setPick(null);
  };

  const open = (url: string) => Linking.openURL(url.startsWith('http') ? url : `https://${url}`);

  return (
    <Screen>
      <ScreenHeader title={expert.name} onBack={() => nav.goBack()} />
      {phase === 'loading' ? <Skeleton width="100%" height={120} /> : null}
      {phase === 'ready' ? (
        <>
          <View style={styles.header}>
            <AvatarRing name={expert.name} size={72} avatarId={expert.avatarId ?? (expert.id === 'x1' ? 'queen-ace' : 'pixel-mage')} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.h, { color: colors.text }]}>{expert.name}</Text>
                {expert.verified ? <VerifiedBadge /> : null}
              </View>
              <Text style={[styles.muted, { color: colors.muted }]}>
                {expert.role} · {expert.company} · {expert.rating.toFixed(1)}★
              </Text>
              {expert.yearsExperience ? (
                <Text style={[styles.muted, { color: colors.muted }]}>{expert.yearsExperience} years experience</Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.body, { color: colors.text }]}>{expert.bio}</Text>
          <Text style={[styles.tags, { color: colors.cyan }]}>{expert.specialties.join(' · ')}</Text>
          {expert.linkedinUrl ? (
            <Pressable onPress={() => open(expert.linkedinUrl!)} style={styles.link} accessibilityRole="link">
              <Ionicons name="logo-linkedin" size={16} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>LinkedIn</Text>
            </Pressable>
          ) : null}
          {expert.portfolioUrl ? (
            <Pressable onPress={() => open(expert.portfolioUrl!)} style={styles.link} accessibilityRole="link">
              <Ionicons name="link-outline" size={16} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Work / portfolio</Text>
            </Pressable>
          ) : null}
          {expert.work?.length ? (
            <>
              <Text style={[styles.h2, { color: colors.text }]}>Work</Text>
              {expert.work.map((w) => (
                <Text key={`${w.company}-${w.title}`} style={[styles.body, { color: colors.muted }]}>
                  {w.title} · {w.company} · {w.years}
                </Text>
              ))}
            </>
          ) : null}

          <Text style={[styles.h2, { color: colors.text }]}>Book a session</Text>
          {conflict ? <InlineErrorText message={conflict} /> : null}
          <ExpertCalendar booked={booked} pick={pick} onPick={(day, time) => setPick({ day, time })} />
        </>
      ) : null}

      <ConfirmSheet
        visible={!!pick && !confirmed}
        title="Confirm booking"
        body={pick ? `${pick.day} ${pick.time} · 15 min with ${expert.name}` : ''}
        confirmLabel={busy ? 'Booking…' : 'Book slot'}
        onClose={() => setPick(null)}
        onConfirm={confirm}
      />

      {confirmed ? (
        <View style={styles.done}>
          <Text style={[styles.h2, { color: colors.text }]}>You’re booked</Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {confirmed.day} {confirmed.time} · 15-minute office hours.
          </Text>
          <PrimaryButton
            label="Add to Google Calendar"
            onPress={() => {
              Linking.openURL(
                googleCalUrl(`Reapers office hours · ${expert.name}`, '15-minute expert session', confirmed.day, confirmed.time),
              );
            }}
          />
          <PrimaryButton
            label="Join call (preview)"
            onPress={async () => {
              await callClient.join(expert.id);
              nav.navigate('VideoCall', { id: expert.id });
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  h: { fontFamily: fonts.display, fontSize: 22 },
  h2: { fontFamily: fonts.display, fontSize: 18, marginTop: 16, marginBottom: 8 },
  muted: { fontFamily: fonts.body, marginTop: 4 },
  body: { fontFamily: fonts.body, marginTop: 8, lineHeight: 22 },
  tags: { fontFamily: fonts.mono, marginTop: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, marginTop: 4 },
  done: { marginTop: 16, gap: 10 },
});
