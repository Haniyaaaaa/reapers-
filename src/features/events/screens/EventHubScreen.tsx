import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { EventRow } from '../../../components/cards/EventRow';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { FilterChip } from '../../../components/inputs/FilterChip';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, useTheme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import type { EventCategory } from '../../../types/event';

const CATS: Array<'All' | EventCategory> = ['All', 'Esports', 'Meetup', 'Tournament', 'LAN', 'Watch party', 'Workshop'];

export function EventHubScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { isDeveloper, user } = useAuth();
  const { phase } = useFakeLoad();
  const events = useCommunityStore((s) => s.events);
  const [type, setType] = useState<'All' | 'Online' | 'Physical'>('All');
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState<'date' | 'tag'>('date');

  const list = useMemo(() => {
    let rows = events.filter((e) => type === 'All' || e.type === type);
    if (cat !== 'All') rows = rows.filter((e) => e.category === cat);
    if (mine) rows = rows.filter((e) => e.rsvp === 'going' || e.posterName === user?.displayName);
    rows = [...rows].sort((a, b) =>
      sort === 'date' ? +new Date(a.startsAt) - +new Date(b.startsAt) : a.type.localeCompare(b.type),
    );
    return rows;
  }, [events, type, cat, mine, sort, user?.displayName]);

  return (
    <Screen>
      <ScreenHeader
        title="Events"
        onBack={() => nav.goBack()}
        right={
          isDeveloper ? (
            <Pressable onPress={() => nav.navigate('CreateEvent')} style={styles.icon} accessibilityRole="button" accessibilityLabel="Create event">
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
          ) : null
        }
      />
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 10 }}>Esports, meetups, LANs, and watch parties</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {CATS.map((t) => (
          <FilterChip key={t} label={t} selected={cat === t} onPress={() => setCat(t)} />
        ))}
      </ScrollView>
      <View style={styles.row}>
        {(['All', 'Online', 'Physical'] as const).map((t) => (
          <FilterChip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
        ))}
      </View>
      <View style={styles.row}>
        <FilterChip label="My events" selected={mine} onPress={() => setMine((v) => !v)} />
        <FilterChip label="Sort date" selected={sort === 'date'} onPress={() => setSort('date')} />
        <FilterChip label="Sort type" selected={sort === 'tag'} onPress={() => setSort('tag')} />
      </View>
      {phase === 'loading' ? <Skeleton width="100%" height={72} /> : null}
      {phase === 'ready' && list.length === 0 ? <EmptyState title="No events match that filter." /> : null}
      {phase === 'ready'
        ? list.map((e) => (
            <View key={e.id} style={{ marginBottom: 10 }}>
              <EventRow event={e} onPress={() => nav.navigate('EventDetail', { id: e.id })} />
            </View>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
