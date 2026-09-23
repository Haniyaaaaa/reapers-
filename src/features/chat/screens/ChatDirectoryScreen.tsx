import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MainStackParamList } from '../../../navigation/types';
import { ChatroomRow } from '../../../components/cards/ChatroomRow';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { GuidelinesSheet } from '../../../components/feedback/GuidelinesSheet';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { STALE_MS } from '../../../store/swr';
import { useServerSearch } from '../../../hooks/useServerSearch';
import { listVisibleChatrooms } from '../../../services/supabase/chat';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAuth } from '../../../hooks/useAuth';
import { useChatStore } from '../../../store/chatStore';
import { useUiStore } from '../../../store/uiStore';
import { listConnectedPeople } from '../../../services/supabase/network';
import { fonts, useTheme } from '../../../theme';
import type { Chatroom } from '../../../types/chat';
import type { PersonCard } from '../../../types/extra';
import { brandLogo } from '../../../data/brand';
import { communityLogos } from '../../../data/communityLogos';
import { avatarUriFor } from '../../../data/gamerAvatars';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type FilterTab = 'ALL' | 'UNREAD' | 'ROOMS' | 'DMS';

export function ChatDirectoryScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const rooms = useChatStore((s) => s.rooms);
  const roomsHasMore = useChatStore((s) => s.roomsHasMore);
  const loading = useChatStore((s) => s.roomsLoading);
  const error = useChatStore((s) => s.roomsError);
  const fetchRooms = useChatStore((s) => s.fetchRooms);
  const loadMoreRooms = useChatStore((s) => s.loadMoreRooms);
  const joinRoom = useChatStore((s) => s.joinRoom);
  const requestToJoinRoom = useChatStore((s) => s.requestToJoinRoom);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);

  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [guidelinesTargetId, setGuidelinesTargetId] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [joinErr, setJoinErr] = useState('');
  const seenGuidelines = useUiStore((s) => s.seenGuidelines);
  const markGuidelinesSeen = useUiStore((s) => s.markGuidelinesSeen);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [startingDmId, setStartingDmId] = useState<string | null>(null);

  // Connected-people search for the "New Message" sheet — a real, paginated/searchable
  // server-side query (see listConnectedPeople), not the ~100-person discovery directory,
  // so it scales correctly no matter how many connections someone actually has.
  const [dmSearch, setDmSearch] = useState('');
  const dmSearchDq = useDebouncedValue(dmSearch);
  const [connections, setConnections] = useState<PersonCard[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsHasMore, setConnectionsHasMore] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    if (userId) fetchRooms(userId, { ifStaleMs: STALE_MS });
  }, [userId, fetchRooms]);

  useEffect(() => {
    if (!newMessageOpen || !user) return;
    let cancelled = false;
    setConnectionsLoading(true);
    listConnectedPeople(user.id, { search: dmSearchDq })
      .then((page) => {
        if (cancelled) return;
        setConnections(page.rows);
        setConnectionsHasMore(page.hasMore);
      })
      .finally(() => {
        if (!cancelled) setConnectionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [newMessageOpen, user, dmSearchDq]);

  const loadMoreConnections = async () => {
    if (!user || connectionsLoading) return;
    setConnectionsLoading(true);
    try {
      const page = await listConnectedPeople(user.id, { search: dmSearchDq, offset: connections.length });
      setConnections((prev) => [...prev, ...page.rows]);
      setConnectionsHasMore(page.hasMore);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const openDm = async (personId: string, displayName: string) => {
    if (!user || startingDmId) return;
    setStartingDmId(personId);
    try {
      const roomId = await startDirectMessage(user.id, personId, displayName);
      setNewMessageOpen(false);
      nav.navigate('ChatDetail', { id: roomId });
    } finally {
      setStartingDmId(null);
    }
  };

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchRooms(user.id);
  });

  const unreadCount = useMemo(() => rooms.reduce((acc, r) => acc + (r.unread || 0), 0), [rooms]);
  const teamThreadsCount = useMemo(() => rooms.filter((r) => r.kind === 'server' || r.kind === 'room').length, [rooms]);

  // Room search asks the server, so it finds group rooms beyond the pages already loaded. DMs take
  // their name from the other person's profile, so those are still matched among loaded conversations.
  const roomSearch = useServerSearch(dq, async (n) => (await listVisibleChatrooms(user?.id ?? '', 0, 40, n)).rows, { enabled: !!user?.id });

  const filtered = useMemo(() => {
    const needle = roomSearch.needle;
    const matchesText = (r: Chatroom) =>
      r.name.toLowerCase().includes(needle) ||
      r.description.toLowerCase().includes(needle) ||
      (r.serverRegion?.toLowerCase().includes(needle) ?? false);
    let source: Chatroom[] = rooms;
    if (needle && roomSearch.results) {
      // Prefer the live store copy of a room (join state, unread) over the search snapshot.
      const live = new Map(rooms.map((r) => [r.id, r]));
      const groupHits = roomSearch.results.map((r) => live.get(r.id) ?? r);
      const dmHits = rooms.filter((r) => r.kind === 'dm' && matchesText(r));
      source = [...groupHits, ...dmHits];
    }
    return source.filter((r) => {
      const matchQ =
        !needle ||
        (needle && roomSearch.results !== null) ||
        r.name.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        (r.serverRegion?.toLowerCase().includes(needle) ?? false);
      if (!matchQ) return false;
      if (activeTab === 'UNREAD') return r.unread > 0;
      if (activeTab === 'ROOMS') return r.kind === 'room' || r.kind === 'server';
      if (activeTab === 'DMS') return r.kind === 'dm';
      return true;
    });
  }, [rooms, roomSearch.results, roomSearch.needle, activeTab]);

  const pending = rooms.find((r) => r.id === pendingId);
  const open = (r: Chatroom) => {
    if (r.joined) {
      nav.navigate('ChatDetail', { id: r.id });
    } else if (r.joinRequestPending) {
      // Already sent — re-showing the same "Request to join" prompt would let someone fire
      // off duplicate requests by tapping again. ChatroomRow's own subtitle already tells
      // them it's pending; nothing to do here.
      return;
    } else if (!seenGuidelines[r.id]) {
      setGuidelinesTargetId(r.id);
    } else {
      setPendingId(r.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.headerBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.headerCutBox}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {unreadCount > 0 ? `${unreadCount} UNREAD` : '0 UNREAD'} · {teamThreadsCount} TEAM THREADS
          </Text>
        </View>

        <Pressable onPress={() => setNewMessageOpen(true)} style={styles.headerBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.headerCutBox}
          >
            <Ionicons name="create-outline" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* Search Bar */}
        <CyberCutBox
          cutSize={10}
          radius={6}
          fill={colors.inputFill}
          borderColor={colors.inputBorder}
          borderWidth={0.88}
          style={styles.searchCutBox}
        >
          <View style={styles.searchInputRow}>
            <Ionicons name="search-outline" size={18} color={colors.muted2} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search conversations"
              placeholderTextColor={colors.muted2}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.muted2} />
              </Pressable>
            ) : null}
          </View>
        </CyberCutBox>

        {/* Filter Tabs (ALL / UNREAD / ROOMS / DMS) */}
        <KeyboardAwareScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
          {(['ALL', 'UNREAD', 'ROOMS', 'DMS'] as FilterTab[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={styles.tabBtn}
                accessibilityRole="button"
              >
                <CyberCutBox
                  gradient={active}
                  cutSize={8}
                  radius={4}
                  fill={active ? undefined : colors.cardFill}
                  borderColor={active ? undefined : colors.cardBorder}
                  borderWidth={active ? 0 : 0.88}
                  style={styles.tabCutBox}
                >
                  <View style={styles.tabInner}>
                    <Text style={[styles.tabText, active ? styles.tabTextActive : { color: colors.muted }]}>{tab}</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            );
          })}
        </KeyboardAwareScrollView>

        {/* Prominent Create Room CTA — shown whenever you're looking at rooms specifically,
            not just the small pencil icon in the header, which is easy to miss. */}
        {activeTab === 'ROOMS' ? (
          <Pressable onPress={() => nav.navigate('CreateRoom')} style={styles.createRoomBtn} accessibilityRole="button">
            <CyberCutBox gradient cutSize={8} radius={4} style={styles.createRoomCut}>
              <View style={styles.createRoomInner}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.createRoomText}>Create Room</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        ) : null}

        {/* Prominent New Message CTA — mirrors Create Room above; lets you message any
            connection directly instead of only ones you already have a thread with. */}
        {activeTab === 'DMS' ? (
          <Pressable onPress={() => setNewMessageOpen(true)} style={styles.createRoomBtn} accessibilityRole="button">
            <CyberCutBox gradient cutSize={8} radius={4} style={styles.createRoomCut}>
              <View style={styles.createRoomInner}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.createRoomText}>New Message</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        ) : null}

        {/* Loading Skeleton */}
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="100%" height={74} />
            <Skeleton width="100%" height={74} />
            <Skeleton width="100%" height={74} />
          </View>
        ) : null}

        {/* Error Retry Banner */}
        {!loading && error ? <RetryBanner onRetry={() => user && fetchRooms(user.id)} /> : null}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 ? (
          activeTab === 'ROOMS' ? (
            <EmptyState
              title="No rooms yet."
              actionLabel="Create a room"
              onAction={() => nav.navigate('CreateRoom')}
            />
          ) : activeTab === 'DMS' ? (
            <EmptyState
              title="No direct messages yet."
              actionLabel="Message a connection"
              onAction={() => setNewMessageOpen(true)}
            />
          ) : (
            <EmptyState
              title="No conversations found."
              actionLabel="Find teammates to message"
              onAction={() => nav.navigate('Network')}
            />
          )
        ) : null}

        {/* Conversations List */}
        {!loading && !error
          ? filtered.map((r) => <ChatroomRow key={r.id} room={r} onPress={() => open(r)} />)
          : null}

        {!loading && !error && filtered.length > 0 ? (
          <LoadMoreButton hasMore={roomsHasMore} onPress={() => user && loadMoreRooms(user.id)} />
        ) : null}
      </KeyboardAwareScrollView>

      {/* Confirmation Modals */}
      <GuidelinesSheet
        visible={!!guidelinesTargetId}
        onAccept={() => {
          if (guidelinesTargetId) {
            markGuidelinesSeen(guidelinesTargetId);
            setPendingId(guidelinesTargetId);
          }
          setGuidelinesTargetId(null);
        }}
        onClose={() => setGuidelinesTargetId(null)}
      />

      <ConfirmSheet
        visible={!!pending}
        title={pending?.requiresApproval ? `Request to join ${pending?.name ?? ''}` : `Join ${pending?.name ?? ''}`}
        body={
          pending?.requiresApproval
            ? "This room's admin approves join requests — you'll be notified once they respond."
            : pending?.description ?? ''
        }
        confirmLabel={pending?.requiresApproval ? 'Send request' : 'Join'}
        danger={false}
        onClose={() => setPendingId(null)}
        onConfirm={async () => {
          if (!pending || !user) return;
          setJoinErr('');
          try {
            if (pending.requiresApproval) {
              await requestToJoinRoom(pending.id, user.id);
              setPendingId(null);
              setRequestSent(true);
            } else {
              await joinRoom(user.id, pending.id);
              setPendingId(null);
              nav.navigate('ChatDetail', { id: pending.id });
            }
          } catch (e) {
            // The sheet stays open over this screen, so InlineErrorText rendered down in the
            // page below it was invisible — a failed join looked like tapping Join did nothing
            // at all. An alert floats above the sheet instead.
            const message = e instanceof Error ? e.message : ((e as any)?.message || 'Could not join room');
            setJoinErr(message);
            Alert.alert('Could not join', message);
          }
        }}
      />

      {joinErr ? <InlineErrorText message={joinErr} /> : null}

      <ConfirmSheet
        visible={requestSent}
        title="Request sent"
        body="The room's admin will review your request. You'll get a notification once they respond."
        confirmLabel="OK"
        danger={false}
        onClose={() => setRequestSent(false)}
        onConfirm={() => setRequestSent(false)}
      />

      {/* New Message — searchable, paginated list of every accepted connection (not just
          people you already have a thread with); a real server-side query + FlatList
          virtualization, so this stays fast and correct whether someone has 5 connections or
          5,000, tapping one starts/opens the DM. */}
      <Modal visible={newMessageOpen} animationType="slide" transparent onRequestClose={() => setNewMessageOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Message</Text>
              <Pressable onPress={() => setNewMessageOpen(false)} accessibilityRole="button" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <CyberCutBox cutSize={8} radius={5} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={0.88} style={styles.dmSearchCutBox}>
              <View style={styles.searchInputRow}>
                <Ionicons name="search-outline" size={16} color={colors.muted2} />
                <TextInput
                  value={dmSearch}
                  onChangeText={setDmSearch}
                  placeholder="Search connections"
                  placeholderTextColor={colors.muted2}
                  style={[styles.searchInput, { color: colors.text }]}
                />
              </View>
            </CyberCutBox>

            <FlatList
              data={connections}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 420 }}
              keyboardShouldPersistTaps="handled"
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (connectionsHasMore) loadMoreConnections();
              }}
              ListEmptyComponent={
                connectionsLoading ? null : (
                  <EmptyState
                    title={dmSearchDq ? 'No connections match that search.' : 'No connections yet.'}
                    actionLabel="Find teammates"
                    onAction={() => {
                      setNewMessageOpen(false);
                      nav.navigate('Network');
                    }}
                  />
                )
              }
              ListFooterComponent={connectionsLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
              renderItem={({ item: p }) => (
                <Pressable
                  onPress={() => openDm(p.id, p.displayName)}
                  disabled={!!startingDmId}
                  style={styles.connectionRow}
                  accessibilityRole="button"
                >
                  <CutAvatar source={resolveAvatarSource(p.avatarUri, p.avatarId)} size={44} cut={11} borderWidth={1} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.connectionName, { color: colors.text }]} numberOfLines={1}>
                      {p.displayName}
                    </Text>
                    <Text style={[styles.connectionRole, { color: colors.muted }]} numberOfLines={1}>
                      {p.roles.join(' · ') || 'Member'}
                    </Text>
                  </View>
                  {startingDmId === p.id ? <Text style={{ color: colors.muted, fontSize: 12 }}>Opening…</Text> : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
  },
  headerCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchCutBox: {
    width: '100%',
    height: 46,
    marginBottom: 14,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    height: 36,
    minWidth: 80,
  },
  tabCutBox: {
    height: 36,
    width: '100%',
  },
  tabInner: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#8E9BB5',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  createRoomBtn: {
    height: 42,
    marginBottom: 16,
  },
  createRoomCut: {
    width: '100%',
    height: '100%',
  },
  createRoomInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createRoomText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
  },
  dmSearchCutBox: {
    height: 42,
    marginBottom: 12,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  connectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  connectionName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14.5,
    fontWeight: '700',
  },
  connectionRole: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    marginTop: 2,
  },
});
