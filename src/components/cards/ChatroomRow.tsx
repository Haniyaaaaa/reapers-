import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Chatroom } from '../../types/chat';
import { fonts, useTheme } from '../../theme';
import { roomAvatarSource } from '../../data/roomAvatar';
import { CutAvatar } from '../avatars/CutAvatar';
import { streakGlyph } from '../../data/streaks';
import { useUiStore } from '../../store/uiStore';
import { usePresenceStore } from '../../store/presenceStore';
import { CyberCutBox } from '../cyber/CyberCutBox';

function StreakMark({ count }: { count: number }) {
  const { colors } = useTheme();
  const id = useUiStore((s) => s.streakEmoji);
  return <Text style={[styles.streak, { color: colors.magenta }]}>{streakGlyph(id)} {count}</Text>;
}

function formatRoomTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function kindIcon(kind?: Chatroom['kind']) {
  if (kind === 'global') return 'planet-outline' as const;
  if (kind === 'server') return 'server-outline' as const;
  if (kind === 'dm') return 'chatbubble-ellipses-outline' as const;
  return 'people-outline' as const;
}

export function ChatroomRow({ room, onPress }: { room: Chatroom; onPress: () => void }) {
  const { colors, isLight } = useTheme();
  const isReapers = room.kind === 'global' || room.id === 'g-general';
  const isUnread = room.unread > 0;
  const isPeerOnline = usePresenceStore((s) => (room.kind === 'dm' && room.peerId ? s.onlineUserIds.has(room.peerId) : false));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={room.name} style={{ marginBottom: 12 }}>
      <CyberCutBox
        cutSize={12}
        radius={8}
        fill="rgba(14, 20, 35, 0.85)"
        borderColor={isUnread ? 'rgba(216, 60, 255, 0.45)' : 'rgba(255, 255, 255, 0.12)'}
        borderWidth={0.88}
        style={styles.cardBox}
      >
        <View style={styles.cardInner}>
          {/* Avatar Container with Online Indicator */}
          <View style={styles.avatarWrap}>
            <CutAvatar
              source={roomAvatarSource(room)}
              size={46}
              cut={12}
              borderWidth={1}
              borderColor={isLight ? colors.cardBorder : 'rgba(192, 132, 252, 0.4)'}
              fill={isLight ? colors.surfaceElevated : '#161B2E'}
            />
            {isPeerOnline && <View style={[styles.onlineDot, isLight && { borderColor: '#FFFFFF' }]} />}
          </View>

          {/* Main Info */}
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Ionicons name={kindIcon(room.kind)} size={14} color={isLight ? colors.electricAccent : '#00E5FF'} />
              <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                {room.name}
              </Text>
              {room.kind === 'dm' && room.streakCount ? (
                <StreakMark count={room.streakCount} />
              ) : null}
            </View>

            <Text
              style={[styles.previewText, { color: room.joinRequestPending ? '#F5C542' : colors.muted }, room.joinRequestPending && styles.pendingText]}
              numberOfLines={1}
            >
              {room.joinRequestPending
                ? 'Request pending approval'
                : `${room.kind === 'server' && room.serverRegion ? `${room.serverRegion} · ` : ''}${room.lastMessage || 'Tap to view conversation'}`}
            </Text>
          </View>

          {/* Right Meta Column (Time & Unread Badge) */}
          <View style={styles.rightCol}>
            <Text style={[styles.timeText, { color: colors.muted }, isUnread && styles.timeTextUnread]}>
              {formatRoomTime(room.lastMessageAt)}
            </Text>

            {room.unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{room.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBox: {
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
    width: 46,
    height: 46,
  },
  avatarCutBox: {
    width: 46,
    height: 46,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#3DDC84',
    borderWidth: 2,
    borderColor: '#090F1C',
    zIndex: 5,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  streak: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
  },
  previewText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#8E9BB5',
  },
  pendingText: {
    fontFamily: fonts.bodyMed,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#8E9BB5',
  },
  timeTextUnread: {
    color: '#3DDC84',
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3DDC84',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    color: '#090F1C',
    fontWeight: '700',
  },
});
