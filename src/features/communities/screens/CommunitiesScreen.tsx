import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberCommunityFeaturedCard } from '../../../components/cards/CyberCommunityFeaturedCard';
import { CyberCommunityWideCard } from '../../../components/cards/CyberCommunityWideCard';
import { CyberCommunityCard } from '../../../components/cards/CyberCommunityCard';
import { CyberSeeAllButton } from '../../../components/cyber/CyberSeeAllButton';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { useAuth } from '../../../hooks/useAuth';
import { STALE_MS } from '../../../store/swr';
import { useCommunitiesStore } from '../../../store/communitiesStore';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import type { Community } from '../../../types/community';
import { fonts, useTheme } from '../../../theme';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';
import {
  CommunityFilterSheet,
  EMPTY_COMMUNITY_FILTERS,
  communityFilterCount,
  matchesCommunityLocation,
  type CommunityFilters,
} from '../components/CommunityFilterSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 430);

const MAX_TAG_CHIPS = 8;

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'CommunitiesTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function CommunitiesScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const communities = useCommunitiesStore((s) => s.communities);
  const loading = useCommunitiesStore((s) => s.loading);
  const error = useCommunitiesStore((s) => s.error);
  const fetchCommunities = useCommunitiesStore((s) => s.fetchCommunities);
  const communitiesHasMore = useCommunitiesStore((s) => s.communitiesHasMore);
  const loadMoreCommunities = useCommunitiesStore((s) => s.loadMoreCommunities);
  const searchResults = useCommunitiesStore((s) => s.searchResults);
  const searchedQuery = useCommunitiesStore((s) => s.searchedQuery);
  const searchCommunities = useCommunitiesStore((s) => s.searchCommunities);
  const joinCommunity = useCommunitiesStore((s) => s.joinCommunity);
  const leaveCommunity = useCommunitiesStore((s) => s.leaveCommunity);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filters, setFilters] = useState<CommunityFilters>(EMPTY_COMMUNITY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchCommunities(user.id, { ifStaleMs: STALE_MS });
    }
  }, [user?.id, fetchCommunities]);

  // Search asks the server (so it finds communities beyond the page already loaded). Until that
  // answer arrives the list is filtered locally, so typing never feels laggy.
  useEffect(() => {
    if (user?.id) searchCommunities(user.id, dq);
  }, [user?.id, dq, searchCommunities]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await fetchCommunities(user.id);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchCommunities]);

  // Chips come from the tags communities actually have (most used first), not a hardcoded guess.
  const tagChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of communities) for (const t of c.tags ?? []) counts.set(t.toUpperCase(), (counts.get(t.toUpperCase()) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TAG_CHIPS)
      .map(([t]) => t);
  }, [communities]);
  const chips = useMemo(() => ['ALL', 'JOINED', ...tagChips], [tagChips]);

  // Places communities actually list, for the filter sheet.
  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const c of communities) if (c.location?.trim()) set.add(c.location.trim());
    return Array.from(set).slice(0, 10);
  }, [communities]);

  // ONE filtered list drives every section below (featured, yours, recommended) — search, the
  // chips and the filter sheet all apply to it. Previously only the featured card used it.
  const needle = dq.trim().toLowerCase();
  const serverReady = needle.length > 0 && searchedQuery === needle;
  const searching = needle.length > 0 && !serverReady;

  const filtered = useMemo(() => {
    const source = serverReady ? searchResults : communities;
    const list = source.filter((c) => {
      if (searching && !(c.shortName.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle) || c.description.toLowerCase().includes(needle) || (c.location ?? '').toLowerCase().includes(needle))) return false;
      if (selectedCategory === 'JOINED') {
        if (!c.joined) return false;
      } else if (selectedCategory !== 'ALL') {
        if (!(c.tags ?? []).some((t) => t.toUpperCase() === selectedCategory)) return false;
      }
      if (filters.minMembers > 0 && c.memberCount < filters.minMembers) return false;
      if (!matchesCommunityLocation(c.location, filters.location)) return false;
      return true;
    });
    if (filters.sort === 'members') return [...list].sort((a, b) => b.memberCount - a.memberCount);
    if (filters.sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [communities, searchResults, serverReady, searching, needle, selectedCategory, filters]);

  const filterCount = communityFilterCount(filters);
  const isFiltering = needle.length > 0 || selectedCategory !== 'ALL' || filterCount > 0;
  const clearFilters = () => {
    setQ('');
    setSelectedCategory('ALL');
    setFilters(EMPTY_COMMUNITY_FILTERS);
  };

  const yours = useMemo(() => filtered.filter((c) => c.joined), [filtered]);
  const discover = useMemo(() => filtered.filter((c) => !c.joined), [filtered]);
  const joinedTotal = useMemo(() => communities.filter((c) => c.joined).length, [communities]);

  // Featured community: the top match — no fallback to an unrelated one when nothing matches.
  const featured = filtered[0];

  // Helper for generating tags from description or preset
  const getCommunityTags = (c: Community): string[] => {
    // Real tags win; the keyword guess below only covers older communities that have none.
    if (c.tags?.length) return c.tags.map((t) => t.toUpperCase());
    const text = `${c.name} ${c.description}`.toLowerCase();
    const tags: string[] = [];
    if (text.includes('unity')) tags.push('UNITY');
    if (text.includes('c#')) tags.push('C#');
    if (text.includes('unreal')) tags.push('UNREAL');
    if (text.includes('art') || text.includes('2d')) tags.push('ART');
    if (text.includes('tool') || text.includes('pipeline')) tags.push('TOOLING');
    if (text.includes('3d') || text.includes('animation')) tags.push('3D');
    if (text.includes('audio') || text.includes('sound')) tags.push('AUDIO');
    if (tags.length === 0) tags.push('ENGINES', 'INDIE', 'DEV');
    return tags;
  };

  const renderSectionHeader = (title: string, onManage?: () => void) => (
    <View style={styles.sectionHeaderWrap}>
      <View style={styles.sectionTitleBlock}>
        <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
        <View style={styles.accentLineContainer}>
          <LinearGradient
            colors={['#00E5FF', '#D83CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
        </View>
      </View>

      {onManage && (
        <CyberSeeAllButton label="Manage" onPress={onManage} />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 14,
            paddingBottom: 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={['#00E5FF', '#D83CFF']}
          />
        }
      >
        <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {/* ================= 1. HEADER ROW ================= */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Communities</Text>
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                {communities.length} GUILDS · {joinedTotal} YOU FOLLOW
              </Text>
            </View>

            <Pressable
              onPress={() => nav.navigate('CreateCommunity')}
              style={styles.createBtnWrap}
              accessibilityRole="button"
              accessibilityLabel="Create community"
            >
              <CyberCutBox cutSize={8} radius={4} style={styles.createCutBox}>
                <LinearGradient
                  colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createGradient}
                >
                  <Text style={styles.createBtnText}>+ Create</Text>
                </LinearGradient>
              </CyberCutBox>
            </Pressable>
          </View>

          {/* ================= 2. SEARCH & FILTER ROW ================= */}
          <View style={styles.searchRow}>
            <View style={styles.searchFieldWrap}>
              <CyberCutBox
                cutSize={10}
                radius={4}
                fill={colors.inputFill}
                borderColor={colors.inputBorder}
                borderWidth={1}
                style={styles.searchCutBox}
              >
                <View style={styles.searchInner}>
                  <Ionicons name="search" size={16} color={colors.muted2} style={styles.searchIcon} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search communities..."
                    placeholderTextColor={colors.muted2}
                    style={[styles.searchInput, { color: colors.text }]}
                    returnKeyType="search"
                  />
                  {q.length > 0 && (
                    <Pressable onPress={() => setQ('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.muted2} />
                    </Pressable>
                  )}
                </View>
              </CyberCutBox>
            </View>

            {/* Chamfer Filter Button */}
            <Pressable
              onPress={() => setShowFilters(true)}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityLabel={filterCount > 0 ? `Filter communities, ${filterCount} active` : 'Filter communities'}
            >
              <CyberCutBox cutSize={8} radius={4} style={styles.filterCutBox}>
                <LinearGradient
                  colors={['#00E5FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterGradient}
                >
                  <Ionicons name="options-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
              </CyberCutBox>
              {filterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{filterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* ================= 3. CATEGORY CHIPS ================= */}
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {chips.map((chip) => {
              const isActive = selectedCategory === chip;
              return (
                <Pressable
                  key={chip}
                  onPress={() => setSelectedCategory(chip)}
                  style={styles.chipPressable}
                  accessibilityRole="button"
                >
                  <CyberCutBox
                    cutSize={6}
                    radius={3}
                    gradient={isActive}
                    fill={isActive ? undefined : colors.cardFill}
                    borderColor={isActive ? undefined : colors.cardBorder}
                    borderWidth={isActive ? 0 : 1}
                    style={styles.chipCutBox}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive ? styles.chipTextActive : [styles.chipTextInactive, { color: colors.muted }],
                      ]}
                    >
                      {chip}
                    </Text>
                  </CyberCutBox>
                </Pressable>
              );
            })}
          </KeyboardAwareScrollView>

          {/* Active filters stay visible here (each removable) so a chosen city doesn't silently
              disappear once the sheet closes. */}
          {filterCount > 0 ? (
            <View style={styles.activeFilterRow}>
              {filters.location ? (
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, location: null }))}
                  style={[styles.activePill, { backgroundColor: colors.cardBorder }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove location filter ${filters.location}`}
                >
                  <Ionicons name="location-outline" size={13} color={colors.electricAccent} />
                  <Text style={[styles.activePillText, { color: colors.text }]}>{filters.location.toUpperCase()}</Text>
                  <Ionicons name="close-circle" size={15} color={colors.muted} />
                </Pressable>
              ) : null}
              {filters.minMembers > 0 ? (
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, minMembers: 0 }))}
                  style={[styles.activePill, { backgroundColor: colors.cardBorder }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${filters.minMembers}+ members filter`}
                >
                  <Text style={[styles.activePillText, { color: colors.text }]}>{filters.minMembers}+ MEMBERS</Text>
                  <Ionicons name="close-circle" size={15} color={colors.muted} />
                </Pressable>
              ) : null}
              {filters.sort !== 'default' ? (
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, sort: 'default' }))}
                  style={[styles.activePill, { backgroundColor: colors.cardBorder }]}
                  accessibilityRole="button"
                  accessibilityLabel="Remove sort"
                >
                  <Text style={[styles.activePillText, { color: colors.text }]}>{filters.sort === 'members' ? 'MOST MEMBERS' : 'A–Z'}</Text>
                  <Ionicons name="close-circle" size={15} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {searching ? <Text style={[styles.searchingText, { color: colors.muted }]}>Searching all communities…</Text> : null}

          {/* No matches at all */}
          {!featured && isFiltering ? (
            <CyberCutBox cutSize={10} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No communities match</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Try a different search, tag or filter.</Text>
              <Pressable onPress={clearFilters} style={styles.clearBtn} accessibilityRole="button">
                <Text style={[styles.clearBtnText, { color: colors.electricAccent }]}>Clear all filters</Text>
              </Pressable>
            </CyberCutBox>
          ) : null}

          {/* ================= 4. FEATURED THIS WEEK ================= */}
          {featured && (
            <CyberCommunityFeaturedCard
              id={featured.id}
              name={featured.name}
              description={featured.description}
              memberCount={
                featured.memberCount >= 1000
                  ? `${(featured.memberCount / 1000).toFixed(1)}K`
                  : String(featured.memberCount)
              }
              avatarSource={featured.logo}
              joined={featured.joined}
              onPress={() => nav.navigate('CommunityDetail', { id: featured.id })}
              onToggleJoin={async () => {
                if (!user) return;
                if (featured.joined) await leaveCommunity(user.id, featured.id);
                else await joinCommunity(user.id, featured.id);
              }}
              onAction={() => nav.navigate('CommunityDetail', { id: featured.id })}
            />
          )}

          {/* ================= 5. YOUR COMMUNITIES ================= */}
          {renderSectionHeader('Your communities', () => {})}
          {yours.length > 0 ? (
            yours.map((c) => (
              <CyberCommunityWideCard
                key={c.id}
                id={c.id}
                name={c.name}
                memberCount={
                  c.memberCount >= 1000
                    ? `${(c.memberCount / 1000).toFixed(1)}k`
                    : String(c.memberCount)
                }
                description={c.description}
                tags={getCommunityTags(c)}
                avatarSource={c.logo}
                joined={c.joined}
                onPress={() => nav.navigate('CommunityDetail', { id: c.id })}
                onToggleJoin={async () => {
                  if (!user) return;
                  await leaveCommunity(user.id, c.id);
                }}
              />
            ))
          ) : (
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.emptyCard}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isFiltering && joinedTotal > 0 ? 'None of your communities match' : "You haven't joined any communities yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {isFiltering && joinedTotal > 0 ? 'Try a different search, tag or filter.' : 'Discover indie studios, tech guilds, and engine circles below.'}
              </Text>
            </CyberCutBox>
          )}

          {/* ================= 6. RECOMMENDED FOR YOU ================= */}
          {selectedCategory !== 'JOINED' ? renderSectionHeader('Recommended For You', () => {}) : null}
          {selectedCategory === 'JOINED' ? null : discover.length > 0 ? (
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollRow}
            >
              {discover.map((c) => (
                <CyberCommunityCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  memberCount={
                    c.memberCount >= 1000
                      ? `${(c.memberCount / 1000).toFixed(1)}K`
                      : String(c.memberCount)
                  }
                  description={c.description}
                  avatarSource={c.logo}
                  joined={c.joined}
                  onJoin={async () => {
                    if (!user) return;
                    await joinCommunity(user.id, c.id);
                  }}
                  onPress={() => nav.navigate('CommunityDetail', { id: c.id })}
                />
              ))}
            </KeyboardAwareScrollView>
          ) : (
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.emptyCard}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isFiltering ? 'No communities to discover match' : 'All communities joined!'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {isFiltering ? 'Try a different search, tag or filter.' : "You're following all public circles in the network."}
              </Text>
            </CyberCutBox>
          )}

          {/* More pages — only when browsing, not while a search is answering from the server */}
          {needle.length === 0 ? (
            <LoadMoreButton hasMore={communitiesHasMore} onPress={() => (user ? loadMoreCommunities(user.id) : undefined)} />
          ) : null}

          {/* ================= 7. FASTEST GROWING / TRENDING ================= */}
          <View style={styles.trendingHeaderWrap}>
            <Text style={[styles.trendingPreText, { color: colors.muted }]}>FASTEST GROWING</Text>
            <Text style={[styles.trendingTitleText, { color: colors.text }]}>Trending this week</Text>
          </View>

          <View style={styles.trendingEmptyBox}>
            <Text style={[styles.nothingText, { color: colors.muted2 }]}>
              Nothing to show, back to{' '}
              <Text
                onPress={() => nav.navigate('HomeTab')}
                style={[styles.homepageLink, { color: colors.primary }]}
              >
                HOMEPAGE
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <CommunityFilterSheet
        visible={showFilters}
        filters={filters}
        locations={locations}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activeFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15 },
  activePillText: { fontFamily: fonts.mono, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  innerContent: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  headerTitleWrap: {
    gap: 3,
  },
  headerTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  createBtnWrap: {
    alignSelf: 'center',
  },
  createCutBox: {
    overflow: 'hidden',
  },
  createGradient: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    width: '100%',
  },
  searchFieldWrap: {
    flex: 1,
  },
  searchCutBox: {
    width: '100%',
    height: 42,
    justifyContent: 'center',
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  filterBtn: {
    width: 42,
    height: 42,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontFamily: fonts.monoBold, fontSize: 9, color: '#FFFFFF' },
  searchingText: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.5, marginBottom: 10 },
  clearBtn: { marginTop: 10, minHeight: 32, justifyContent: 'center' },
  clearBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  filterCutBox: {
    width: 42,
    height: 42,
    overflow: 'hidden',
  },
  filterGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 20,
  },
  chipPressable: {
    height: 32,
  },
  chipCutBox: {
    paddingHorizontal: 14,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextInactive: {
    color: '#8E9BB5',
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 14,
    width: '100%',
  },
  sectionTitleBlock: {
    alignItems: 'flex-start',
  },
  sectionTitleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  accentLineContainer: {
    marginTop: 4,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  accentLine: {
    width: 36,
    height: 2,
    borderRadius: 1,
  },
  manageBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  manageText: {
    fontFamily: fonts.bodyMed,
    fontSize: 11.5,
    color: '#8E9BB5',
  },
  horizontalScrollRow: {
    paddingRight: 12,
    marginBottom: 8,
  },
  emptyCard: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#8E9BB5',
    textAlign: 'center',
    lineHeight: 16,
  },
  trendingHeaderWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
  trendingPreText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    marginBottom: 2,
  },
  trendingTitleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendingEmptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nothingText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
  },
  homepageLink: {
    color: '#00E5FF',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
});
