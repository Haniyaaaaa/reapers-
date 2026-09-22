import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberDeveloperCard } from '../../../components/cards/CyberDeveloperCard';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { TeamFilterSheet } from '../../../components/network/TeamFilterSheet';
import { EMPTY_TEAM_FILTERS, teamFilterCount, teamFiltersToApi, type TeamFilterSelection } from '../../../utils/teamRequest';
import { CyberSeeAllButton } from '../../../components/cyber/CyberSeeAllButton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { getCyberAvatarSource, resolveAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNetworkStore } from '../../../store/networkStore';
import { STALE_MS } from '../../../store/swr';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useServerSearch } from '../../../hooks/useServerSearch';
import { searchPeople, searchTeamRequests } from '../../../services/supabase/network';
import { useChatStore } from '../../../store/chatStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, useTheme } from '../../../theme';
import { personMatchScore, teamMatchScore } from '../../../utils/matching';
import { TeamRequestCard } from '../../../components/cards/TeamRequestCard';
import { AutoCarousel } from '../../../components/layout/AutoCarousel';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const SLIDER_COUNT = 5;
const FILTERS = ['ALL', 'OPEN ROLES', 'DESIGN', 'DEVELOPERS', 'MY MATCHES'] as const;

export function NetworkScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();

  const people = useNetworkStore((s) => s.people);
  const teams = useNetworkStore((s) => s.teams);
  const teamsHasMore = useNetworkStore((s) => s.teamsHasMore);
  const applied = useNetworkStore((s) => s.appliedTeams);
  const loading = useNetworkStore((s) => s.loading);
  const error = useNetworkStore((s) => s.error);
  const fetchPeople = useNetworkStore((s) => s.fetchPeople);
  const fetchTeams = useNetworkStore((s) => s.fetchTeams);
  const loadMoreTeams = useNetworkStore((s) => s.loadMoreTeams);
  const connectPerson = useNetworkStore((s) => s.connectPerson);
  const applyTeam = useNetworkStore((s) => s.applyTeam);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [teamFilters, setTeamFilters] = useState<TeamFilterSelection>(EMPTY_TEAM_FILTERS);
  const activeFilterCount = teamFilterCount(teamFilters);

  const userId = user?.id;
  useEffect(() => {
    if (userId) {
      fetchPeople(userId, { ifStaleMs: STALE_MS });
      fetchTeams(userId, undefined, { ifStaleMs: STALE_MS });
    }
  }, [userId, fetchPeople, fetchTeams]);

  // Re-fetch on every focus — a connection request you sent can get accepted/declined on the
  // other person's device with no realtime push to this one, so returning to this screen is
  // the only reliable moment to pick up the real status instead of a stale "Pending".
  useFocusEffect(
    useCallback(() => {
      if (userId) fetchPeople(userId, { ifStaleMs: 10_000 });
    }, [userId, fetchPeople]),
  );

  const refreshControl = useRefreshControl(async () => {
    if (user) await Promise.all([fetchPeople(user.id), fetchTeams(user.id)]);
  });

  const myTags = useMemo(
    () => ({ skills: user?.skills ?? [], roles: user?.roles ?? [] }),
    [user?.skills, user?.roles],
  );

  // Search asks the server so it covers every team request and person, not just the pages/100
  // profiles already loaded (team filters still apply). The loaded data is filtered locally until
  // each answer arrives.
  const dq = useDebouncedValue(searchQuery);
  const teamSearch = useServerSearch(dq, (n) => searchTeamRequests(n, teamFiltersToApi(teamFilters)), { deps: [teamFilters] });
  const peopleSearch = useServerSearch(dq, (n) => searchPeople(user?.id ?? '', n), { enabled: !!user?.id });

  const filteredTeams = useMemo(() => {
    let result = teamSearch.results ?? teams;
    if (filter === 'MY MATCHES') {
      result = result.filter((t) => t.posterId === user?.id);
    }
    if (teamSearch.needle && teamSearch.results === null) {
      const q = teamSearch.needle;
      result = result.filter(
        (t) =>
          t.project.toLowerCase().includes(q) ||
          t.excerpt.toLowerCase().includes(q) ||
          (t.studio ?? '').toLowerCase().includes(q) ||
          (t.engine ?? '').toLowerCase().includes(q) ||
          t.roles.some((r) => r.toLowerCase().includes(q)),
      );
    }
    return result
      .map((team) => ({ team, score: teamMatchScore(myTags, team) }))
      .sort((a, b) => b.score - a.score);
  }, [teams, teamSearch.results, teamSearch.needle, filter, user?.id, myTags]);

  const filteredPeople = useMemo(() => {
    let result = (peopleSearch.results ?? people).filter((p) => p.id !== user?.id);
    if (peopleSearch.needle && peopleSearch.results === null) {
      const q = peopleSearch.needle;
      result = result.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q)) ||
          p.roles.some((r) => r.toLowerCase().includes(q)),
      );
    }
    return result
      .map((person) => ({ person, score: personMatchScore(myTags, person) }))
      .sort((a, b) => b.score - a.score);
  }, [people, peopleSearch.results, peopleSearch.needle, user?.id, myTags]);

  return (
    <Screen refreshControl={refreshControl}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftGroup}>
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

          <View style={styles.titleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Find teammates</Text>
          </View>
        </View>

        <Pressable
          onPress={() => nav.navigate('PostTeamRequest')}
          style={styles.postBtnTouch}
          accessibilityRole="button"
          accessibilityLabel="Post team request"
        >
          <CyberCutBox
            cutSize={8}
            radius={4}
            gradient
            style={styles.postCutBox}
          >
            <View style={styles.postBtnInner}>
              <Text style={styles.postBtnText}>+ Request</Text>
            </View>
          </CyberCutBox>
        </Pressable>
      </View>

      {/* Search Bar + Filter Options Button */}
      <View style={styles.searchRow}>
        <CyberCutBox
          cutSize={10}
          radius={6}
          fill={colors.inputFill}
          borderColor={colors.inputBorder}
          borderWidth={1}
          style={styles.searchBox}
        >
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color={colors.muted2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search teams and people..."
              placeholderTextColor={colors.muted2}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted2} />
              </Pressable>
            ) : null}
          </View>
        </CyberCutBox>

        <Pressable
          onPress={() => setShowFilterModal(true)}
          style={styles.filterOptionsBtn}
          accessibilityRole="button"
          accessibilityLabel="Filter options"
        >
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.filterBtnCut}
          >
            <View style={styles.filterBtnInner}>
              <Ionicons name="options-outline" size={20} color={colors.electricAccent} />
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </View>
          </CyberCutBox>
        </Pressable>
      </View>

      {/* Filter Chips Horizontal Row */}
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {FILTERS.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={styles.chipPressable}
              accessibilityRole="button"
            >
              {active ? (
                <LinearGradient
                  colors={['#00F0FF', '#7928CA', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeChipGradient}
                >
                  <Text style={styles.activeChipText}>{item}</Text>
                </LinearGradient>
              ) : (
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.inactiveChipCut}
                >
                  <View style={styles.inactiveChipInner}>
                    <Text style={[styles.inactiveChipText, { color: colors.muted }]}>{item}</Text>
                  </View>
                </CyberCutBox>
              )}
            </Pressable>
          );
        })}
      </KeyboardAwareScrollView>

      {/* Section 1: Open Team Requests */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Open team requests</Text>
            <CyberSeeAllButton onPress={() => nav.navigate('TeamRequestsList')} />
          </View>
          <LinearGradient
            colors={['#00F0FF', 'rgba(216, 60, 255, 0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.glowingLine}
          />
          <View style={[styles.matchedBadge, { alignSelf: 'flex-start', marginTop: 10 }]}>
            <Text style={styles.matchedBadgeText}>MATCHED TO YOUR SKILLS</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Skeleton width="100%" height={220} />
            <Skeleton width="100%" height={220} />
          </View>
        ) : null}

        {!loading && error ? <RetryBanner onRetry={() => user && fetchTeams(user.id)} /> : null}

        {!loading && !error && filteredTeams.length === 0 ? (
          <EmptyState title="No team requests active right now." />
        ) : null}

        {/* Team Request Cards — auto-advancing slider of the best matches; "See all" has the rest */}
        {!loading && !error && filteredTeams.length > 0 ? (
          <AutoCarousel
            items={filteredTeams.slice(0, SLIDER_COUNT)}
            keyExtractor={({ team }) => team.id}
            showDots
            renderItem={({ team, score }) => (
              <TeamRequestCard
                team={team}
                score={score}
                applied={applied.has(team.id)}
                onApply={() => {
                  if (user && !applied.has(team.id)) applyTeam(user.id, team.id);
                }}
                onPosterPress={() => useProfilePreviewStore.getState().open(team.posterId)}
                onPress={() => nav.navigate('TeamRequestDetail', { id: team.id })}
              />
            )}
          />
        ) : null}
      </View>

      {/* Section 2: People Near Your Stack (every discoverable person, any role — not just
          developers, despite the section's original name) */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>People near your stack</Text>
            <LinearGradient
              colors={['#00F0FF', 'rgba(216, 60, 255, 0.6)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowingLine}
            />
          </View>
          <CyberSeeAllButton onPress={() => nav.navigate('PeopleList')} />
        </View>

        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.developersScroll}
        >
          {filteredPeople.map(({ person, score }) => (
            <CyberDeveloperCard
              key={person.id}
              id={person.id}
              name={person.displayName}
              role={person.roles[0] || 'Game Developer'}
              matchScore={`${score}%`}
              avatarUri={person.avatarUri}
              avatarSource={getCyberAvatarSource(person.avatarId)}
              status={person.connect}
              onConnect={async () => {
                if (!user || person.connect !== 'connect') return;
                await connectPerson(user.id, person.id);
              }}
            />
          ))}
        </KeyboardAwareScrollView>
      </View>

      <TeamFilterSheet
        visible={showFilterModal}
        value={teamFilters}
        onApply={(next) => {
          setTeamFilters(next);
          if (user) fetchTeams(user.id, teamFiltersToApi(next));
        }}
        onClose={() => setShowFilterModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#D83CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontFamily: fonts.monoBold, fontSize: 9, color: '#FFFFFF' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  titleWrap: {
    gap: 2,
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  postBtnTouch: {
    height: 38,
  },
  postCutBox: {
    height: 38,
  },
  postGradient: {
    height: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    height: 44,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
    height: '100%',
  },
  filterOptionsBtn: {
    width: 44,
    height: 44,
  },
  filterBtnCut: {
    width: 44,
    height: 44,
  },
  filterBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  chipPressable: {
    height: 34,
  },
  activeChipGradient: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChipText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  inactiveChipCut: {
    height: 34,
  },
  inactiveChipInner: {
    height: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveChipText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '600',
    color: '#8E9BB5',
    letterSpacing: 0.6,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeaderWrap: {
    marginBottom: 14,
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  seeAllText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12.5,
    color: '#8E9BB5',
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  matchedBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  matchedBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  glowingLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  loadingContainer: {
    gap: 14,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  backBtnTouch: {
    width: 36,
    height: 36,
  },
  backCutBox: {
    width: 36,
    height: 36,
  },
  backInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnInner: {
    height: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  developersScroll: {
    paddingRight: 16,
  },
});
