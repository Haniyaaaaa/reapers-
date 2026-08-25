import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Chatroom } from '../../types/chat';
import { fonts, radius, useTheme } from '../../theme';
import { brandLogo } from '../../data/brand';
import { avatarUriFor } from '../../data/gamerAvatars';
import { streakGlyph } from '../../data/streaks';
import { useUiStore } from '../../store/uiStore';
import { BladeCard } from './BladeCard';

function StreakMark({ count }: { count: number }) {
  const { colors } = useTheme();
  const id = useUiStore((s) => s.streakEmoji);
  return <Text style={[styles.streak, { color: colors.magenta }]}>{streakGlyph(id)} {count}</Text>;
}

function kindIcon(kind?: Chatroom['kind']) {
  if (kind === 'global') return 'planet-outline' as const;
  if (kind === 'server') return 'server-outline' as const;
  if (kind === 'dm') return 'chatbubble-ellipses-outline' as const;
  return 'people-outline' as const;
}

export function ChatroomRow({ room, onPress }: { room: Chatroom; onPress: () => void }) {
  const { colors } = useTheme();
  const isReapers = room.kind === 'global' || room.id === 'g-general';
  const uri = room.avatar || (!room.logo && !isReapers ? avatarUriFor(undefined, room.name) : undefined);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={room.name} style={{ marginBottom: 10 }}>
      <BladeCard style={styles.card}>
        <View style={styles.row}>
          {isReapers || room.logo ? (
            <Image source={isReapers ? brandLogo : room.logo} style={[styles.logo, { backgroundColor: colors.plumDeep }]} accessibilityIgnoresInvertColors />
          ) : (
            <Image source={{ uri }} style={[styles.logo, { backgroundColor: colors.plumDeep }]} />
          )}
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Ionicons name={kindIcon(room.kind)} size={14} color={colors.cyan} />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {room.name}
              </Text>
              {room.kind === 'dm' && room.streakCount ? (
                <StreakMark count={room.streakCount} />
              ) : null}
            </View>
            <Text style={[styles.preview, { color: colors.muted }]} numberOfLines={1}>
              {room.kind === 'server' && room.serverRegion ? `${room.serverRegion} · ` : ''}
              {room.lastMessage}
            </Text>
          </View>
          {room.unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.magenta }]}>
              <Text style={[styles.badgeText, { color: colors.onPrimary }]}>{room.unread}</Text>
            </View>
          ) : null}
        </View>
      </BladeCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 52, height: 52, borderRadius: radius.md },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, flex: 1 },
  streak: { fontFamily: fonts.monoBold, fontSize: 12 },
  preview: { fontFamily: fonts.body, fontSize: 13 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: { fontFamily: fonts.monoBold, fontSize: 11 },
});
