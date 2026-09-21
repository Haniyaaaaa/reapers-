import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MainStackParamList } from '../../../navigation/types';
import { TeamRequestCard } from '../../../components/cards/TeamRequestCard';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useServerSearch } from '../../../hooks/useServerSearch';
import { searchTeamRequests } from '../../../services/supabase/network';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNetworkStore } from '../../../store/networkStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, useTheme } from '../../../theme';
import { teamMatchScore } from '../../../utils/matching';

/** The full "See all" list behind the Find teammates slider: every open team request, best skill
 * match first, with search and pagination. */
export function TeamRequestsListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();

  const teams = useNetworkStore((s) => s.teams);
  const teamsHasMore = useNetworkStore((s) => s.teamsHasMore);
  const applied = useNetworkStore((s) => s.appliedTeams);
  const loading = useNetworkStore((s) => s.loading);
  const error = useNetworkStore((s) => s.error);
  const fetchTeams = useNetworkStore((s) => s.fetchTeams);
  const loadMoreTeams = useNetworkStore((s) => s.loadMoreTeams);
  const applyTeam = useNetworkStore((s) => s.applyTeam);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) fetchTeams(user.id);
  }, [user, fetchTeams]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchTeams(user.id);
  });

  const myTags = useMemo(() => ({ skills: user?.skills ?? [], roles: user?.roles ?? [] }), [user?.skills, user?.roles]);

  // Search asks the server so it covers every open request (with the active team filters applied);
  // the loaded list is filtered locally until the answer arrives.
  const teamsFilter = useNetworkStore((s) => s.teamsFilter);
  const dq = useDebouncedValue(searchQuery);
  const teamSearch = useServerSearch(dq, (n) => searchTeamRequests(n, teamsFilter), { deps: [teamsFilter] });
  const searchActive = teamSearch.needle.length > 0;

  const results = useMemo(() => {
    const q = teamSearch.needle;
    const source = teamSearch.results ?? teams;
    const matching = q && teamSearch.results === null
      ? source.filter(
          (t) =>
            t.project.toLowerCase().includes(q) ||
            t.excerpt.toLowerCase().includes(q) ||
            (t.studio ?? '').toLowerCase().includes(q) ||
            (t.engine ?? '').toLowerCase().includes(q) ||
            t.roles.some((r) => r.toLowerCase().includes(q)),
        )
      : source;
    return matching.map((team) => ({ team, score: teamMatchScore(myTags, team) })).sort((a, b) => b.score - a.score);
  }, [teams, teamSearch.results, teamSearch.needle, myTags]);

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="Team requests" onBack={() => nav.goBack()} />

      <View style={styles.searchRow}>
        <CyberCutBox cutSize={10} radius={6} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.searchBox}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color={colors.muted2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search projects, roles, engines..."
              placeholderTextColor={colors.muted2}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </CyberCutBox>
      </View>

      {!loading && !error ? (
        <Text style={[styles.countText, { color: colors.muted }]}>
          {results.length} OPEN {results.length === 1 ? 'REQUEST' : 'REQUESTS'} · BEST MATCH FIRST
        </Text>
      ) : null}

      {loading && teams.length === 0 ? (
        <View style={{ gap: 12 }}>
          <Skeleton width="100%" height={220} />
          <Skeleton width="100%" height={220} />
        </View>
      ) : null}

      {!loading && error ? <RetryBanner onRetry={() => user && fetchTeams(user.id)} /> : null}

      {!loading && !error && results.length === 0 && !teamSearch.searching ? (
        <EmptyState title={searchQuery.trim() ? 'No team requests match your search.' : 'No team requests active right now.'} />
      ) : null}

      {!error
        ? results.map(({ team, score }) => (
            <TeamRequestCard
              key={team.id}
              team={team}
              score={score}
              applied={applied.has(team.id)}
              onApply={() => {
                if (user && !applied.has(team.id)) applyTeam(user.id, team.id);
              }}
              onPosterPress={() => useProfilePreviewStore.getState().open(team.posterId)}
                onPress={() => nav.navigate('TeamRequestDetail', { id: team.id })}
            />
          ))
        : null}

      {!loading && !error && results.length > 0 && !searchActive ? <LoadMoreButton hasMore={teamsHasMore} onPress={loadMoreTeams} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { marginBottom: 12 },
  searchBox: { height: 44 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: '100%', gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, height: '100%' },
  countText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, marginBottom: 12 },
});
