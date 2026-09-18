import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { ExpertListCard } from '../../../components/cards/ExpertListCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { EXPERTISE_TAGS } from '../../../types/expert';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useExpertStore } from '../../../store/expertStore';
import { fonts, useTheme } from '../../../theme';

const FILTERS = ['All', ...EXPERTISE_TAGS] as const;

/** The real "view all" — a full directory browse, independent of ExpertDirectoryScreen's
 * curated home sections. Same real category chips/search/pagination, no curated slicing. */
export function ExpertsListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'ExpertsList'>>();
  const { colors } = useTheme();
  const { user } = useAuth();

  const experts = useExpertStore((s) => s.experts);
  const expertsHasMore = useExpertStore((s) => s.expertsHasMore);
  const sessionCounts = useExpertStore((s) => s.sessionCounts);
  const loading = useExpertStore((s) => s.loading);
  const error = useExpertStore((s) => s.error);
  const fetchExperts = useExpertStore((s) => s.fetchExperts);
  const loadMoreExperts = useExpertStore((s) => s.loadMoreExperts);
  const recommendedExperts = useExpertStore((s) => s.recommendedExperts);
  const recommendedHasMore = useExpertStore((s) => s.recommendedHasMore);
  const fetchRecommended = useExpertStore((s) => s.fetchRecommended);
  const loadMoreRecommended = useExpertStore((s) => s.loadMoreRecommended);

  const isRecommended = params.mode === 'recommended';
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Depend on a joined primitive, not the array itself — see ExpertDirectoryScreen's identical
  // fix for why an array in a dependency array can re-fire an effect forever.
  const skillsKey = (user?.skills ?? []).join(',');
  useEffect(() => {
    if (isRecommended) {
      fetchRecommended(user?.skills ?? [], user?.id);
    } else {
      fetchExperts(filter === 'All' ? undefined : filter, user?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecommended, filter, user?.id, skillsKey, fetchExperts, fetchRecommended]);

  const refreshControl = useRefreshControl(async () => {
    if (isRecommended) await fetchRecommended(user?.skills ?? [], user?.id);
    else await fetchExperts(filter === 'All' ? undefined : filter, user?.id);
  });

  const list = isRecommended ? recommendedExperts : experts;
  const hasMore = isRecommended ? recommendedHasMore : expertsHasMore;
  const loadMore = () => (isRecommended ? loadMoreRecommended(user?.skills ?? [], user?.id) : loadMoreExperts());

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || e.company.toLowerCase().includes(q) || e.specialties.some((s) => s.toLowerCase().includes(q)),
    );
  }, [list, searchQuery]);

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title={isRecommended ? 'Recommended Experts' : 'Top Rated Experts'} onBack={() => nav.goBack()} />

      <View style={styles.searchRow}>
        <CyberCutBox cutSize={10} radius={6} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.searchBox}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color={colors.muted2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search experts..."
              placeholderTextColor={colors.muted2}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </CyberCutBox>
      </View>

      {!isRecommended ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <Pressable key={item} onPress={() => setFilter(item)} style={styles.chipPressable} accessibilityRole="button">
                {active ? (
                  <LinearGradient colors={['#00F0FF', '#7928CA', '#D83CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeChipGradient}>
                    <Text style={styles.activeChipText}>{item.toUpperCase()}</Text>
                  </LinearGradient>
                ) : (
                  <CyberCutBox cutSize={8} radius={4} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.inactiveChipCut}>
                    <View style={styles.inactiveChipInner}>
                      <Text style={[styles.inactiveChipText, { color: colors.muted }]}>{item.toUpperCase()}</Text>
                    </View>
                  </CyberCutBox>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={{ gap: 14 }}>
          <Skeleton width="100%" height={160} />
          <Skeleton width="100%" height={160} />
        </View>
      ) : null}

      {!loading && error ? <RetryBanner message={`Could not load. ${error}`} onRetry={() => (isRecommended ? fetchRecommended(user?.skills ?? [], user?.id) : fetchExperts(filter === 'All' ? undefined : filter, user?.id))} /> : null}

      {!loading && !error && filteredList.length === 0 ? <EmptyState title="No experts found." /> : null}

      {!loading && !error
        ? filteredList.map((e) => <ExpertListCard key={e.id} expert={e} sessionCount={sessionCounts[e.id]} onPress={() => nav.navigate('ExpertProfile', { id: e.id })} />)
        : null}

      {!loading && !error ? <LoadMoreButton hasMore={hasMore} onPress={loadMore} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { marginBottom: 12 },
  searchBox: { height: 44 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: '100%', gap: 10 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: '#FFFFFF', height: '100%' },
  filterChipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  chipPressable: { height: 34 },
  activeChipGradient: { height: 34, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  activeChipText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.6 },
  inactiveChipCut: { height: 34 },
  inactiveChipInner: { height: '100%', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  inactiveChipText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '600', color: '#8E9BB5', letterSpacing: 0.6 },
});
