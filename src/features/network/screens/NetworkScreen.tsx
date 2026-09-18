import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
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
import { CyberFilterModal } from '../../../components/cyber/CyberFilterModal';
import { CyberSeeAllButton } from '../../../components/cyber/CyberSeeAllButton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNetworkStore } from '../../../store/networkStore';
import { useChatStore } from '../../../store/chatStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, useTheme } from '../../../theme';
import { personMatchScore, teamMatchScore } from '../../../utils/matching';

const FILTERS = ['ALL', 'OPEN ROLES', 'DESIGN', 'DEVELOPERS', 'MY MATCHES'] as const;

export function NetworkScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { isDeveloper, user } = useAuth();

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

  useEffect(() => {
    if (user) {
      fetchPeople(user.id);
      fetchTeams(user.id);
    }
  }, [user, fetchPeople, fetchTeams]);

  // Re-fetch on every focus — a connection request you sent can get accepted/declined on the
  // other person's device with no realtime push to this one, so returning to this screen is
  // the only reliable moment to pick up the real status instead of a stale "Pending".
  useFocusEffect(
    useCallback(() => {
      if (user) fetchPeople(user.id);
    }, [user, fetchPeople]),
  );

  const refreshControl = useRefreshControl(async () => {
    if (user) await Promise.all([fetchPeople(user.id), fetchTeams(user.id)]);
  });

  const myTags = useMemo(
    () => ({ skills: user?.skills ?? [], roles: user?.roles ?? [] }),
    [user?.skills, user?.roles],
  );

  const filteredTeams = useMemo(() => {
    let result = teams;
    if (filter === 'MY MATCHES') {
      result = result.filter((t) => t.posterId === user?.id);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.project.toLowerCase().includes(q) ||
          t.excerpt.toLowerCase().includes(q) ||
          t.roles.some((r) => r.toLowerCase().includes(q)),
      );
    }
    return result
      .map((team) => ({ team, score: teamMatchScore(myTags, team) }))
      .sort((a, b) => b.score - a.score);
  }, [teams, filter, searchQuery, user?.id, myTags]);

  const filteredPeople = useMemo(() => {
    let result = people.filter((p) => p.id !== user?.id);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
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
  }, [people, searchQuery, user?.id, myTags]);

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
            <Text style={[styles.headerSubtitle, { color: colors.electricAccent }]} numberOfLines={1}>OPEN ROLES AND MATCHING DEVELOPERS</Text>
          </View>
        </View>

        {isDeveloper ? (
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
        ) : null}
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
              placeholder="Search communities, demos, experts..."
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
            </View>
          </CyberCutBox>
        </Pressable>
      </View>

      {/* Filter Chips Horizontal Row */}
      <ScrollView
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
      </ScrollView>

      {/* Section 1: Open Team Requests */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Open team requests</Text>
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedBadgeText}>MATCHED TO YOUR SKILLS</Text>
            </View>
          </View>
          <LinearGradient
            colors={['#00F0FF', 'rgba(216, 60, 255, 0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.glowingLine}
          />
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

        {/* Team Request Cards */}
        {!loading && !error
          ? filteredTeams.map(({ team, score }) => {
              const isApplied = applied.has(team.id);
              return (
                <View key={team.id} style={styles.teamCardTouch}>
                  <CyberCutBox
                    cutSize={14}
                    radius={8}
                    fill={colors.cardFill}
                    borderColor={colors.cardBorder}
                    borderWidth={1}
                    style={styles.teamCardCut}
                  >
                    <View style={styles.teamCardInner}>
                      {/* Top Badges + Match Score */}
                      <View style={styles.teamTopBadgesRow}>
                        <View style={styles.roleBadgesRow}>
                          <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>
                              {(team.roles[0] || 'SOUND DESIGNER').toUpperCase()}
                            </Text>
                          </View>
                          <View style={[styles.slicePill, { backgroundColor: colors.cardBorder }]}>
                            <Text style={[styles.slicePillText, { color: colors.muted }]}>VERTICAL SLICE</Text>
                          </View>
                        </View>
                        <Text style={[styles.matchScoreText, { color: colors.text }]}>{`${score}% match`}</Text>
                      </View>

                      {/* Title & Studio info */}
                      <View style={styles.teamTitleRow}>
                        <View style={styles.teamAvatarBox}>
                          <Image
                            source={getCyberAvatarSource(team.posterId)}
                            style={styles.teamAvatarImg}
                          />
                        </View>
                        <View style={styles.teamTitleWrap}>
                          <Text style={[styles.teamProjectTitle, { color: colors.text }]}>{team.project}</Text>
                          <Text style={[styles.teamStudioSubtext, { color: colors.muted }]}>
                            ASHFALL STUDIO · STUDIO · 4 PEOPLE
                          </Text>
                        </View>
                      </View>

                      {/* Excerpt Description */}
                      <Text style={[styles.teamExcerptText, { color: colors.text }]} numberOfLines={2}>
                        {team.excerpt ||
                          'We have combat and UI hooks wired; we need an implementer to own the adaptive layer through demo launch.'}
                      </Text>

                      {/* Engine & Location Grid */}
                      <View style={[styles.teamDetailGrid, { backgroundColor: colors.inputFill }]}>
                        <View style={styles.gridCol}>
                          <Text style={[styles.gridLabel, { color: colors.muted2 }]}>ENGINE</Text>
                          <Text style={[styles.gridValue, { color: colors.text }]}>Unity</Text>
                        </View>
                        <View style={styles.gridCol}>
                          <Text style={[styles.gridLabel, { color: colors.muted2 }]}>LOCATION</Text>
                          <Text style={[styles.gridValue, { color: colors.text }]}>Remote · UTC+3</Text>
                        </View>
                      </View>

                      {/* Skill Tags */}
                      <View style={styles.tagsRow}>
                        {(team.roles.length > 0 ? team.roles : ['SOUND DESIGNER', 'WWISE', 'ADAPTIVE MUSIC']).map(
                          (r) => (
                            <View key={r} style={styles.tagPill}>
                              <Text style={styles.tagText}>{r.toUpperCase()}</Text>
                            </View>
                          ),
                        )}
                      </View>

                      {/* Footer Row */}
                      <View style={[styles.teamFooterRow, { borderTopColor: colors.cardBorder }]}>
                        <Text style={[styles.hoursRevText, { color: colors.muted }]}>~10 HRS/WEEK · REV</Text>

                        <View style={styles.actionBtnsRow}>
                          <Pressable
                            onPress={() => useProfilePreviewStore.getState().open(team.posterId)}
                            style={styles.portfolioBtnTouch}
                            accessibilityRole="button"
                          >
                            <CyberCutBox
                              cutSize={6}
                              radius={4}
                              fill={colors.inputFill}
                              borderColor={colors.cardBorder}
                              borderWidth={1}
                              style={styles.portfolioCutBox}
                            >
                              <Text style={[styles.portfolioBtnText, { color: colors.muted }]}>PORTFOLIO</Text>
                            </CyberCutBox>
                          </Pressable>

                          <Pressable
                            onPress={async () => {
                              if (!user || isApplied) return;
                              await applyTeam(user.id, team.id);
                            }}
                            disabled={isApplied}
                            style={styles.requestJoinTouch}
                            accessibilityRole="button"
                          >
                            <CyberCutBox
                              cutSize={6}
                              radius={4}
                              gradient={!isApplied}
                              fill={isApplied ? 'rgba(255, 255, 255, 0.1)' : undefined}
                              borderColor={isApplied ? 'rgba(255, 255, 255, 0.2)' : undefined}
                              borderWidth={isApplied ? 1 : 0}
                              style={styles.requestJoinCutBox}
                            >
                              <View style={styles.requestJoinInner}>
                                <Text style={styles.requestJoinText}>
                                  {isApplied ? 'REQUESTED' : 'REQUEST TO JOIN'}
                                </Text>
                              </View>
                            </CyberCutBox>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </CyberCutBox>
                </View>
              );
            })
          : null}

        {!loading && !error && filteredTeams.length > 0 ? (
          <LoadMoreButton hasMore={teamsHasMore} onPress={loadMoreTeams} />
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

        <ScrollView
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
              avatarSource={getCyberAvatarSource(person.id)}
              status={person.connect}
              onConnect={async () => {
                if (!user || person.connect !== 'connect') return;
                await connectPerson(user.id, person.id);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <CyberFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={() => {}}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  teamCardTouch: {
    marginBottom: 16,
  },
  teamCardCut: {
    width: '100%',
  },
  teamCardInner: {
    padding: 16,
    gap: 12,
  },
  teamTopBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    backgroundColor: 'rgba(216, 60, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rolePillText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.5,
  },
  slicePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slicePillText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: '#8E9BB5',
    letterSpacing: 0.5,
  },
  matchScoreText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F0FF',
    overflow: 'hidden',
  },
  teamAvatarImg: {
    width: '100%',
    height: '100%',
  },
  teamTitleWrap: {
    flex: 1,
    gap: 2,
  },
  teamProjectTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamStudioSubtext: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: '#8E9BB5',
    letterSpacing: 0.4,
  },
  teamExcerptText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    lineHeight: 19,
  },
  teamDetailGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(9, 15, 28, 0.6)',
    borderRadius: 6,
  },
  gridCol: {
    flex: 1,
    gap: 2,
  },
  gridLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#60718F',
    letterSpacing: 0.6,
  },
  gridValue: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#A6B4CE',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(109, 53, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(109, 53, 255, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.5,
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
  teamFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  hoursRevText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: '#8E9BB5',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portfolioBtnTouch: {
    height: 30,
  },
  portfolioCutBox: {
    height: 30,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioBtnText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#8E9BB5',
    letterSpacing: 0.4,
  },
  requestJoinTouch: {
    height: 30,
  },
  requestJoinCutBox: {
    height: 30,
  },
  requestJoinInner: {
    height: '100%',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestJoinText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  developersScroll: {
    paddingRight: 16,
  },
});
