import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberEventRowCard } from '../../../components/cards/CyberEventRowCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useEventStore } from '../../../store/eventStore';
import { DATE_BUCKETS, matchesDateBucket, type DateBucket } from '../../../utils/dateFilters';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return 'TBD';
  }
}

type RoleFilter = 'ALL' | 'HOSTING' | 'GOING';
type TimeFilter = 'UPCOMING' | 'PAST' | 'ALL';
const ROLE_FILTERS: RoleFilter[] = ['ALL', 'HOSTING', 'GOING'];
const TIME_FILTERS: TimeFilter[] = ['UPCOMING', 'PAST', 'ALL'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.chipTouch}>
      <CyberCutBox
        gradient={active}
        cutSize={6}
        radius={4}
        fill={active ? undefined : colors.cardFill}
        borderColor={active ? undefined : colors.cardBorder}
        borderWidth={active ? 0 : 0.88}
        style={styles.chipCut}
      >
        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.muted }, active && styles.chipTextActive]}>{label}</Text>
      </CyberCutBox>
    </Pressable>
  );
}

/** Events you host or are RSVP'd 'going' to — reachable from the profile screen's quick
 * links, same convention as MyBookings/MyPosts. */
export function MyEventsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const myEvents = useEventStore((s) => s.myEvents);
  const loading = useEventStore((s) => s.myEventsLoading);
  const fetchMyEvents = useEventStore((s) => s.fetchMyEvents);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('UPCOMING');
  const [dateBucket, setDateBucket] = useState<DateBucket>('ALL');

  useEffect(() => {
    if (user) fetchMyEvents(user.id);
  }, [user, fetchMyEvents]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchMyEvents(user.id);
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    return myEvents.filter((ev) => {
      const isHost = ev.hostId === user?.id;
      if (roleFilter === 'HOSTING' && !isHost) return false;
      if (roleFilter === 'GOING' && isHost) return false;
      const startsAtMs = new Date(ev.startsAt).getTime();
      if (timeFilter === 'UPCOMING' && startsAtMs < now) return false;
      if (timeFilter === 'PAST' && startsAtMs >= now) return false;
      if (!matchesDateBucket(ev.startsAt, dateBucket)) return false;
      return true;
    });
  }, [myEvents, roleFilter, timeFilter, dateBucket, user?.id]);

  const totals = useMemo(() => {
    const now = Date.now();
    return {
      hosting: myEvents.filter((e) => e.hostId === user?.id).length,
      going: myEvents.filter((e) => e.hostId !== user?.id).length,
      upcoming: myEvents.filter((e) => new Date(e.startsAt).getTime() >= now).length,
    };
  }, [myEvents, user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CyberBackground showArtwork={false} />
      <Screen refreshControl={refreshControl}>
        <ScreenHeader title="My Events" onBack={() => nav.goBack()} />

        <View style={styles.statsRow}>
          <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
            <View style={styles.statInner}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totals.hosting}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>HOSTING</Text>
            </View>
          </CyberCutBox>
          <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
            <View style={styles.statInner}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totals.going}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>GOING</Text>
            </View>
          </CyberCutBox>
          <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
            <View style={styles.statInner}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totals.upcoming}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>UPCOMING</Text>
            </View>
          </CyberCutBox>
        </View>

        <Text style={[styles.filterLabel, { color: colors.muted }]}>ROLE</Text>
        <View style={styles.chipRow}>
          {ROLE_FILTERS.map((f) => (
            <Chip key={f} label={f} active={roleFilter === f} onPress={() => setRoleFilter(f)} />
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: colors.muted }]}>WHEN</Text>
        <View style={styles.chipRow}>
          {TIME_FILTERS.map((f) => (
            <Chip key={f} label={f} active={timeFilter === f} onPress={() => setTimeFilter(f)} />
          ))}
        </View>

        <Text style={[styles.filterLabel, { color: colors.muted }]}>DATE</Text>
        <View style={styles.chipRow}>
          {DATE_BUCKETS.map((b) => (
            <Chip key={b} label={b} active={dateBucket === b} onPress={() => setDateBucket(b)} />
          ))}
        </View>

        <LinearGradient
          colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.divider}
        />

        {!loading && filtered.length === 0 ? (
          <EmptyState title={myEvents.length === 0 ? 'No events yet. Events you host or RSVP to show up here.' : 'No events match these filters.'} />
        ) : null}

        {filtered.map((ev) => (
          <CyberEventRowCard
            key={ev.id}
            id={ev.id}
            title={ev.title}
            category={ev.category ?? ev.type}
            type={ev.type}
            dateStr={ev.hostId === user?.id ? `${formatDate(ev.startsAt)} · HOSTING` : `${formatDate(ev.startsAt)} · GOING`}
            attendeesCount={ev.attendeeCount}
            imageSource={{ uri: ev.cover }}
            onPress={() => nav.navigate('EventDetail', { id: ev.id })}
          />
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statTile: { flex: 1, height: 62 },
  statInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.6, color: '#8E9BB5', marginTop: 2 },
  filterLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: '#8E9BB5', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chipTouch: { minWidth: 72 },
  chipCut: { height: 32, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5, color: '#8E9BB5' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  divider: { height: 2, borderRadius: 1, width: '100%', marginBottom: 18 },
});
