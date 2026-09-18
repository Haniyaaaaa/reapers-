import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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
import { CyberCommunityCard } from '../../../components/cards/CyberCommunityCard';
import { CyberDemoCard } from '../../../components/cards/CyberDemoCard';
import { CyberDeveloperCard } from '../../../components/cards/CyberDeveloperCard';
import { CyberFeedPostCard } from '../../../components/cards/CyberFeedPostCard';
import { PostCommentsSheet } from '../../../components/feed/PostCommentsSheet';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { CyberTeamOppCard } from '../../../components/cards/CyberTeamOppCard';
import { CyberExpertBookCard } from '../../../components/cards/CyberExpertBookCard';
import { DEFAULT_AVATAR_ID, getCyberAvatarById, getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunitiesStore } from '../../../store/communitiesStore';
import { useDemoStore } from '../../../store/demoStore';
import { useEventStore } from '../../../store/eventStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { useNetworkStore } from '../../../store/networkStore';
import { useExpertStore } from '../../../store/expertStore';
import { useChatStore } from '../../../store/chatStore';
import { usePostsStore } from '../../../store/postsStore';
import { navigateToNotificationTarget } from '../../../navigation/notificationTarget';
import { personMatchScore } from '../../../utils/matching';
import { matchesEventFilters } from '../../../utils/eventFilters';
import { subscribeToNewPosts } from '../../../services/supabase/realtime';
import { uploadPostImage } from '../../../services/supabase/storage';
import { submitReport } from '../../../services/supabase/reports';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import type { NotificationItem } from '../../../types/extra';
import { fonts, useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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

function formatEventBadge(isoStr: string) {
  try {
    const d = new Date(isoStr);
    const diffHours = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60));
    if (diffHours <= 0) return 'LIVE NOW';
    if (diffHours <= 48) return `LIVE IN ${Math.max(1, Math.ceil(diffHours / 24))} DAYS`;
    return `STARTS ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
  } catch {
    return 'SCHEDULED';
  }
}

export function HomeScreen() {
  const { colors, light, gradients } = useTheme();
  const nav = useNavigation<Nav>();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [activeChip, setActiveChip] = useState('FOR YOU');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState | null>(null);
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lng: number } | undefined>();

  useEffect(() => {
    if (advancedFilters?.location !== 'WITHIN 50KM' || viewerCoords) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setViewerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // Best-effort — falls back to matchesEventFilters' pass-through when coords are unset.
      }
    })();
  }, [advancedFilters, viewerCoords]);

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

  const currentAvatar = getCyberAvatarById(user?.avatarId || DEFAULT_AVATAR_ID);

  useEffect(() => {
    fetchDemos();
    fetchExperts();
    if (user) {
      fetchCommunities(user.id);
      fetchEvents(user.id);
      fetchPeople(user.id);
      fetchTeams(user.id);
      fetchRooms(user.id);
      fetchNotifications(user.id);
      fetchFeed(user.id);
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
    user,
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
      if (user) {
        fetchNotifications(user.id);
        fetchRooms(user.id);
      }
    }, [user, fetchNotifications, fetchRooms])
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
    await Promise.all([
      fetchDemos(),
      fetchExperts(),
      user ? fetchCommunities(user.id) : Promise.resolve(),
      user ? fetchEvents(user.id) : Promise.resolve(),
      user ? fetchPeople(user.id) : Promise.resolve(),
      user ? fetchTeams(user.id) : Promise.resolve(),
      user ? fetchRooms(user.id) : Promise.resolve(),
      user ? fetchNotifications(user.id) : Promise.resolve(),
      user ? fetchFeed(user.id) : Promise.resolve(),
      new Promise((r) => setTimeout(r, 600)),
    ]);
    setRefreshing(false);
  };

  // Dynamic header timestamp and greeting
  const now = new Date();
  const headerTimestamp = useMemo(() => {
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} · ${time}`;
  }, []);

  const headerGreeting = useMemo(() => {
    const period = now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening';
    const name = user?.displayName?.split(' ')[0] || user?.username || 'Reaper';
    return `${period}, ${name}`;
  }, [user]);

  // Filtering for topic chips and search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const normalizedChip = activeChip === 'FOR YOU' ? '' : activeChip.toLowerCase();

  const matchesFilter = useCallback(
    (texts: (string | undefined | null)[]) => {
      const combined = texts.filter(Boolean).join(' ').toLowerCase();
      if (normalizedChip && !combined.includes(normalizedChip)) return false;
      if (normalizedQuery && !combined.includes(normalizedQuery)) return false;
      return true;
    },
    [normalizedChip, normalizedQuery]
  );

  const filteredCommunities = useMemo(() => {
    return communities.filter((c) => matchesFilter([c.name, c.description]));
  }, [communities, matchesFilter]);

  const filteredDemos = useMemo(() => {
    return demos.filter((d) => matchesFilter([d.title, d.genre, d.description, d.developerName]));
  }, [demos, matchesFilter]);

  const filteredPeople = useMemo(() => {
    return people.filter(
      (p) =>
        p.id !== user?.id &&
        matchesFilter([p.displayName, ...(p.skills || []), ...(p.roles || [])])
    );
  }, [people, user?.id, matchesFilter]);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => matchesFilter([t.project, t.excerpt, ...(t.roles || [])]));
  }, [teams, matchesFilter]);

  const filteredExperts = useMemo(() => {
    return experts.filter((e) => matchesFilter([e.name, e.role, e.company, ...(e.specialties || [])]));
  }, [experts, matchesFilter]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => new Date(e.startsAt).getTime() >= Date.now() - 3600000)
      .filter((e) => !advancedFilters || matchesEventFilters(e, advancedFilters, viewerCoords))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events, advancedFilters, viewerCoords]);
  const featuredEvent = upcomingEvents[0];

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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
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
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill="rgba(45, 30, 75, 0.85)"
                  borderColor="rgba(216, 60, 255, 0.5)"
                  borderWidth={1.5}
                  style={styles.headerAvatarCutBox}
                >
                  <Image source={currentAvatar.source} style={styles.headerAvatarImg} />
                </CyberCutBox>
                <View style={styles.onlineStatusDot} />
              </Pressable>

              <View style={styles.greetingWrap}>
                <Text style={[styles.timestampText, { color: colors.muted }]} numberOfLines={1}>{headerTimestamp}</Text>
                <Text style={[styles.greetingText, { color: colors.text }]}>{headerGreeting}</Text>
              </View>
            </View>

            {/* Right Quick Actions: Network + Chat + Notifications + Settings */}
            <View style={styles.actionsGroup}>
              {/* Network Button */}
              <Pressable
                onPress={() => nav.navigate('Network')}
                style={styles.actionIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Open network"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.actionIconCutBox}
                >
                  <Ionicons name="people-outline" size={18} color={colors.electricAccent} />
                </CyberCutBox>
              </Pressable>

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
          <ScrollView
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
          </ScrollView>

          {/* ================= 4. UPCOMING EVENT ================= */}
          {renderSectionHeader('Upcoming Event', () => nav.navigate('EventsTab'))}
          {featuredEvent ? (
            <>
              <CyberEventCard
                id={featuredEvent.id}
                title={featuredEvent.title}
                dateStr={formatEventDate(featuredEvent.startsAt)}
                badge={formatEventBadge(featuredEvent.startsAt)}
                tags={[
                  featuredEvent.category || featuredEvent.type.toUpperCase(),
                  featuredEvent.paid ? `${featuredEvent.currency || 'PKR'} ${featuredEvent.price}` : 'FREE',
                ]}
                membersCount={`${featuredEvent.attendeeCount || 0} MEMBERS`}
                imageUri={featuredEvent.cover}
                onPress={() => nav.navigate('EventDetail', { id: featuredEvent.id })}
              />

              {upcomingEvents.length > 1 && (
                <View style={styles.carouselPaginationRow}>
                  {upcomingEvents.slice(0, 4).map((e, idx) => (
                    <View
                      key={e.id}
                      style={[styles.pagPill, idx === 0 && styles.pagPillActive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            renderEmptySection(
              'No upcoming events scheduled',
              'Host a launch watch party, dev jam, or tech showcase with your guild.',
              'Host an Event',
              () => nav.navigate('CreateEvent')
            )
          )}

          {/* ================= 5. FEATURED COMMUNITIES ================= */}
          {renderSectionHeader('Featured communities', () => nav.navigate('CommunitiesTab'))}
          {filteredCommunities.length > 0 ? (
            <ScrollView
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
            </ScrollView>
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
            <ScrollView
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
            </ScrollView>
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
            <ScrollView
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
                    avatarSource={getCyberAvatarSource('female_10')}
                    status={dev.connect}
                    onConnect={async () => {
                      if (!user || dev.connect !== 'connect') return;
                      await connectPerson(user.id, dev.id);
                    }}
                    onPress={() => nav.navigate('Profile', { id: dev.id })}
                  />
                );
              })}
            </ScrollView>
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
                  matchScore="95%"
                  tags={team.roles?.length ? team.roles : ['CREW', 'DEVELOPER']}
                  description={team.excerpt || 'Looking for collaborators on new project.'}
                  hoursRev="OPEN ROLE"
                  requested={isApplied}
                  onRequestToJoin={async () => {
                    if (!user) return;
                    await applyTeam(user.id, team.id);
                  }}
                  onPress={() => nav.navigate('Network')}
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
                rating={exp.rating || 5.0}
                reviewsCount={18}
                availableSlot={exp.nextSlot || 'AVAILABLE'}
                avatarUri={exp.avatar}
                avatarSource={exp.avatarId ? getCyberAvatarSource(exp.avatarId) : undefined}
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
          {notes.length > 0 ? (
            <View style={styles.recentActivitiesWrap}>
              {notes.slice(0, 5).map((note) => (
                <CyberCutBox
                  key={note.id}
                  cutSize={10}
                  radius={5}
                  fill={light ? colors.cardFill : "rgba(14, 20, 35, 0.85)"}
                  borderColor={light ? colors.cardBorder : undefined}
                  style={styles.activityItemCard}
                >
                  <Pressable
                    onPress={() => {
                      if (note.target) navigateToNotificationTarget(nav, note.target);
                      else nav.navigate('Notifications');
                    }}
                    style={styles.activityInner}
                  >
                    <View style={styles.activityAvatarBox}>
                      <Ionicons
                        name={
                          note.target && 'screen' in note.target
                            ? note.target.screen === 'EventDetail' || note.target.screen === 'EventHub'
                              ? 'calendar-outline'
                              : note.target.screen === 'ChatDetail' || note.target.screen === 'RoomInvites'
                              ? 'chatbubble-ellipses-outline'
                              : note.target.screen === 'Network' ||
                                note.target.screen === 'TeamRequestApplicants' ||
                                note.target.screen === 'CommunityDetail'
                              ? 'people-outline'
                              : note.target.screen === 'DemoDetail'
                              ? 'game-controller-outline'
                              : 'notifications-outline'
                            : 'notifications-outline'
                        }
                        size={18}
                        color="#00E5FF"
                      />
                    </View>
                    <View style={styles.activityTextWrap}>
                      <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={1}>
                        {note.title}
                      </Text>
                      {note.body ? (
                        <Text style={[styles.activitySubText, { color: colors.muted }]} numberOfLines={1}>
                          {note.body}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.activityMetaRow}>
                      <Text style={[styles.activityTimeText, { color: colors.muted2 }]}>
                        {formatRelativeTime(note.createdAt)}
                      </Text>
                    </View>
                  </Pressable>
                </CyberCutBox>
              ))}
            </View>
          ) : (
            renderEmptySection(
              'No recent activity',
              'Event updates, connection requests, and system alerts will appear here.'
            )
          )}
        </View>
      </ScrollView>

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
  headerAvatarCutBox: {
    width: 44,
    height: 44,
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E699',
    borderWidth: 1.5,
    borderColor: '#090F1C',
  },
  greetingWrap: {
    gap: 2,
    flex: 1,
  },
  timestampText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  greetingText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginBottom: 18,
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
    marginTop: 18,
    marginBottom: 12,
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
  carouselPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
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
  horizontalScrollRow: {
    paddingRight: 12,
    marginBottom: 4,
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
  activityAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTimeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
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

