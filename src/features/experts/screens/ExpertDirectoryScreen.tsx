import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useState } from 'react';
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

import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberSeeAllButton } from '../../../components/cyber/CyberSeeAllButton';
import { ExpertListCard } from '../../../components/cards/ExpertListCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { EXPERTISE_TAGS } from '../../../types/expert';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useExpertStore } from '../../../store/expertStore';
import { isoWeekNumber } from '../../../utils/isoWeek';
import { fonts, useTheme } from '../../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'ExpertsTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const FILTERS = ['All', ...EXPERTISE_TAGS] as const;
const FEATURED_POOL_SIZE = 10;

export function ExpertDirectoryScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const { user } = useAuth();

  const experts = useExpertStore((s) => s.experts);
  const expertsHasMore = useExpertStore((s) => s.expertsHasMore);
  const expertsTotalCount = useExpertStore((s) => s.expertsTotalCount);
  const sessionCounts = useExpertStore((s) => s.sessionCounts);
  const loading = useExpertStore((s) => s.loading);
  const error = useExpertStore((s) => s.error);
  const fetchExperts = useExpertStore((s) => s.fetchExperts);
  const loadMoreExperts = useExpertStore((s) => s.loadMoreExperts);
  const recommendedExperts = useExpertStore((s) => s.recommendedExperts);
  const recommendedHasMore = useExpertStore((s) => s.recommendedHasMore);
  const recommendedIsFallback = useExpertStore((s) => s.recommendedIsFallback);
  const fetchRecommended = useExpertStore((s) => s.fetchRecommended);
  const loadMoreRecommended = useExpertStore((s) => s.loadMoreRecommended);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const category = filter === 'All' ? undefined : filter;
    fetchExperts(category, user?.id);
  }, [filter, user?.id, fetchExperts]);

  // Depend on a joined primitive, not the array itself — an array can get a new reference
  // every render even with identical contents, which would re-fire this effect forever.
  const skillsKey = (user?.skills ?? []).join(',');
  useEffect(() => {
    fetchRecommended(user?.skills ?? [], user?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, skillsKey, fetchRecommended]);

  const refreshControl = useRefreshControl(async () => {
    const category = filter === 'All' ? undefined : filter;
    await Promise.all([fetchExperts(category, user?.id), fetchRecommended(user?.skills ?? [], user?.id)]);
  });

  const filteredList = useMemo(() => {
    let result = experts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.company.toLowerCase().includes(q) ||
          e.specialties.some((s) => s.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [experts, searchQuery]);

  // "Expert of the Week": a deterministic weekly rotation among the top-rated pool, not the
  // frozen-forever #1 spot — every viewer computes the same pick for the same week, and it
  // genuinely changes the following week, with no server state needed.
  const featuredExpert = useMemo(() => {
    const pool = filteredList.slice(0, FEATURED_POOL_SIZE);
    if (pool.length === 0) return undefined;
    return pool[isoWeekNumber(new Date()) % pool.length];
  }, [filteredList]);

  const regularExperts = filteredList.filter((e) => e.id !== featuredExpert?.id);

  return (
    <Screen refreshControl={refreshControl}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Experts</Text>
          <Text style={[styles.headerSubtitle, { color: colors.electricAccent }]}>{expertsTotalCount} VERIFIED PROFESSIONALS · FREE FOR MEMBERS</Text>
        </View>
      </View>

      {/* Search Bar */}
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
      </View>

      {/* Filter Chips Horizontal Row — real EXPERTISE_TAGS, not a fake category set */}
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
                  <Text style={styles.activeChipText}>{item.toUpperCase()}</Text>
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
                    <Text style={[styles.inactiveChipText, { color: colors.muted }]}>{item.toUpperCase()}</Text>
                  </View>
                </CyberCutBox>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Section 1: Top Rated / Expert of the Week */}
      {featuredExpert && !loading ? (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderWrap}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Rated</Text>
              <LinearGradient
                colors={['#00F0FF', 'rgba(216, 60, 255, 0.6)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.glowingLine}
              />
            </View>
            <CyberSeeAllButton onPress={() => nav.navigate('ExpertsList', { mode: 'top_rated' })} />
          </View>

          <Pressable
            onPress={() => nav.navigate('ExpertProfile', { id: featuredExpert.id })}
            accessibilityRole="button"
          >
            <CyberCutBox
              cutSize={14}
              radius={8}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.featuredCardCut}
            >
              <View style={styles.featuredInner}>
                {/* Badges */}
                <View style={styles.featuredBadgesRow}>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>EXPERT OF THE WEEK</Text>
                  </View>
                  {featuredExpert.verified ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#00F0FF" />
                      <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                    </View>
                  ) : null}
                </View>

                {/* Expert Header Row */}
                <View style={styles.featuredExpertHeader}>
                  <View style={styles.featuredAvatarBox}>
                    <Image
                      source={getCyberAvatarSource(featuredExpert.avatarId)}
                      style={styles.featuredAvatarImg}
                    />
                  </View>
                  <View style={styles.featuredExpertInfo}>
                    <Text style={[styles.featuredName, { color: colors.text }]}>{featuredExpert.name}</Text>
                    <Text style={[styles.featuredRole, { color: colors.muted }]}>{featuredExpert.role}</Text>
                    {featuredExpert.company ? <Text style={[styles.featuredStudioTags, { color: colors.primary }]}>{featuredExpert.company.toUpperCase()}</Text> : null}
                  </View>
                </View>

                {/* Bio, real — not a hardcoded quote */}
                {featuredExpert.bio ? (
                  <Text style={[styles.featuredQuoteText, { color: colors.text }]} numberOfLines={2}>
                    {featuredExpert.bio}
                  </Text>
                ) : null}

                {/* Footer: Rating & Book 15 min button */}
                <View style={[styles.featuredFooterRow, { borderTopColor: colors.cardBorder }]}>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFB800" />
                    <Text style={[styles.ratingNum, { color: colors.text }]}>{featuredExpert.rating > 0 ? featuredExpert.rating.toFixed(1) : '—'}</Text>
                    <Text style={styles.ratingDot}>·</Text>
                    <Text style={[styles.sessionsText, { color: colors.muted }]}>{sessionCounts[featuredExpert.id] ?? 0} SESSIONS</Text>
                  </View>

                  <Pressable
                    onPress={() => nav.navigate('ExpertProfile', { id: featuredExpert.id })}
                    style={styles.book15Touch}
                    accessibilityRole="button"
                  >
                    <CyberCutBox
                      cutSize={8}
                      radius={4}
                      fill="transparent"
                      borderColor="rgba(0, 240, 255, 0.6)"
                      borderWidth={1}
                      style={styles.book15CutBox}
                    >
                      <LinearGradient
                        colors={['#00F0FF', '#7928CA', '#D83CFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.book15Gradient}
                      >
                        <Text style={styles.book15Text}>Book 15 min</Text>
                      </LinearGradient>
                    </CyberCutBox>
                  </Pressable>
                </View>
              </View>
            </CyberCutBox>
          </Pressable>
        </View>
      ) : null}

      {/* Section 2: Recommended — honestly relabeled when there's no real skill match */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{recommendedIsFallback ? 'More Top Experts' : 'Recommended For Your Project'}</Text>
            <LinearGradient
              colors={['#00F0FF', 'rgba(216, 60, 255, 0.6)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowingLine}
            />
          </View>
          <CyberSeeAllButton onPress={() => nav.navigate('ExpertsList', { mode: 'recommended' })} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Skeleton width="100%" height={160} />
            <Skeleton width="100%" height={160} />
          </View>
        ) : null}

        {!loading && error ? <RetryBanner message={`Could not load. ${error}`} onRetry={fetchExperts} /> : null}

        {!loading && !error && filteredList.length === 0 ? (
          <EmptyState title="No experts match that specialty." />
        ) : null}

        {!loading && !error
          ? recommendedExperts.slice(0, 5).map((e) => (
              <ExpertListCard key={e.id} expert={e} sessionCount={sessionCounts[e.id]} onPress={() => nav.navigate('ExpertProfile', { id: e.id })} />
            ))
          : null}

        {!loading && !error && filteredList.length > 0 && recommendedExperts.length === 0
          ? regularExperts.map((e) => (
              <ExpertListCard key={e.id} expert={e} sessionCount={sessionCounts[e.id]} onPress={() => nav.navigate('ExpertProfile', { id: e.id })} />
            ))
          : null}

        {!loading && !error && filteredList.length > 0 ? (
          <LoadMoreButton hasMore={recommendedExperts.length > 0 ? recommendedHasMore : expertsHasMore} onPress={() => (recommendedExperts.length > 0 ? loadMoreRecommended(user?.skills ?? [], user?.id) : loadMoreExperts())} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginBottom: 16,
    paddingTop: 4,
  },
  titleWrap: {
    gap: 4,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.8,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionHeaderWrap: {
    marginBottom: 14,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  seeAllText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#00F0FF',
    paddingVertical: 4,
  },
  glowingLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  featuredCardCut: {
    width: '100%',
  },
  featuredInner: {
    padding: 16,
    gap: 12,
  },
  featuredBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekBadge: {
    backgroundColor: 'rgba(216, 60, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weekBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.55)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.6,
  },
  featuredExpertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00F0FF',
    overflow: 'hidden',
  },
  featuredAvatarImg: {
    width: '100%',
    height: '100%',
  },
  featuredExpertInfo: {
    flex: 1,
    gap: 2,
  },
  featuredName: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuredRole: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#A6B4CE',
  },
  featuredStudioTags: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  featuredQuoteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    lineHeight: 19,
  },
  featuredFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingDot: {
    color: '#60718F',
    fontSize: 12,
  },
  sessionsText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
  },
  book15Touch: {
    height: 34,
  },
  book15CutBox: {
    height: 34,
  },
  book15Gradient: {
    height: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  book15Text: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    gap: 14,
  },
});
