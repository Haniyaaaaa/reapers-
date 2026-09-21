import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { FilterChip } from '../../../components/inputs/FilterChip';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAuth } from '../../../hooks/useAuth';
import { useChatStore } from '../../../store/chatStore';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import type { MainStackParamList } from '../../../navigation/types';
import type { ChatMessage } from '../../../types/chat';
import { fonts, useTheme } from '../../../theme';
import { formatDayLabel, formatTime } from '../../../utils/format';

type Tab = 'starred' | 'pinned';

/** A message's own preview label for kinds that aren't plain text — same convention as the
 * pinned banner / reply-quote previews already use elsewhere in chat. */
function previewFor(m: ChatMessage): string {
  if (m.kind === 'gif') return 'GIF';
  if (m.kind === 'sticker') return 'Sticker';
  if (m.kind === 'image') return 'Photo';
  if (m.kind === 'video') return 'Video';
  if (m.kind === 'voice') return 'Voice message';
  return m.content;
}

/** Reached from a room/community's "..." menu — "Starred messages" and "Pinned messages" both
 * open this, scoped to that one room (like WhatsApp's per-chat starred list), not every
 * starred message across the whole app. Both tabs query the room directly rather than relying
 * on whatever happens to already be loaded in the live chat thread, so a starred/pinned
 * message from before the currently-scrolled-to window still shows up. */
export function RoomStarredScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'RoomStarred'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(params?.tab ?? 'starred');

  const starred = useChatStore((s) => s.roomStarred[params.roomId]) ?? [];
  const starredLoading = useChatStore((s) => s.roomStarredLoading[params.roomId]);
  const fetchRoomStarred = useChatStore((s) => s.fetchRoomStarred);
  const pinned = useChatStore((s) => s.roomPinned[params.roomId]) ?? [];
  const pinnedLoading = useChatStore((s) => s.roomPinnedLoading[params.roomId]);
  const fetchRoomPinned = useChatStore((s) => s.fetchRoomPinned);
  const toggleStarMessage = useChatStore((s) => s.toggleStarMessage);
  const togglePinMessage = useChatStore((s) => s.togglePinMessage);

  useEffect(() => {
    if (!user) return;
    if (tab === 'starred') fetchRoomStarred(params.roomId, user.id);
    else fetchRoomPinned(params.roomId, user.id);
  }, [tab, params.roomId, user, fetchRoomStarred, fetchRoomPinned]);

  const refreshControl = useRefreshControl(async () => {
    if (!user) return;
    if (tab === 'starred') await fetchRoomStarred(params.roomId, user.id);
    else await fetchRoomPinned(params.roomId, user.id);
  });

  const data = tab === 'starred' ? starred : pinned;
  const loading = tab === 'starred' ? starredLoading : pinnedLoading;

  const renderRow = ({ item }: { item: ChatMessage }) => (
    <Pressable
      style={[styles.row, { borderColor: colors.cardBorder }]}
      onPress={() => nav.navigate('ChatDetail', { id: params.roomId })}
      accessibilityRole="button"
    >
      <CutAvatar source={resolveAvatarSource(item.senderAvatar, item.senderAvatarId)} size={38} cut={10} borderWidth={1} fill="#161B2E" />
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={[styles.senderName, { color: colors.text }]} numberOfLines={1}>{item.senderName}</Text>
          <Text style={[styles.rowTime, { color: colors.muted }]}>{formatDayLabel(item.createdAt)} · {formatTime(item.createdAt)}</Text>
        </View>
        <Text style={[styles.rowContent, { color: colors.muted }]} numberOfLines={2}>{previewFor(item)}</Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={async () => {
          if (!user) return;
          // Refetch right after so an unstarred/unpinned row disappears immediately —
          // togglePinMessage/toggleStarMessage only update the live chat thread cache, not
          // this screen's own list.
          if (tab === 'starred') {
            await toggleStarMessage(item.id, user.id);
            fetchRoomStarred(params.roomId, user.id);
          } else {
            await togglePinMessage(params.roomId, item.id);
            fetchRoomPinned(params.roomId, user.id);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={tab === 'starred' ? 'Unstar message' : 'Unpin message'}
      >
        <Ionicons name={tab === 'starred' ? 'star' : 'pin'} size={18} color={tab === 'starred' ? '#F5C542' : '#D83CFF'} />
      </Pressable>
    </Pressable>
  );

  return (
    <Screen scroll={false}>
      <ScreenHeader title="Saved messages" onBack={() => nav.goBack()} />
      <View style={styles.tabs}>
        <FilterChip label="Starred" selected={tab === 'starred'} onPress={() => setTab('starred')} />
        <FilterChip label="Pinned" selected={tab === 'pinned'} onPress={() => setTab('pinned')} />
      </View>

      {!loading && data.length === 0 ? (
        <EmptyState
          title={
            tab === 'starred'
              ? 'No starred messages in this chat yet.\nLong-press any message and star it to save it here.'
              : 'No pinned messages in this chat yet.\nLong-press any message and pin it to save it here.'
          }
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          refreshControl={refreshControl}
          data={data}
          keyExtractor={(m) => m.id}
          renderItem={renderRow}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  senderName: { fontFamily: fonts.bodySemi, fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  rowTime: { fontFamily: fonts.mono, fontSize: 9.5 },
  rowContent: { fontFamily: fonts.body, fontSize: 13 },
});
