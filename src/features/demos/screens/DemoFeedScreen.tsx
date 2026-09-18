import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useState } from 'react';
import {
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
import { CyberDemoFeedCard } from '../../../components/cards/CyberDemoFeedCard';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { Screen } from '../../../components/layout/Screen';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useDemoStore } from '../../../store/demoStore';
import { fonts, useTheme } from '../../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'DemosTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const FILTERS = ['FOR YOU', 'TOP RATED', 'NEW', 'UNREAL', 'UNITY'] as const;

export function DemoFeedScreen() {
  const nav = useNavigation<Nav>();
  const { colors, isLight } = useTheme();

  const demos = useDemoStore((s) => s.demos);
  const demosHasMore = useDemoStore((s) => s.demosHasMore);
  const loading = useDemoStore((s) => s.loading);
  const error = useDemoStore((s) => s.error);
  const fetchDemos = useDemoStore((s) => s.fetchDemos);
  const loadMoreDemos = useDemoStore((s) => s.loadMoreDemos);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('FOR YOU');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (filter === 'TOP RATED') {
      fetchDemos({ sort: 'top_rated' });
    } else {
      fetchDemos({ sort: 'new' });
    }
  }, [filter, fetchDemos]);

  const refreshControl = useRefreshControl(async () => {
    if (filter === 'TOP RATED') {
      await fetchDemos({ sort: 'top_rated' });
    } else {
      await fetchDemos({ sort: 'new' });
    }
  });

  // Client-side search & engine filtering
  const filteredList = useMemo(() => {
    let result = demos;
    if (filter === 'UNREAL') {
      result = result.filter(
        (d) =>
          d.description?.toLowerCase().includes('unreal') ||
          d.genre?.toLowerCase().includes('unreal') ||
          d.title?.toLowerCase().includes('unreal'),
      );
    } else if (filter === 'UNITY') {
      result = result.filter(
        (d) =>
          d.description?.toLowerCase().includes('unity') ||
          d.genre?.toLowerCase().includes('unity') ||
          d.title?.toLowerCase().includes('unity'),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.developerName?.toLowerCase().includes(q) ||
          d.genre?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [demos, filter, searchQuery]);

  return (
    <Screen refreshControl={refreshControl}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Demos</Text>
          <Text style={[styles.headerSubtitle, isLight && { color: colors.electricAccent }]}>
            {demos.length > 0 ? `${demos.length} PLAYABLE BUILDS THIS MONTH` : 'PLAYABLE BUILDS THIS MONTH'}
          </Text>
        </View>

        {/* Chamfered + Upload Button */}
        <Pressable
          onPress={() => nav.navigate('DemoUpload')}
          style={styles.uploadBtnTouch}
          accessibilityRole="button"
          accessibilityLabel="Upload demo"
        >
          <CyberCutBox
            cutSize={10}
            radius={4}
            fill="transparent"
            borderColor={isLight ? colors.cardBorder : 'rgba(0, 240, 255, 0.6)'}
            borderWidth={1}
            style={styles.uploadCutBox}
          >
            <LinearGradient
              colors={['rgba(0, 240, 255, 0.25)', 'rgba(216, 60, 255, 0.35)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.uploadGradient}
            >
              <Text style={[styles.uploadBtnText, isLight && { color: colors.text }]}>+ Upload</Text>
            </LinearGradient>
          </CyberCutBox>
        </Pressable>
      </View>

      {/* Search Bar + Filter Icon Row */}
      <View style={styles.searchRow}>
        <CyberCutBox
          cutSize={10}
          radius={6}
          fill={isLight ? colors.inputFill : 'rgba(14, 20, 35, 0.75)'}
          borderColor={isLight ? colors.inputBorder : 'rgba(109, 53, 255, 0.35)'}
          borderWidth={1}
          style={styles.searchBox}
        >
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />
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
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </CyberCutBox>

        {/* Options / Filter Sliders Button */}
        <Pressable
          onPress={() => {}}
          style={styles.filterOptionsBtn}
          accessibilityRole="button"
          accessibilityLabel="Filter options"
        >
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
            borderColor={isLight ? colors.cardBorder : 'rgba(0, 240, 255, 0.45)'}
            borderWidth={1}
            style={styles.filterBtnCut}
          >
            <View style={styles.filterBtnInner}>
              <Ionicons name="options-outline" size={20} color={isLight ? colors.primary : '#00F0FF'} />
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
                  fill={isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(14, 20, 35, 0.7)'}
                  borderColor={isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.08)'}
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

      {/* Section Header: Trending Demos */}
      <View style={styles.sectionHeaderWrap}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Demos</Text>
        </View>
        <LinearGradient
          colors={['#00F0FF', 'rgba(216, 60, 255, 0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.glowingLine}
        />
      </View>

      {/* Loading & Error States */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={260} />
          <Skeleton width="100%" height={260} />
        </View>
      ) : null}

      {!loading && error ? <RetryBanner message={`Could not load. ${error}`} onRetry={() => fetchDemos()} /> : null}

      {/* Empty State */}
      {!loading && !error && filteredList.length === 0 ? (
        <EmptyState
          title={searchQuery ? `No builds match "${searchQuery}"` : 'No demos found for this filter'}
        />
      ) : null}

      {/* Demos List */}
      {!loading && !error && filteredList.length > 0
        ? filteredList.map((demo, idx) => (
            <CyberDemoFeedCard
              key={demo.id}
              demo={demo}
              rankBadge={idx === 0 ? '#1 THIS WEEK' : idx < 3 ? `#${idx + 1} TRENDING` : undefined}
              onPress={() => nav.navigate('DemoDetail', { id: demo.id })}
              onPlayPress={() => nav.navigate('DemoDetail', { id: demo.id })}
            />
          ))
        : null}

      {/* Pagination Footer */}
      {!loading && !error && filteredList.length > 0 ? (
        <LoadMoreButton hasMore={demosHasMore} onPress={loadMoreDemos} />
      ) : null}

      {!loading && !error && filteredList.length > 0 && !demosHasMore ? (
        <Text style={styles.endOfFeed}>END OF DEMO FEED</Text>
      ) : null}
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
    letterSpacing: 1,
  },
  uploadBtnTouch: {
    height: 38,
  },
  uploadCutBox: {
    height: 38,
  },
  uploadGradient: {
    height: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
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
  sectionHeaderWrap: {
    marginBottom: 16,
    marginTop: 4,
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
  glowingLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  loadingContainer: {
    gap: 16,
  },
  endOfFeed: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#60718F',
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 1,
  },
});
