import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { PersonListCard } from '../../../components/cards/PersonListCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useServerSearch } from '../../../hooks/useServerSearch';
import { searchPeople } from '../../../services/supabase/network';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNetworkStore } from '../../../store/networkStore';
import { personMatchScore } from '../../../utils/matching';
import { fonts, useTheme } from '../../../theme';

/** The real "view all" for the network directory — replaces the horizontal card carousel
 * (fine for a curated home-screen teaser, but a poor way to actually browse everyone) with a
 * proper searchable vertical list. Same data/actions as NetworkScreen's own section, just not
 * squeezed into a fixed-width scroller. */
export function PeopleListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();

  const people = useNetworkStore((s) => s.people);
  const loading = useNetworkStore((s) => s.loading);
  const fetchPeople = useNetworkStore((s) => s.fetchPeople);
  const connectPerson = useNetworkStore((s) => s.connectPerson);

  const [search, setSearch] = useState('');
  const myTags = useMemo(() => ({ skills: user?.skills ?? [], roles: user?.roles ?? [] }), [user?.skills, user?.roles]);

  useEffect(() => {
    if (user) fetchPeople(user.id);
  }, [user, fetchPeople]);

  // Re-fetch on every focus — see NetworkScreen's identical fix for why a stale "Pending" can
  // otherwise persist after the other person responds on their own device.
  useFocusEffect(
    useCallback(() => {
      if (user) fetchPeople(user.id);
    }, [user, fetchPeople]),
  );

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchPeople(user.id);
  });

  // Search asks the server so it covers everyone discoverable, not just the 100 profiles loaded;
  // the loaded list is filtered locally until the answer arrives.
  const debouncedSearch = useDebouncedValue(search);
  const peopleSearch = useServerSearch(debouncedSearch, (n) => searchPeople(user?.id ?? '', n), { enabled: !!user?.id });

  const filtered = useMemo(() => {
    const needle = peopleSearch.needle;
    const base = (peopleSearch.results ?? people).filter((p) => p.id !== user?.id);
    const matched = needle && peopleSearch.results === null
      ? base.filter(
          (p) =>
            p.displayName.toLowerCase().includes(needle) ||
            p.skills.some((s) => s.toLowerCase().includes(needle)) ||
            p.roles.some((r) => r.toLowerCase().includes(needle)),
        )
      : base;
    return matched
      .map((person) => ({ person, score: personMatchScore(myTags, person) }))
      .sort((a, b) => b.score - a.score);
  }, [people, peopleSearch.results, peopleSearch.needle, user?.id, myTags]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />
      <Screen refreshControl={refreshControl}>
        <ScreenHeader title="Network" onBack={() => nav.goBack()} />

        <CyberCutBox cutSize={10} radius={6} fill={colors.inputFill} borderColor="rgba(0, 229, 255, 0.3)" borderWidth={1} style={styles.searchBox}>
          <View style={styles.searchInner}>
            <Ionicons name="search-outline" size={18} color={colors.cyan} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, role, or skill..."
              placeholderTextColor={colors.muted2}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </CyberCutBox>

        <Text style={[styles.countLabel, { color: colors.muted }]}>{filtered.length} {filtered.length === 1 ? 'PERSON' : 'PEOPLE'}</Text>

        {!loading && filtered.length === 0 ? <EmptyState title="No one matches yet." /> : null}

        {filtered.map(({ person, score }) => (
          <PersonListCard
            key={person.id}
            person={person}
            matchScore={score}
            onPress={() => nav.navigate('Profile', { id: person.id })}
            onConnect={() => user && person.connect === 'connect' && connectPerson(user.id, person.id)}
          />
        ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090F1C' },
  searchBox: { height: 44, marginBottom: 14 },
  searchInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: '100%', gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: '#FFFFFF', height: '100%' },
  countLabel: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.2, marginBottom: 10 },
});
