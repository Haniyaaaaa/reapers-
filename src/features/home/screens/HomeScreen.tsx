import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberSeeAllButton } from '../../../components/cyber/CyberSeeAllButton';
import { CyberFilterModal, type FilterState } from '../../../components/cyber/CyberFilterModal';
import { CyberEventCard } from '../../../components/cards/CyberEventCard';
import { AutoCarousel } from '../../../components/layout/AutoCarousel';
import { CyberCommunityCard } from '../../../components/cards/CyberCommunityCard';
import { CyberDemoCard } from '../../../components/cards/CyberDemoCard';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { CyberDeveloperCard } from '../../../components/cards/CyberDeveloperCard';
import { CyberFeedPostCard } from '../../../components/cards/CyberFeedPostCard';
import { PostCommentsSheet } from '../../../components/feed/PostCommentsSheet';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { CyberTeamOppCard } from '../../../components/cards/CyberTeamOppCard';
import { CyberExpertBookCard } from '../../../components/cards/CyberExpertBookCard';
import { DEFAULT_AVATAR_ID, getCyberAvatarById, getCyberAvatarSource, resolveAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunitiesStore } from '../../../store/communitiesStore';
import { useDemoStore } from '../../../store/demoStore';
import { useEventStore } from '../../../store/eventStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { useNetworkStore } from '../../../store/networkStore';
import { useExpertStore } from '../../../store/expertStore';
import { useChatStore } from '../../../store/chatStore';
import { usePostsStore } from '../../../store/postsStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { formatEventBadge } from '../../../utils/eventBadge';
import { STALE_MS } from '../../../store/swr';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useServerSearch } from '../../../hooks/useServerSearch';
import { searchCommunities } from '../../../services/supabase/communities';
import { searchEvents } from '../../../services/supabase/events';
import { searchExperts } from '../../../services/supabase/experts';
import { searchPeople, searchTeamRequests } from '../../../services/supabase/network';
import { listDemos } from '../../../services/supabase/demos';
import { HeaderGreeting } from '../components/HeaderGreeting';
import { navigateToNotificationTarget } from '../../../navigation/notificationTarget';
import { personMatchScore, teamMatchScore } from '../../../utils/matching';
import { formatCommitment } from '../../../utils/teamRequest';
import { matchesEventFilters } from '../../../utils/eventFilters';
import { subscribeToNewPosts } from '../../../services/supabase/realtime';
import { uploadPostImage } from '../../../services/supabase/storage';
import { submitReport } from '../../../services/supabase/reports';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import type { NotificationItem } from '../../../types/extra';
import { fonts, useTheme } from '../../../theme';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Home search cost controls: each section only needs a handful of rows (its own screen has the rest),
// and sections further down the page only search once the user scrolls toward them.
const HOME_SEARCH_LIMIT = 10;
const HOME_SEARCH_MIN_CHARS = 2;
const REACH_MID_Y = SCREEN_HEIGHT * 0.35; // demos + people come into view
const REACH_FAR_Y = SCREEN_HEIGHT * 1.2; // team requests + experts come into view
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 430);

const TOPIC_CHIPS = ['FOR YOU', 'UNITY', 'NETCODE', 'INDIE', 'HIRING'];

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'HomeTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

function formatRelativeTime(isoStr?: string) {
  if (!isoStr) return 'now';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function formatEventDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${weekday}, ${day} ${month} · ${time}`;
  } catch {
    return 'UPCOMING EVENT';
  }
}

export function HomeScreen() {
  const { colors, light, gradients } = useTheme();
  const nav = useNavigation<Nav>();

  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [activeChip, setActiveChip] = useState('FOR YOU');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState | null>(null);

  // Live stores
  const demos = useDemoStore((s) => s.demos);
  const fetchDemos = useDemoStore((s) => s.fetchDemos);

  const events = useEventStore((s) => s.events);
  const fetchEvents = useEventStore((s) => s.fetchEvents);

  const communities = useCommunitiesStore((s) => s.communities);
  const fetchCommunities = useCommunitiesStore((s) => s.fetchCommunities);
  const joinCommunity = useCommunitiesStore((s) => s.joinCommunity);
  const leaveCommunity = useCommunitiesStore((s) => s.leaveCommunity);

  const people = useNetworkStore((s) => s.people);
  const teams = useNetworkStore((s) => s.teams);
  const appliedTeams = useNetworkStore((s) => s.appliedTeams);
  const fetchPeople = useNetworkStore((s) => s.fetchPeople);
  const fetchTeams = useNetworkStore((s) => s.fetchTeams);
  const connectPerson = useNetworkStore((s) => s.connectPerson);
  const applyTeam = useNetworkStore((s) => s.applyTeam);

  const experts = useExpertStore((s) => s.experts);
  const fetchExperts = useExpertStore((s) => s.fetchExperts);

  const rooms = useChatStore((s) => s.rooms);
  const fetchRooms = useChatStore((s) => s.fetchRooms);

  const feedPosts = usePostsStore((s) => s.posts);
  const feedHasMore = usePostsStore((s) => s.hasMore);
  const feedNewPostsAvailable = usePostsStore((s) => s.newPostsAvailable);
  const fetchFeed = usePostsStore((s) => s.fetchFeed);
  const loadMorePosts = usePostsStore((s) => s.loadMorePosts);
  const loadNewPosts = usePostsStore((s) => s.loadNewPosts);
  const createPost = usePostsStore((s) => s.createPost);
  const deletePostAction = usePostsStore((s) => s.deletePost);
  const editPostAction = usePostsStore((s) => s.editPost);
  const reactToPost = usePostsStore((s) => s.reactToPost);
  const checkForNewPosts = usePostsStore((s) => s.checkForNewPosts);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  const notes = useNotificationStore((s) => s.notes);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  const unreadNotesCount = notes.filter((n) => !n.read).length;
  const unreadChatCount = rooms.reduce((sum, r) => sum + (r.unread || 0), 0);

  const presetAvatar = getCyberAvatarById(user?.avatarId || DEFAULT_AVATAR_ID);
  // A custom uploaded photo takes priority over the preset avatar, same as the Profile screen.
  const currentAvatar = { ...presetAvatar, source: user?.avatarUri ? { uri: user.avatarUri } : presetAvatar.source };

  // Keyed on the stable user id (not the `user` object) and gated by freshness: coming back to
  // Home within STALE_MS reuses what's already loaded instead of refetching everything.
  const userId = user?.id;
  useEffect(() => {
    const fresh = { ifStaleMs: STALE_MS };
    fetchDemos(undefined, fresh);
    fetchExperts(undefined, undefined, fresh);
    if (userId) {
      fetchCommunities(userId, fresh);
      fetchEvents(userId, fresh);
      fetchPeople(userId, fresh);
      fetchTeams(userId, undefined, fresh);
      fetchRooms(userId, fresh);
      fetchNotifications(userId, fresh);
      fetchFeed(userId, fresh);
    }
  }, [
    fetchDemos,
    fetchExperts,
    fetchCommunities,
    fetchEvents,
    fetchPeople,
    fetchTeams,
    fetchRooms,
    fetchNotifications,
    fetchFeed,
    userId,
  ]);

  // Feed-wide, one subscription for this screen — flags the "New posts" banner rather than
  // live-inserting, so scrolling isn't disrupted on a busy global feed (see
  // subscribeToNewPosts's own doc comment for the scale reasoning).
  useEffect(() => {
    const unsubscribe = subscribeToNewPosts(() => checkForNewPosts());
    return unsubscribe;
  }, [checkForNewPosts]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        const fresh = { ifStaleMs: STALE_MS };
        fetchNotifications(userId, fresh);
        fetchRooms(userId, fresh);
        refreshUser({ ifStaleMs: 60_000 });
        fetchEvents(userId, fresh);
        fetchCommunities(userId, fresh);
      }
    }, [userId, fetchNotifications, fetchRooms, refreshUser, fetchEvents, fetchCommunities])
  );

  useEffect(() => {
    const openTarget = (data: unknown) => {
      const target = (data as { target?: NotificationItem['target'] } | undefined)?.target;
      if (target?.screen) navigateToNotificationTarget(nav, target);
    };
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openTarget(response.notification.request.content.data);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openTarget(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, [nav]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
      refreshUser(),
      fetchDemos(),
      fetchExperts(),
      user ? fetchCommunities(user.id) : Promise.resolve(),
      user ? fetchEvents(user.id) : Promise.resolve(),
      user ? fetchPeople(user.id) : Promise.resolve(),
      user ? fetchTeams(user.id) : Promise.resolve(),
      user ? fetchRooms(user.id) : Promise.resolve(),
      user ? fetchNotifications(user.id) : Promise.resolve(),
      user ? fetchFeed(user.id) : Promise.resolve(),
    ]);
    } finally {
      setRefreshing(false);
    }
  };

  const greetingName = user?.displayName?.split(' ')[0] || user?.username || 'Reaper';

  // Filtering for topic chips and search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const normalizedChip = activeChip === 'FOR YOU' ? '' : activeChip.toLowerCase();

  // Global search: every section asks the server (so it finds matches beyond the first page each
  // list has loaded). Until a section's answer arrives it filters what's loaded, so typing never
  // feels laggy. The topic chip still narrows whichever list is showing.
  const debouncedQuery = useDebouncedValue(searchQuery, 500);
  const uid = user?.id ?? '';
  // How far down the page the user has scrolled (0 = top, 1 = past the first sections, 2 = far).
  // It only ever goes up, so it changes state at most twice — not on every scroll frame.
  const [reach, setReach] = useState(0);
  const onHomeScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const next = y > REACH_FAR_Y ? 2 : y > REACH_MID_Y ? 1 : 0;
    setReach((r) => (next > r ? next : r));
  }, []);
  const search = { minChars: HOME_SEARCH_MIN_CHARS };
  // Events + communities are on screen when Home opens; the others wait until they're near.
  const sEvents = useServerSearch(debouncedQuery, (n) => searchEvents(uid, n, HOME_SEARCH_LIMIT), { ...search, enabled: !!uid, cacheKey: `home-events:${uid}` });
  const sCommunities = useServerSearch(debouncedQuery, (n) => searchCommunities(uid, n, HOME_SEARCH_LIMIT), { ...search, enabled: !!uid, cacheKey: `home-communities:${uid}` });
  const sDemos = useServerSearch(debouncedQuery, async (n) => (await listDemos(0, HOME_SEARCH_LIMIT, { search: n })).rows, { ...search, enabled: reach >= 1, cacheKey: 'home-demos' });
  const sPeople = useServerSearch(debouncedQuery, (n) => searchPeople(uid, n, HOME_SEARCH_LIMIT), { ...search, enabled: !!uid && reach >= 1, cacheKey: `home-people:${uid}` });
  const sTeams = useServerSearch(debouncedQuery, (n) => searchTeamRequests(n, {}, HOME_SEARCH_LIMIT), { ...search, enabled: reach >= 2, cacheKey: 'home-teams' });
  const sExperts = useServerSearch(debouncedQuery, (n) => searchExperts(n, { excludeUserId: uid }, HOME_SEARCH_LIMIT), { ...search, enabled: reach >= 2, deps: [uid], cacheKey: `home-experts:${uid}` });

  // `serverMatched` = the server already applied the search text, so only the chip is checked here.
  const matchesFilter = useCallback(
    (texts: (string | undefined | null)[], serverMatched = false) => {
      const combined = texts.filter(Boolean).join(' ').toLowerCase();
      if (normalizedChip && !combined.includes(normalizedChip)) return false;
      if (!serverMatched && normalizedQuery && !combined.includes(normalizedQuery)) return false;
      return true;
    },
    [normalizedChip, normalizedQuery]
  );

  const filteredCommunities = useMemo(() => {
    const ready = sCommunities.results !== null;
    return (sCommunities.results ?? communities).filter((c) => matchesFilter([c.name, c.description, ...(c.tags ?? [])], ready));
  }, [communities, sCommunities.results, matchesFilter]);

  const filteredDemos = useMemo(() => {
    const ready = sDemos.results !== null;
    return (sDemos.results ?? demos).filter((d) => matchesFilter([d.title, d.genre, d.description, d.developerName], ready));
  }, [demos, sDemos.results, matchesFilter]);

  const filteredPeople = useMemo(() => {
    const ready = sPeople.results !== null;
    return (sPeople.results ?? people).filter(
      (p) =>
        p.id !== user?.id &&
        matchesFilter([p.displayName, ...(p.skills || []), ...(p.roles || [])], ready)
    );
  }, [people, sPeople.results, user?.id, matchesFilter]);

  const filteredTeams = useMemo(() => {
    const ready = sTeams.results !== null;
    return (sTeams.results ?? teams).filter((t) => matchesFilter([t.project, t.excerpt, t.studio, t.engine, ...(t.roles || [])], ready));
  }, [teams, sTeams.results, matchesFilter]);

  const filteredExperts = useMemo(() => {
    const ready = sExperts.results !== null;
    return (sExperts.results ?? experts).filter((e) => matchesFilter([e.name, e.role, e.company, ...(e.specialties || [])], ready));
  }, [experts, sExperts.results, matchesFilter]);

  const upcomingEvents = useMemo(() => {
    const ready = sEvents.results !== null;
    return (sEvents.results ?? events)
      .filter((e) => matchesFilter([e.title, e.description, e.location, e.category], ready))
      .filter((e) => new Date(e.startsAt).getTime() >= Date.now() - 3600000)
      .filter((e) => !advancedFilters || matchesEventFilters(e, advancedFilters))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events, sEvents.results, matchesFilter, advancedFilters]);
  const featuredEvent = upcomingEvents[0];

  // "Recent Activities" is discovery, not the notification inbox (that lives behind the bell):
  // one round-robin mix of events, communities, rooms, demos and experts so the slider shows
  // a bit of everything instead of six of the same kind.
  const recentItems = useMemo(() => {
    type RecentItem = { key: string; kindLabel: string; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string; image?: ImageSourcePropType; onPress: () => void };
    const groups: RecentItem[][] = [
      upcomingEvents.map((e) => ({
        key: `event-${e.id}`,
        kindLabel: 'EVENT',
        icon: 'calendar-outline' as const,
        title: e.title,
        subtitle: formatEventDate(e.startsAt),
        image: e.cover ? { uri: e.cover } : undefined,
        onPress: () => nav.navigate('EventDetail', { id: e.id }),
      })),
      filteredCommunities.map((c) => ({
        key: `community-${c.id}`,
        kindLabel: 'COMMUNITY',
        icon: 'people-outline' as const,
        title: c.name,
        subtitle: `${c.memberCount} MEMBERS`,
        image: c.logoUrl ? { uri: c.logoUrl } : c.logo,
        onPress: () => nav.navigate('CommunityDetail', { id: c.id }),
      })),
      rooms
        .filter((r) => r.kind !== 'dm')
        .filter((r) => !normalizedQuery || r.name.toLowerCase().includes(normalizedQuery) || r.description.toLowerCase().includes(normalizedQuery))
        .map((r) => ({
          key: `room-${r.id}`,
          kindLabel: 'ROOM',
          icon: 'chatbubbles-outline' as const,
          title: r.name,
          subtitle: `${r.memberCount} MEMBERS`,
          image: r.avatar ? { uri: r.avatar } : r.logo,
          onPress: () => nav.navigate('ChatDetail', { id: r.id }),
        })),
      [...filteredDemos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((d) => ({
          key: `demo-${d.id}`,
          kindLabel: 'DEMO',
          icon: 'game-controller-outline' as const,
          title: d.title,
          subtitle: `${d.genre.toUpperCase()} · ${formatRelativeTime(d.createdAt)} AGO`,
          image: d.thumbnail ? { uri: d.thumbnail } : undefined,
          onPress: () => nav.navigate('DemoDetail', { id: d.id }),
        })),
      filteredExperts.map((x) => ({
        key: `expert-${x.id}`,
        kindLabel: 'EXPERT',
        icon: 'shield-checkmark-outline' as const,
        title: x.name,
        subtitle: [x.role, x.company].filter(Boolean).join(' · '),
        image: resolveAvatarSource(x.avatar, x.avatarId),
        onPress: () => nav.navigate('ExpertProfile', { id: x.id }),
      })),
    ];
    const mixed: RecentItem[] = [];
    for (let round = 0; mixed.length < 6 && groups.some((g) => round < g.length); round++) {
      for (const g of groups) if (round < g.length && mixed.length < 6) mixed.push(g[round]);
    }
    return mixed;
  }, [upcomingEvents, filteredCommunities, rooms, filteredDemos, filteredExperts, normalizedQuery, nav]);

  const anySearching = sCommunities.searching || sEvents.searching || sExperts.searching || sPeople.searching || sTeams.searching || sDemos.searching;
  const nothingMatches =
    normalizedQuery.length > 0 &&
    // Below-the-fold sections aren't searched until scrolled near, so only claim "nothing" once
    // every section has had its chance (or the query is too short to search the server at all).
    (reach >= 2 || normalizedQuery.length < HOME_SEARCH_MIN_CHARS) &&
    !anySearching &&
    upcomingEvents.length + filteredCommunities.length + filteredDemos.length + filteredPeople.length + filteredTeams.length + filteredExperts.length === 0;

  // Section Header Component with Cyber Glow Accent Line
  const renderSectionHeader = (title: string, onSeeAll?: () => void) => (
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

      {onSeeAll && (
        <CyberSeeAllButton onPress={onSeeAll} />
      )}
    </View>
  );

  // Reusable Cyber Empty State Card
  const renderEmptySection = (
    title: string,
    subtitle?: string,
    actionLabel?: string,
    onAction?: () => void
  ) => (
    <CyberCutBox
      cutSize={10}
      radius={5}
      fill={light ? colors.cardFill : "rgba(14, 20, 35, 0.75)"}
      borderColor={light ? colors.cardBorder : "rgba(255, 255, 255, 0.08)"}
      borderWidth={1}
      style={styles.emptyCard}
    >
      <View style={styles.emptyCardInner}>
        <Ionicons
          name="sparkles-outline"
          size={18}
          color={light ? colors.primary : '#00E5FF'}
          style={{ marginBottom: 4 }}
        />
        <Text style={[styles.emptyCardTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.emptyCardSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
        {actionLabel && onAction && (
          <Pressable onPress={onAction} style={styles.emptyCardActionBtn} accessibilityRole="button">
            <CyberCutBox cutSize={7} radius={4} gradient style={styles.emptyCardActionCut}>
              <Text style={styles.emptyCardActionText}>{actionLabel}</Text>
            </CyberCutBox>
          </Pressable>
        )}
      </View>
    </CyberCutBox>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={light ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {/* Cyberpunk Artwork Background with ground reflections */}
      <CyberBackground />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onHomeScroll}
        scrollEventThrottle={100}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00E5FF"
          />
        }
      >
        <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {/* ================= 1. CYBER HEADER ================= */}
          <View style={styles.headerRow}>
            {/* Left Identity: Avatar + Date + Greeting */}
            <View style={styles.identityWrap}>
              <Pressable
                onPress={() => nav.navigate('Profile', {})}
                style={styles.avatarBoxWrap}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <CutAvatar source={currentAvatar.source} size={64} cut={16} />
                <View style={styles.onlineStatusDot} />
              </Pressable>

              <HeaderGreeting name={greetingName} />
            </View>

            {/* Right Quick Actions: Chat + Notifications + Settings */}
            <View style={styles.actionsGroup}>
              {/* Chat Button with live unread counter */}
              <Pressable
                onPress={() => nav.navigate('ChatDirectory')}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open chat"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.actionIconCutBox}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                </CyberCutBox>
                {unreadChatCount > 0 && (
                  <View style={styles.chatBadge}>
                    <Text style={styles.chatBadgeText}>
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Notification Bell with live alert dot */}
              <Pressable
                onPress={() => nav.navigate('Notifications')}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.actionIconCutBox}
                >
                  <Ionicons name="notifications-outline" size={18} color={colors.text} />
                </CyberCutBox>
                {unreadNotesCount > 0 && <View style={styles.notifDot} />}
              </Pressable>

              {/* Settings Button */}
              <Pressable
                onPress={() => nav.navigate('Settings')}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.actionIconCutBox}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.text} />
                </CyberCutBox>
              </Pressable>
            </View>
          </View>

          {/* ================= 2. SEARCH & FILTER BAR ================= */}
          <View style={styles.searchRow}>
            {/* Chamfer-cut Search Field */}
            <View style={styles.searchFieldWrap}>
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={1}
                style={styles.searchCutBox}
              >
                <View style={styles.searchInner}>
                  <Ionicons name="search" size={16} color={colors.muted} style={styles.searchIcon} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search communities, demos, experts..."
                    placeholderTextColor={colors.muted2}
                    style={[styles.searchInput, { color: colors.text }]}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.muted2} />
                    </Pressable>
                  )}
                </View>
              </CyberCutBox>
            </View>

            {/* Gradient Filter/Sliders Button */}
            <Pressable
              onPress={() => setShowFilterModal(true)}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityLabel="Filter search"
            >
              <CyberCutBox
                cutSize={8}
                radius={4}
                gradient
                gradientColors={advancedFilters ? ['#D83CFF', '#6D35FF', '#00E5FF'] : undefined}
                style={styles.filterCutBox}
              >
                <Ionicons name="options-outline" size={20} color="#FFFFFF" />
              </CyberCutBox>
            </Pressable>
          </View>

          {/* ================= 3. TOPIC FILTER PILLS ================= */}
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {TOPIC_CHIPS.map((chip) => {
              const isActive = activeChip === chip;

              return (
                <Pressable
                  key={chip}
                  onPress={() => setActiveChip(chip)}
                  style={styles.chipPressable}
                >
                  <CyberCutBox
                    cutSize={7}
                    radius={4}
                    gradient={isActive}
                    fill={!isActive ? (light ? colors.cardFill : 'rgba(14, 20, 35, 0.85)') : undefined}
                    borderColor={!isActive ? (light ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)') : undefined}
                    borderWidth={!isActive ? 1 : 0}
                    style={styles.chipCutBox}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive ? styles.chipTextActive : { color: colors.muted },
                      ]}
                    >
                      {chip}
                    </Text>
                  </CyberCutBox>
                </Pressable>
              );
            })}
          </KeyboardAwareScrollView>

          {nothingMatches ? (
            <Text style={[styles.searchNoResults, { color: colors.muted }]}>No results for “{searchQuery.trim()}”. Try a different word.</Text>
          ) : anySearching ? (
            <Text style={[styles.searchNoResults, { color: colors.muted }]}>Searching everything…</Text>
          ) : null}

          {/* ================= 4. UPCOMING EVENT ================= */}
          {renderSectionHeader('Upcoming Event', () => nav.navigate('EventsTab'))}
          {featuredEvent ? (
            <AutoCarousel
              items={upcomingEvents.slice(0, 4)}
              keyExtractor={(e) => e.id}
              showDots
              renderItem={(e) => (
                <CyberEventCard
                  id={e.id}
                  title={e.title}
                  dateStr={formatEventDate(e.startsAt)}
                  badge={formatEventBadge(e.startsAt, e.endsAt)}
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
          ) : (
            renderEmptySection(
              'No upcoming events scheduled',
              'Host a meetup, dev jam, or tech showcase with your guild.',
              'Host an Event',
              () => nav.navigate('CreateEvent')
            )
          )}

          {/* ================= 5. FEATURED COMMUNITIES ================= */}
          {renderSectionHeader('Featured communities', () => nav.navigate('CommunitiesTab'))}
          {filteredCommunities.length > 0 ? (
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollRow}
            >
              {filteredCommunities.map((c) => (
                <CyberCommunityCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  memberCount={c.memberCount >= 1000 ? `${(c.memberCount / 1000).toFixed(1)}K` : String(c.memberCount)}
                  description={c.description}
                  avatarSource={c.logo}
                  joined={c.joined}
                  onJoin={async () => {
                    if (!user) return;
                    if (c.joined) await leaveCommunity(user.id, c.id);
                    else await joinCommunity(user.id, c.id);
                  }}
                  onPress={() => nav.navigate('CommunityDetail', { id: c.id })}
                />
              ))}
            </KeyboardAwareScrollView>
          ) : (
            renderEmptySection(
              'No communities found',
              'Create a dedicated space for your game studio, engine circle, or guild.',
              'Create Community',
              () => nav.navigate('CreateCommunity')
            )
          )}

          {/* ================= 6. TRENDING DEMOS ================= */}
          {renderSectionHeader('Trending Demos', () => nav.navigate('DemosTab'))}
          {filteredDemos.length > 0 ? (
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollRow}
            >
              {filteredDemos.map((d) => {
                const avgRating = d.scores
                  ? (d.scores.gameplay + d.scores.art + d.scores.concept + d.scores.polish) / 4
                  : undefined;
                return (
                  <CyberDemoCard
                    key={d.id}
                    id={d.id}
                    title={d.title}
                    studio={d.developerName || 'Indie Creator'}
                    badge={d.isJamEntry ? 'JAM ENTRY' : d.genre?.toUpperCase() || 'DEMO'}
                    rating={avgRating != null ? Number(avgRating.toFixed(1)) : undefined}
                    reviewsCount={d.reviewCount || 0}
                    imageUri={d.thumbnail}
                    onPress={() => nav.navigate('DemoDetail', { id: d.id })}
                  />
                );
              })}
            </KeyboardAwareScrollView>
          ) : (
            renderEmptySection(
              'No demos found',
              'Publish your playable build, prototype, or vertical slice to gather peer critique.',
              'Upload Demo',
              () => nav.navigate('DemoUpload')
            )
          )}

          {/* ================= 7. DEVELOPERS NEAR YOUR STACK ================= */}
          {renderSectionHeader('Developers near your stack', () => nav.navigate('Network'))}
          {filteredPeople.length > 0 ? (
            <KeyboardAwareScrollView
              keyboardShouldPersistTaps="handled"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollRow}
            >
              {filteredPeople.map((dev) => {
                const matchPct = personMatchScore(
                  { skills: user?.skills ?? [], roles: [] },
                  { skills: dev.skills ?? [], roles: dev.roles ?? [] },
                );

                return (
                  <CyberDeveloperCard
                    key={dev.id}
                    id={dev.id}
                    name={dev.displayName || 'Developer'}
                    role={
                      dev.roles?.join(' · ') ||
                      dev.skills?.slice(0, 2).join(' · ') ||
                      'Game Creator'
                    }
                    matchScore={`${matchPct}%`}
                    avatarUri={dev.avatarUri}
                    avatarSource={getCyberAvatarSource(dev.avatarId)}
                    status={dev.connect}
                    onConnect={async () => {
                      if (!user || dev.connect !== 'connect') return;
                      await connectPerson(user.id, dev.id);
                    }}
                    onPress={() => nav.navigate('Profile', { id: dev.id })}
                  />
                );
              })}
            </KeyboardAwareScrollView>
          ) : (
            renderEmptySection(
              'No developers found',
              'Grow your network to discover indie programmers, artists, and sound designers.',
              'Explore Network',
              () => nav.navigate('Network')
            )
          )}

          {/* ================= 8. WHAT PEOPLE ARE SAYING ================= */}
          {renderSectionHeader('What people are saying')}
          <CyberFeedPostCard
            userAvatarSource={currentAvatar.source}
            posts={feedPosts}
            hasMore={feedHasMore}
            onLoadMore={() => user && loadMorePosts(user.id)}
            newPostsAvailable={feedNewPostsAvailable}
            onLoadNewPosts={() => user && loadNewPosts(user.id)}
            onSubmitText={(text) => user && createPost({ userId: user.id, kind: 'text', content: text })}
            onSubmitActivity={(text, tag) => user && createPost({ userId: user.id, kind: 'activity', content: text, activityTag: tag })}
            onPickPhoto={async () => {
              const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
              if (res.canceled || !res.assets[0]) return undefined;
              return res.assets[0].uri;
            }}
            onSubmitPhoto={async (text, localUri) => {
              if (!user) return;
              try {
                const mediaUrl = await uploadPostImage(user.id, localUri);
                await createPost({ userId: user.id, kind: 'photo', content: text, mediaUrl });
              } catch {
                // Best-effort — a failed upload just means no post is created, nothing to roll back.
              }
            }}
            onToggleReaction={(postId, emoji) => user && reactToPost(postId, emoji, user.id)}
            onOpenComments={(postId) => setCommentsPostId(postId)}
            onShare={(post) => Share.share({ message: post.content || 'Check this out on Reapers' })}
            onReport={(postId) => setReportPostId(postId)}
            onDelete={(postId) => setDeletePostId(postId)}
            onEdit={(postId, content) => user && editPostAction(postId, user.id, content)}
          />
          <ConfirmSheet
            visible={!!reportPostId}
            title="Report this post"
            body="Reported posts are reviewed by the Reapers team. This doesn't notify the author."
            confirmLabel="Spam"
            extraActions={[
              { label: 'Harassment', onPress: () => { if (user && reportPostId) submitReport(user.id, 'post', reportPostId, 'Harassment').catch(() => undefined); setReportPostId(null); } },
              { label: 'Other', onPress: () => { if (user && reportPostId) submitReport(user.id, 'post', reportPostId, 'Other').catch(() => undefined); setReportPostId(null); } },
            ]}
            onClose={() => setReportPostId(null)}
            onConfirm={() => { if (user && reportPostId) submitReport(user.id, 'post', reportPostId, 'Spam').catch(() => undefined); setReportPostId(null); }}
          />
          <ConfirmSheet
            visible={!!deletePostId}
            title="Delete this post?"
            body="This removes it permanently for everyone. This can't be undone."
            confirmLabel="Delete"
            onClose={() => setDeletePostId(null)}
            onConfirm={() => { if (user && deletePostId) deletePostAction(deletePostId, user.id); setDeletePostId(null); }}
          />
          <PostCommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} userAvatarSource={currentAvatar.source} />

          {/* ================= 9. TEAM OPPORTUNITIES ================= */}
          {renderSectionHeader('Team opportunities', () => nav.navigate('Network'))}
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team) => {
              const isApplied = appliedTeams.has(team.id);
              return (
                <CyberTeamOppCard
                  key={team.id}
                  id={team.id}
                  title={team.project}
                  matchScore={`${teamMatchScore({ skills: user?.skills ?? [], roles: user?.roles ?? [] }, team)}%`}
                  tags={team.roles ?? []}
                  description={team.excerpt || undefined}
                  hoursRev={formatCommitment(team)}
                  avatarSource={resolveAvatarSource(team.posterAvatarUri, team.posterAvatarId)}
                  requested={isApplied}
                  onRequestToJoin={async () => {
                    if (!user) return;
                    await applyTeam(user.id, team.id);
                  }}
                  onPress={() => nav.navigate('Network')}
                  onHeaderPress={() => useProfilePreviewStore.getState().open(team.posterId)}
                />
              );
            })
          ) : (
            renderEmptySection(
              'No open team requests',
              'Need collaborators for your next game jam or commercial indie production?',
              'Post Opportunity',
              () => nav.navigate('PostTeamRequest')
            )
          )}

          {/* ================= 10. BOOK EXPERTS ================= */}
          {renderSectionHeader('Book Experts', () => nav.navigate('ExpertsTab'))}
          {filteredExperts.length > 0 ? (
            filteredExperts.map((exp) => (
              <CyberExpertBookCard
                key={exp.id}
                id={exp.id}
                name={exp.name}
                title={`${exp.role}${exp.company ? ' · ' + exp.company : ''}`}
                rating={exp.rating}
                reviewsCount={exp.reviewCount}
                availableSlot={exp.nextSlot || 'AVAILABLE'}
                avatarUri={exp.avatar}
                verified={exp.verified}
                avatarSource={getCyberAvatarSource(exp.avatarId)}
                onBook={() => nav.navigate('ExpertProfile', { id: exp.id })}
                onPress={() => nav.navigate('ExpertProfile', { id: exp.id })}
              />
            ))
          ) : (
            renderEmptySection(
              'No experts listed',
              'Book 1-on-1 mentorship, netcode debugging, and portfolio reviews with industry leads.',
              'Browse Experts',
              () => nav.navigate('ExpertsTab')
            )
          )}

          {/* ================= 11. RECENT ACTIVITIES ================= */}
          {renderSectionHeader('Recent Activities')}
          {recentItems.length > 0 ? (
            <View style={styles.recentActivitiesWrap}>
              <AutoCarousel
                items={recentItems}
                keyExtractor={(it) => it.key}
                showDots
                renderItem={(it) => (
                  <CyberCutBox
                    cutSize={10}
                    radius={5}
                    fill={light ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
                    borderColor={light ? colors.cardBorder : undefined}
                    style={styles.activityItemCard}
                  >
                    <Pressable onPress={it.onPress} style={styles.activityInner} accessibilityRole="button">
                      <View style={styles.activityThumbBox}>
                        {it.image ? (
                          <Image source={it.image} style={styles.activityAvatarImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name={it.icon} size={22} color="#00E5FF" />
                        )}
                      </View>
                      <View style={styles.activityTextWrap}>
                        <Text style={styles.activityKind}>{it.kindLabel}</Text>
                        <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={1}>
                          {it.title}
                        </Text>
                        {it.subtitle ? (
                          <Text style={[styles.activitySubText, { color: colors.muted }]} numberOfLines={1}>
                            {it.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.muted2} />
                    </Pressable>
                  </CyberCutBox>
                )}
              />
            </View>
          ) : (
            renderEmptySection(
              'Nothing to explore yet',
              'New events, communities, rooms, demos and experts will show up here.'
            )
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
  identityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarBoxWrap: {
    position: 'relative',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#00E699',
    borderWidth: 1.5,
    borderColor: '#090F1C',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    position: 'relative',
  },
  actionIconCutBox: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00E5FF',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: '#090F1C',
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D83CFF',
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
    fontSize: 17,
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
  seeAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  seeAllText: {
    fontFamily: fonts.bodyMed,
    fontSize: 11.5,
    color: '#8E9BB5',
  },
  searchNoResults: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4, textAlign: 'center', marginTop: 16 },
  horizontalScrollRow: {
    paddingRight: 12,
    marginBottom: 8,
  },
  recentActivitiesWrap: {
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  activityItemCard: {
    width: '100%',
    padding: 12,
  },
  activityInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityThumbBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityKind: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: '#00E5FF',
    marginBottom: 2,
  },
  activityAvatarImg: {
    width: '100%',
    height: '100%',
  },
  activityTextWrap: {
    flex: 1,
  },
  activityText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: '#E2E8F0',
  },
  activitySubText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
    marginTop: 2,
  },
  emptyCard: {
    width: '100%',
    padding: 16,
    marginBottom: 10,
  },
  emptyCardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  emptyCardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 290,
    marginBottom: 8,
  },
  emptyCardActionBtn: {
    marginTop: 6,
  },
  emptyCardActionCut: {
    paddingHorizontal: 16,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCardActionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

