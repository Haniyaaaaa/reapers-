import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { resolveAvatarSource } from '../../../data/cyberAvatars';

import type { MainStackParamList } from '../../../navigation/types';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNotificationStore } from '../../../store/notificationStore';
import { useNetworkStore } from '../../../store/networkStore';
import { subscribeToNotifications } from '../../../services/supabase/realtime';
import { navigateToNotificationTarget } from '../../../navigation/notificationTarget';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { NotificationItem } from '../../../types/extra';

function dayKey(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function timeAgoFormat(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(1, diffMins)}M`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}H`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}D`;
}

function isConnectionRequest(n: NotificationItem): n is NotificationItem & { target: { screen: 'Profile'; id: string } } {
  return n.title === 'New connection request' && n.target?.screen === 'Profile' && !!n.target.id;
}

function getNotificationIcon(title: string, body: string, targetScreen?: string) {
  // Chat message notifications are titled with just the sender's name and bodied with their
  // raw message text — neither reliably contains a matchable keyword, so this one type is
  // routed by its target screen instead of the text-keyword heuristic every other type uses.
  if (targetScreen === 'ChatDetail') return { name: 'chatbubble-ellipses-outline' as const, color: '#00E5FF' };
  if (targetScreen === 'TeamRequestApplicants') return { name: 'person-add-outline' as const, color: '#3DDC84' };
  // Connection requests get their own icon+color (person-add, cyan — matching the Accept
  // button below it) instead of falling through to the generic trophy every other unmatched
  // notification gets, which read as an odd, unrelated purple award icon here.
  if (title === 'New connection request' || title === 'Connection accepted') return { name: 'person-add-outline' as const, color: '#00E5FF' };
  const lower = `${title} ${body}`.toLowerCase();
  if (lower.includes('match') || lower.includes('teammate')) return { name: 'heart-outline' as const, color: '#3DDC84' };
  if (lower.includes('invite') || lower.includes('studio')) return { name: 'business-outline' as const, color: '#6D35FF' };
  if (lower.includes('community') || lower.includes('guild')) return { name: 'people-outline' as const, color: '#00E5FF' };
  if (lower.includes('reply') || lower.includes('message') || lower.includes('comment')) return { name: 'chatbubble-ellipses-outline' as const, color: '#00E5FF' };
  if (lower.includes('session') || lower.includes('event') || lower.includes('confirm')) return { name: 'calendar-outline' as const, color: '#00E5FF' };
  if (lower.includes('review') || lower.includes('rating')) return { name: 'notifications-outline' as const, color: '#F5C542' };
  return { name: 'trophy-outline' as const, color: '#D83CFF' };
}

export function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark, isLight } = useTheme();

  const notes = useNotificationStore((s) => s.notes);
  const loading = useNotificationStore((s) => s.loading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markNoteRead = useNotificationStore((s) => s.markNoteRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const deleteNote = useNotificationStore((s) => s.deleteNote);
  const handleRealtimeInsert = useNotificationStore((s) => s.handleRealtimeInsert);
  const respondConnection = useNetworkStore((s) => s.respondConnection);
  const connections = useNetworkStore((s) => s.connections);
  const fetchConnections = useNetworkStore((s) => s.fetchConnections);

  const [tab, setTab] = useState<'all' | 'requests'>('all');
  const [responding, setResponding] = useState<Set<string>>(new Set());

  const userId = user?.id;
  useEffect(() => {
    if (userId) fetchNotifications(userId, { ifStaleMs: 10_000 });
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (userId) fetchConnections(userId);
  }, [userId, fetchConnections]);

  // A connection can be accepted/declined by a path that never touches this notification (the
  // request predates in-line Accept/Decline, or was resolved from the Network screen instead) —
  // that leaves a "wants to connect" notification pointing at a request that no longer exists.
  // Once real connection data is in, clear out any request notification it no longer matches.
  const stillPendingIds = useMemo(
    () => new Set(connections.filter((c) => c.status === 'pending' && c.direction === 'incoming').map((c) => c.otherId)),
    [connections],
  );
  useEffect(() => {
    if (connections.length === 0) return;
    for (const n of notes) {
      if (isConnectionRequest(n) && n.title === 'New connection request' && !stillPendingIds.has(n.target.id)) {
        deleteNote(n.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, stillPendingIds]);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.id, (row) =>
      handleRealtimeInsert({
        id: row.id,
        title: row.title,
        body: row.body,
        createdAt: row.created_at,
        read: row.read,
        target: row.target as NotificationItem['target'],
        actorId: null,
      }),
    );
  }, [user, handleRealtimeInsert]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchNotifications(user.id);
  });

  const unreadCount = useMemo(() => notes.filter((n) => !n.read).length, [notes]);

  const requestCount = useMemo(() => notes.filter(isConnectionRequest).length, [notes]);
  const visibleNotes = useMemo(() => (tab === 'requests' ? notes.filter(isConnectionRequest) : notes), [notes, tab]);

  const groups = useMemo(() => {
    return visibleNotes.reduce<Record<string, typeof notes>>((acc, n) => {
      const k = dayKey(n.createdAt);
      acc[k] = acc[k] ? [...acc[k], n] : [n];
      return acc;
    }, {});
  }, [visibleNotes]);

  const open = (n: (typeof notes)[0]) => {
    markNoteRead(n.id);
    navigateToNotificationTarget(nav, n.target);
  };

  const respond = async (n: NotificationItem, accept: boolean) => {
    if (!user || !isConnectionRequest(n) || responding.has(n.id)) return;
    setResponding((s) => new Set(s).add(n.id));
    try {
      await respondConnection(user.id, n.target.id, accept);
      deleteNote(n.id);
    } finally {
      setResponding((s) => {
        const next = new Set(s);
        next.delete(n.id);
        return next;
      });
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            TODAY · {unreadCount} NEW
          </Text>
        </View>

        <Pressable
          onPress={() => user && markAllRead(user.id)}
          style={styles.markAllBtn}
          accessibilityRole="button"
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>Mark read</Text>
        </Pressable>
      </View>

      {/* Notifications / Requests tabs — requests get their own view with inline Accept/Decline */}
      <View style={styles.tabsRow}>
        <Pressable onPress={() => setTab('all')} style={styles.tabTouch} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={tab === 'all' ? colors.cardFillActive : colors.cardFill}
            borderColor={tab === 'all' ? colors.cardBorderActive : colors.cardBorder}
            borderWidth={0.88}
            style={styles.tabCut}
          >
            <View style={styles.tabInner}>
              <Ionicons name="notifications-outline" size={14} color={tab === 'all' ? colors.text : colors.muted} />
              <Text style={[styles.tabText, { color: tab === 'all' ? colors.text : colors.muted }]}>Notifications</Text>
            </View>
          </CyberCutBox>
        </Pressable>
        <Pressable onPress={() => setTab('requests')} style={styles.tabTouch} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={tab === 'requests' ? colors.cardFillActive : colors.cardFill}
            borderColor={tab === 'requests' ? colors.cardBorderActive : colors.cardBorder}
            borderWidth={0.88}
            style={styles.tabCut}
          >
            <View style={styles.tabInner}>
              <Ionicons name="person-add-outline" size={14} color={tab === 'requests' ? colors.text : colors.muted} />
              <Text style={[styles.tabText, { color: tab === 'requests' ? colors.text : colors.muted }]}>Requests</Text>
              {requestCount > 0 ? (
                <LinearGradient colors={['#00E5FF', '#6D35FF', '#D83CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{requestCount}</Text>
                </LinearGradient>
              ) : null}
            </View>
          </CyberCutBox>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="100%" height={74} />
            <Skeleton width="100%" height={74} />
            <Skeleton width="100%" height={74} />
          </View>
        ) : null}

        {!loading && visibleNotes.length === 0 ? (
          <EmptyState title={tab === 'requests' ? 'No connection requests right now.' : 'No notifications yet.'} />
        ) : null}

        {!loading
          ? Object.entries(groups).map(([day, list]) => (
              <View key={day} style={styles.groupSection}>
                <Text style={[styles.dayLabel, { color: colors.muted }]}>{day}</Text>
                {list.map((n) => {
                  const iconInfo = getNotificationIcon(n.title, n.body, n.target?.screen);
                  const isUnread = !n.read;
                  const isRequest = isConnectionRequest(n);
                  const isResponding = responding.has(n.id);
                  return (
                    <Pressable
                      key={n.id}
                      onPress={() => (isRequest ? markNoteRead(n.id) : open(n))}
                      disabled={isRequest && isResponding}
                      accessibilityRole="button"
                      style={{ marginBottom: 10, opacity: isRequest && isResponding ? 0.6 : 1 }}
                    >
                      <CyberCutBox
                        cutSize={12}
                        radius={8}
                        fill={isUnread ? (isLight ? 'rgba(22, 163, 74, 0.08)' : 'rgba(20, 45, 35, 0.7)') : colors.cardFill}
                        borderColor={isUnread ? (isLight ? 'rgba(22, 163, 74, 0.45)' : 'rgba(61, 220, 132, 0.6)') : colors.cardBorder}
                        borderWidth={0.88}
                        style={styles.cardBox}
                      >
                        <View style={[styles.cardInner, isRequest && styles.cardInnerRequest]}>
                          {/* Notification Icon — the actor's real avatar when this notification is
                              about one specific person, else a generic type icon. On a request,
                              the avatar itself opens that person's profile — the point of showing
                              it here at all is knowing who's asking before you decide. */}
                          {isRequest ? (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                nav.navigate('Profile', { id: n.target.id });
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="View profile"
                              style={styles.avatarBoxWrap}
                            >
                              <CutAvatar source={resolveAvatarSource(n.actorAvatarUri, n.actorAvatarId)} size={36} cut={9} borderWidth={1} />
                            </Pressable>
                          ) : n.actorId ? (
                            <View style={styles.avatarBoxWrap}>
                              <CutAvatar source={resolveAvatarSource(n.actorAvatarUri, n.actorAvatarId)} size={36} cut={9} borderWidth={1} />
                              <View style={[styles.avatarTypeBadge, { backgroundColor: isLight ? `${iconInfo.color}15` : `${iconInfo.color}1E`, borderColor: colors.background }]}>
                                <Ionicons name={iconInfo.name} size={10} color={iconInfo.color} />
                              </View>
                            </View>
                          ) : (
                            <View style={[styles.iconBox, { backgroundColor: isLight ? `${iconInfo.color}15` : `${iconInfo.color}1E` }]}>
                              <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                            </View>
                          )}

                          {/* Title & Body */}
                          <View style={styles.contentCol}>
                            <View style={styles.titleRow}>
                              <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                                {n.title}
                              </Text>
                              <Text style={[styles.timeAgoText, { color: colors.muted2 }]}>{timeAgoFormat(n.createdAt)}</Text>
                            </View>
                            <Text style={[styles.noteBody, { color: colors.muted }]} numberOfLines={2}>
                              {n.body}
                            </Text>
                          </View>

                          {/* Dismiss Button — a request resolves through Accept/Decline instead */}
                          {!isRequest ? (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                deleteNote(n.id);
                              }}
                              style={styles.dismissBtn}
                              hitSlop={8}
                              accessibilityRole="button"
                            >
                              <Ionicons name="close" size={16} color={colors.muted2} />
                            </Pressable>
                          ) : null}
                        </View>

                        {isRequest ? (
                          <View style={styles.requestActionsRow}>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                respond(n, false);
                              }}
                              disabled={isResponding}
                              style={[styles.requestBtn, { borderColor: colors.cardBorder }]}
                              accessibilityRole="button"
                            >
                              <Text style={[styles.requestBtnText, { color: colors.muted }]}>Decline</Text>
                            </Pressable>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                respond(n, true);
                              }}
                              disabled={isResponding}
                              style={[styles.requestBtn, styles.requestBtnAccept]}
                              accessibilityRole="button"
                            >
                              <LinearGradient
                                colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                              />
                              <Text style={styles.requestBtnAcceptText}>{isResponding ? 'Please wait…' : 'Accept'}</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>
            ))
          : null}
      </ScrollView>
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
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: '#00E5FF',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabTouch: { flex: 1 },
  tabCut: { height: 40 },
  tabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%' },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontFamily: fonts.monoBold, fontSize: 10, color: '#FFFFFF' },
  cardInnerRequest: { paddingBottom: 8 },
  requestActionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 12, marginTop: -2 },
  requestBtn: { flex: 1, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  requestBtnText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  requestBtnAccept: { borderWidth: 0 },
  requestBtnAcceptText: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#FFFFFF' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  groupSection: {
    marginBottom: 16,
  },
  dayLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    marginBottom: 10,
  },
  cardBox: {
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  avatarBoxWrap: {
    width: 36,
    height: 36,
    marginTop: 2,
  },
  avatarTypeBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contentCol: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 8,
  },
  timeAgoText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#8E9BB5',
  },
  noteBody: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#A6B4CE',
  },
  dismissBtn: {
    padding: 4,
  },
});
