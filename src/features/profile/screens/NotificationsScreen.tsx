import React, { useEffect, useMemo } from 'react';
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

import type { MainStackParamList } from '../../../navigation/types';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNotificationStore } from '../../../store/notificationStore';
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

function getNotificationIcon(title: string, body: string, targetScreen?: string) {
  // Chat message notifications are titled with just the sender's name and bodied with their
  // raw message text — neither reliably contains a matchable keyword, so this one type is
  // routed by its target screen instead of the text-keyword heuristic every other type uses.
  if (targetScreen === 'ChatDetail') return { name: 'chatbubble-ellipses-outline' as const, color: '#00E5FF' };
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

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user, fetchNotifications]);

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
      }),
    );
  }, [user, handleRealtimeInsert]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchNotifications(user.id);
  });

  const unreadCount = useMemo(() => notes.filter((n) => !n.read).length, [notes]);

  const groups = useMemo(() => {
    return notes.reduce<Record<string, typeof notes>>((acc, n) => {
      const k = dayKey(n.createdAt);
      acc[k] = acc[k] ? [...acc[k], n] : [n];
      return acc;
    }, {});
  }, [notes]);

  const open = (n: (typeof notes)[0]) => {
    markNoteRead(n.id);
    navigateToNotificationTarget(nav, n.target);
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

        {!loading && notes.length === 0 ? (
          <EmptyState title="No notifications yet." />
        ) : null}

        {!loading
          ? Object.entries(groups).map(([day, list]) => (
              <View key={day} style={styles.groupSection}>
                <Text style={[styles.dayLabel, { color: colors.muted }]}>{day}</Text>
                {list.map((n) => {
                  const iconInfo = getNotificationIcon(n.title, n.body, n.target?.screen);
                  const isUnread = !n.read;
                  return (
                    <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button" style={{ marginBottom: 10 }}>
                      <CyberCutBox
                        cutSize={12}
                        radius={8}
                        fill={isUnread ? (isLight ? 'rgba(22, 163, 74, 0.08)' : 'rgba(20, 45, 35, 0.7)') : colors.cardFill}
                        borderColor={isUnread ? (isLight ? 'rgba(22, 163, 74, 0.45)' : 'rgba(61, 220, 132, 0.6)') : colors.cardBorder}
                        borderWidth={0.88}
                        style={styles.cardBox}
                      >
                        <View style={styles.cardInner}>
                          {/* Notification Icon */}
                          <View style={[styles.iconBox, { backgroundColor: isLight ? `${iconInfo.color}15` : `${iconInfo.color}1E` }]}>
                            <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                          </View>

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

                          {/* Dismiss Button */}
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
                        </View>
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
