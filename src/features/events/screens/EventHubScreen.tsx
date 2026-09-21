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
import { CyberEventCard } from '../../../components/cards/CyberEventCard';
import { AutoCarousel } from '../../../components/layout/AutoCarousel';
import { CyberEventRowCard } from '../../../components/cards/CyberEventRowCard';
import { CyberFilterModal, type FilterState } from '../../../components/cyber/CyberFilterModal';
import { useAuth } from '../../../hooks/useAuth';
import { useEventStore } from '../../../store/eventStore';
import { STALE_MS } from '../../../store/swr';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useServerSearch } from '../../../hooks/useServerSearch';
import { searchEvents } from '../../../services/supabase/events';
import { matchesEventFilters } from '../../../utils/eventFilters';
import { formatEventBadge } from '../../../utils/eventBadge';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import type { GameEvent } from '../../../types/event';
import { fonts, useTheme } from '../../../theme';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 430);

const CATEGORY_CHIPS = ['ALL', 'MEETUP', 'TOURNAMENT', 'GAME JAM'];
const MODES = ['Online', 'Hybrid', 'In person'] as const;

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'EventsTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function EventHubScreen() {
  const { colors, isLight } = useTheme();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const events = useEventStore((s) => s.events);
  const loading = useEventStore((s) => s.loading);
  const fetchEvents = useEventStore((s) => s.fetchEvents);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedMode, setSelectedMode] = useState<(typeof MODES)[number] | 'ALL'>('Online');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) fetchEvents(user.id, { ifStaleMs: STALE_MS });
  }, [user?.id, fetchEvents]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await fetchEvents(user.id);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchEvents]);

  // Search asks the server so it finds events beyond the page already loaded; until its answer
  // arrives the loaded events are filtered locally.
  const search = useServerSearch(dq, (n) => searchEvents(user?.id ?? '', n), { enabled: !!user?.id });

  // Derived filter matching
  const filteredEvents = useMemo(() => {
    const needle = search.needle;
    const source = search.results ?? events;
    return source.filter((e) => {
      // 1. Search Query — already applied by the server when its results are in
      const matchesSearch =
        !needle ||
        search.results !== null ||
        e.title.toLowerCase().includes(needle) ||
        (e.description && e.description.toLowerCase().includes(needle)) ||
        (e.location && e.location.toLowerCase().includes(needle)) ||
        (e.category && e.category.toLowerCase().includes(needle));

      if (!matchesSearch) return false;

      // 2. Category Chip
      if (selectedCat !== 'ALL') {
        const catNeedle = selectedCat.toLowerCase();
        const eventCat = (e.category || '').toLowerCase();
        const eventTitle = e.title.toLowerCase();
        if (!eventCat.includes(catNeedle) && !eventTitle.includes(catNeedle)) {
          return false;
        }
      }

      // 3. Attendance Mode
      if (selectedMode !== 'ALL') {
        if (selectedMode === 'Online' && e.type.toLowerCase() !== 'online') return false;
        if (selectedMode === 'Hybrid' && e.type.toLowerCase() !== 'hybrid') return false;
        if (selectedMode === 'In person' && e.type.toLowerCase() !== 'physical') return false;
      }

      // 4. Advanced Filter Sheet (date/location/category)
      if (advancedFilters && !matchesEventFilters(e, advancedFilters)) return false;

      return true;
    });
  }, [events, search.needle, search.results, selectedCat, selectedMode, advancedFilters]);

  // Sort upcoming events chronologically
  const sortedUpcoming = useMemo(() => {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    return filteredEvents.filter((e) => new Date(e.startsAt).getTime() >= cutoff).sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
  }, [filteredEvents]);

  const featuredEvent = sortedUpcoming[0];
  const listEvents = featuredEvent ? sortedUpcoming.slice(1) : sortedUpcoming;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'TBD';
    }
  };

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
            tintColor={isLight ? colors.primary : '#00E5FF'}
            colors={['#00E5FF', '#D83CFF']}
          />
        }
      >
        <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {/* ================= 1. HEADER ROW ================= */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Events</Text>
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()} · {sortedUpcoming.length} UPCOMING
              </Text>
            </View>

            <Pressable
              onPress={() => nav.navigate('CreateEvent')}
              style={styles.hostBtnWrap}
              accessibilityRole="button"
              accessibilityLabel="Host event"
            >
              <CyberCutBox cutSize={8} radius={4} style={styles.hostCutBox}>
                <LinearGradient
                  colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.hostGradient}
                >
                  <Text style={styles.hostBtnText}>+ HOST</Text>
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
                fill={isLight ? colors.inputFill : 'rgba(14, 20, 35, 0.85)'}
                borderColor={isLight ? colors.inputBorder : 'rgba(109, 53, 255, 0.35)'}
                borderWidth={1}
                style={styles.searchCutBox}
              >
                <View style={styles.searchInner}>
                  <Ionicons name="search" size={16} color={colors.muted} style={styles.searchIcon} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search events..."
                    placeholderTextColor={colors.muted2}
                    style={[styles.searchInput, { color: colors.text }]}
                    returnKeyType="search"
                  />
                  {q.length > 0 && (
                    <Pressable onPress={() => setQ('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              </CyberCutBox>
            </View>

            {/* Chamfer Filter Button */}
            <Pressable
              onPress={() => setShowFilterModal(true)}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityLabel="Filter events"
            >
              <CyberCutBox cutSize={8} radius={4} style={styles.filterCutBox}>
                <LinearGradient
                  colors={advancedFilters ? ['#D83CFF', '#00E5FF'] : ['#00E5FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterGradient}
                >
                  <Ionicons name="options-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
              </CyberCutBox>
            </Pressable>
          </View>

          {/* ================= 3. CATEGORY CHIPS ================= */}
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedCat === chip;
              return (
                <Pressable
                  key={chip}
                  onPress={() => setSelectedCat(chip)}
                  style={styles.chipPressable}
                  accessibilityRole="button"
                >
                  <CyberCutBox
                    cutSize={6}
                    radius={3}
                    gradient={isActive}
                    fill={isActive ? undefined : isLight ? colors.cardFill : 'rgba(255, 255, 255, 0.05)'}
                    borderColor={isActive ? undefined : isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)'}
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

          {/* ================= 4. ATTENDANCE MODE SEGMENTS ================= */}
          <View style={styles.segmentContainer}>
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={isLight ? colors.inputFill : 'rgba(14, 20, 35, 0.85)'}
              borderColor={isLight ? colors.inputBorder : 'rgba(109, 53, 255, 0.35)'}
              borderWidth={1}
              style={styles.segmentCutBox}
            >
              <View style={styles.segmentRow}>
                {MODES.map((mode) => {
                  const isSel = selectedMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setSelectedMode(mode)}
                      style={styles.segmentItem}
                      accessibilityRole="button"
                    >
                      {isSel ? (
                        <CyberCutBox cutSize={6} radius={3} style={styles.segmentActiveCut}>
                          <LinearGradient
                            colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.segmentActiveGradient}
                          >
                            <Text style={styles.segmentTextActive}>{mode}</Text>
                          </LinearGradient>
                        </CyberCutBox>
                      ) : (
                        <View style={styles.segmentInactiveBox}>
                          <Text style={[styles.segmentTextInactive, { color: colors.muted }]}>{mode}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </CyberCutBox>
          </View>

          {/* ================= 5. FEATURED HERO EVENT ================= */}
          {featuredEvent && (
            <View style={styles.featuredWrap}>
              <AutoCarousel
                items={sortedUpcoming.slice(0, 4)}
                keyExtractor={(e) => e.id}
                showDots
                renderItem={(e) => (
                  <CyberEventCard
                    id={e.id}
                    title={e.title}
                    dateStr={new Date(e.startsAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    badge={formatEventBadge(e.startsAt, e.endsAt)}
                    showAvatars={(e.attendeeCount || 0) > 0}
                    tags={[
                      e.category || e.type.toUpperCase(),
                      e.paid ? `${e.currency || 'PKR'} ${e.price}` : 'FREE',
                    ]}
                    membersCount={`${e.attendeeCount || 0} MEMBERS`}
                    imageUri={e.cover}
                    onPress={() => nav.navigate('EventDetail', { id: e.id })}
                  />
                )}
              />
            </View>
          )}

          {/* ================= 6. UPCOMING EVENTS ================= */}
          <View style={styles.sectionHeaderWrap}>
            <View style={styles.sectionTitleBlock}>
              <Text style={[styles.sectionTitleText, { color: colors.text }]}>Upcoming Events</Text>
              <View style={styles.accentLineContainer}>
                <LinearGradient
                  colors={['#00E5FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.accentLine}
                />
              </View>
            </View>
          </View>

          {listEvents.length > 0 ? (
            listEvents.map((ev) => (
              <CyberEventRowCard
                key={ev.id}
                id={ev.id}
                title={ev.title}
                category={ev.category || 'MEETUP'}
                type={ev.type || 'Online'}
                dateStr={formatDate(ev.startsAt)}
                attendeesCount={ev.attendeeCount || 0}
                imageUri={ev.cover}
                onPress={() => nav.navigate('EventDetail', { id: ev.id })}
              />
            ))
          ) : (
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.7)'}
              borderColor={isLight ? colors.cardBorder : 'rgba(109, 53, 255, 0.3)'}
              borderWidth={1}
              style={styles.emptyCard}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No more upcoming events found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Host a launch party, game tournament, or workshop with the network.
              </Text>
              <Pressable
                onPress={() => nav.navigate('CreateEvent')}
                style={styles.emptyActionBtn}
                accessibilityRole="button"
              >
                <CyberCutBox cutSize={6} radius={3} style={styles.emptyActionCut}>
                  <LinearGradient
                    colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyActionGradient}
                  >
                    <Text style={styles.emptyActionText}>Host an Event</Text>
                  </LinearGradient>
                </CyberCutBox>
              </Pressable>
            </CyberCutBox>
          )}
        </View>
      </KeyboardAwareScrollView>

      <CyberFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        initialFilters={advancedFilters ?? undefined}
        onApply={(filters) => setAdvancedFilters(filters)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  hostBtnWrap: {
    alignSelf: 'center',
  },
  hostCutBox: {
    overflow: 'hidden',
  },
  hostGradient: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostBtnText: {
    fontFamily: fonts.bodySemi,
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
    paddingHorizontal: 13,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextInactive: {
    color: '#8E9BB5',
  },
  segmentContainer: {
    width: '100%',
    marginBottom: 18,
  },
  segmentCutBox: {
    width: '100%',
    padding: 3,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentItem: {
    flex: 1,
    height: 34,
  },
  segmentActiveCut: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  segmentActiveGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentInactiveBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTextActive: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  segmentTextInactive: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
  },
  featuredWrap: {
    width: '100%',
    marginBottom: 10,
  },
  carouselPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  pagPill: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  pagPillActive: {
    width: 24,
    backgroundColor: '#00E5FF',
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
    marginBottom: 10,
  },
  emptyActionBtn: {
    alignSelf: 'center',
  },
  emptyActionCut: {
    overflow: 'hidden',
  },
  emptyActionGradient: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  emptyActionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
