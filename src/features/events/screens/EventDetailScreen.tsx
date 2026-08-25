import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { HostPayoutCard } from '../../../components/cards/HostPayoutCard';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { CoverImageHeader } from '../../../components/layout/CoverImageHeader';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { attendees } from '../../../data/mock';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

export function EventDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'EventDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const event = useCommunityStore((s) => s.events.find((e) => e.id === params?.id));
  const confirmEventPayment = useCommunityStore((s) => s.confirmEventPayment);
  const [step, setStep] = useState<'details' | 'account' | 'pay' | 'done'>('details');
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [card, setCard] = useState('');
  const past = event ? new Date(event.startsAt).getTime() < Date.now() : false;
  const paid = !!event?.paid && (event.price ?? 0) > 0;

  if (!event) {
    return (
      <Screen>
        <ScreenHeader title="Event" onBack={() => nav.goBack()} />
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Event not found.</Text>
      </Screen>
    );
  }

  const startRsvp = () => {
    if (past) return;
    if (event.paidByUser || event.rsvp === 'going') {
      setStep('done');
      return;
    }
    setStep(paid ? 'account' : 'done');
    if (!paid) confirmEventPayment(event.id);
  };

  const pay = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    confirmEventPayment(event.id);
    setBusy(false);
    setStep('done');
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 16 }}>
        <ScreenHeader
          title={event.title}
          onBack={() => nav.goBack()}
          right={
            <Pressable
              onPress={() => Share.share({ message: `Join me at ${event.title}: reapers://events/${event.id}` })}
              style={styles.icon}
              accessibilityRole="button"
              accessibilityLabel="Share event"
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </Pressable>
          }
        />
      </View>
      <CoverImageHeader uri={event.cover} />
      <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24 }}>
        <Text style={[styles.h, { color: colors.text }]}>{event.title}</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14 }}>
          {new Date(event.startsAt).toLocaleString()} · {event.type}
        </Text>
        <View style={[styles.pricePill, { backgroundColor: colors.magentaDeep }]}>
          <Text style={{ color: colors.magenta, fontFamily: fonts.monoBold }}>
            {paid ? `${event.currency === 'USD' ? '$' : ''}${event.price} ticket` : 'Free event'}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Linking.openURL(
              event.type === 'Physical'
                ? `https://maps.google.com/?q=${encodeURIComponent(event.location)}`
                : `https://${event.location.replace(/^https?:\/\//, '')}`,
            )
          }
          style={styles.tile}
          accessibilityRole="link"
        >
          <Ionicons name={event.type === 'Physical' ? 'map' : 'link'} size={18} color={colors.cyan} />
          <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>{event.location}</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 16, lineHeight: 24 }}>{event.description}</Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Hosted by {event.posterName}</Text>
        <Pressable onPress={() => setShowAll((v) => !v)} style={[styles.stack, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.text, fontFamily: fonts.body }}>
            {(showAll ? attendees : attendees.slice(0, 3)).join(' · ')}
            {` +${event.attendeeCount}`}
          </Text>
          <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>{showAll ? 'Hide list' : 'See attendees'}</Text>
        </Pressable>

        {step === 'details' ? (
          <PrimaryButton
            label={past ? 'Event ended' : event.rsvp === 'going' ? 'View ticket' : paid ? 'RSVP & pay' : 'RSVP'}
            onPress={startRsvp}
            disabled={past}
          />
        ) : null}

        {step === 'account' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.h2, { color: colors.text }]}>Your details</Text>
            <AuthTextField label="Full name" value={name} onChangeText={setName} />
            <AuthTextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <HostPayoutCard event={event} />
            <PrimaryButton label="Continue to payment" onPress={() => setStep('pay')} />
          </View>
        ) : null}

        {step === 'pay' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.h2, { color: colors.text }]}>Payment</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 8 }}>
              Send {event.currency === 'USD' ? '$' : ''}
              {event.price} to the host account below to RSVP for {event.title}.
            </Text>
            <HostPayoutCard event={event} />
            <AuthTextField label="Card number" value={card} onChangeText={setCard} placeholder="4242 4242 4242 4242" keyboardType="number-pad" />
            <PrimaryButton label={busy ? 'Processing…' : `Pay ${event.currency === 'USD' ? '$' : ''}${event.price}`} onPress={pay} loading={busy} />
          </View>
        ) : null}

        {step === 'done' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.h2, { color: colors.online }]}>You’re in</Text>
            <Text style={{ color: colors.text, fontFamily: fonts.body, lineHeight: 22 }}>
              RSVP confirmed{paid ? ' and payment received' : ''}. A ticket is attached to {email || user?.email}.
            </Text>
            {paid ? <HostPayoutCard event={event} /> : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.display, fontSize: 26, marginTop: 8, letterSpacing: 0.2 },
  h2: { fontFamily: fonts.display, fontSize: 20, marginBottom: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  stack: { borderRadius: radius.md, padding: 12, gap: 6 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pricePill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  card: { borderRadius: radius.md, borderWidth: 1, padding: 14, gap: 4, marginTop: 8 },
});
