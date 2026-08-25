import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList } from '../../../navigation/types';
import { ChatMemberSlider } from '../../../components/chat/ChatMemberSlider';
import { EmojiPickerTray } from '../../../components/chat/EmojiPickerTray';
import { GifPickerTray } from '../../../components/chat/GifPickerTray';
import { MessageActionSheet } from '../../../components/chat/MessageActionSheet';
import { MessageInfoSheet } from '../../../components/chat/MessageInfoSheet';
import { ForwardSendTo } from '../../../components/chat/ForwardSendTo';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { brandLogo } from '../../../data/brand';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunityStore } from '../../../store/communityStore';
import { useUiStore } from '../../../store/uiStore';
import { fonts, radius, useTheme } from '../../../theme';
import { copyText } from '../../../utils/copyText';
import { formatTime } from '../../../utils/format';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { streakGlyph } from '../../../data/streaks';
import { onlineUsers } from '../../../data/mock';
import type { ChatMessage } from '../../../types/chat';

export function ChatDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'ChatDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useTheme();
  const { user } = useAuth();
  const rooms = useCommunityStore((s) => s.rooms);
  const messages = useCommunityStore((s) => s.messages);
  const sendMessage = useCommunityStore((s) => s.sendMessage);
  const retryMessage = useCommunityStore((s) => s.retryMessage);
  const editMessage = useCommunityStore((s) => s.editMessage);
  const deleteMessage = useCommunityStore((s) => s.deleteMessage);
  const reactToMessage = useCommunityStore((s) => s.reactToMessage);
  const toggleStarMessage = useCommunityStore((s) => s.toggleStarMessage);
  const togglePinMessage = useCommunityStore((s) => s.togglePinMessage);
  const typingRoomId = useCommunityStore((s) => s.typingRoomId);
  const setTyping = useCommunityStore((s) => s.setTyping);
  const leaveRoom = useCommunityStore((s) => s.leaveRoom);
  const toggleMute = useCommunityStore((s) => s.toggleMute);
  const togglePin = useCommunityStore((s) => s.togglePin);
  const loadOlderMessages = useCommunityStore((s) => s.loadOlderMessages);
  const streakEmoji = useUiStore((s) => s.streakEmoji);
  const room = rooms.find((r) => r.id === params?.id);
  const thread = useMemo(
    () => messages.filter((m) => m.roomId === params?.id).slice().reverse(),
    [messages, params?.id],
  );
  const pinned = useMemo(
    () => messages.filter((m) => m.roomId === params?.id && m.pinned && !m.deleted),
    [messages, params?.id],
  );
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [leave, setLeave] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [active, setActive] = useState<ChatMessage | null>(null);
  const [moreEmoji, setMoreEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [tray, setTray] = useState<'none' | 'emoji' | 'gif'>('none');
  const [recording, setRecording] = useState(false);
  const holdStart = useRef(0);
  const me = user?.displayName ?? 'You';

  useEffect(() => {
    if (!params?.id) return;
    const t = setTimeout(() => setTyping(params.id), 800);
    const t2 = setTimeout(() => setTyping(null), 2600);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [params?.id, setTyping]);

  const send = (payload?: { content?: string; kind?: ChatMessage['kind']; gifUri?: string; voiceDurationSec?: number }) => {
    const content = (payload?.content ?? text).trim();
    if (!params?.id) return;
    if (editingId && content) {
      editMessage(editingId, content);
      setEditingId(null);
      setText('');
      return;
    }
    const quote =
      replyTo && !replyTo.deleted
        ? { id: replyTo.id, senderName: replyTo.senderName, content: replyTo.kind === 'gif' ? 'GIF' : replyTo.content }
        : undefined;
    if (payload?.kind === 'gif' && payload.gifUri) {
      sendMessage(params.id, 'GIF', me, { kind: 'gif', gifUri: payload.gifUri, replyTo: quote });
      setTray('none');
      setReplyTo(null);
      return;
    }
    if (payload?.kind === 'voice') {
      sendMessage(params.id, 'Voice note', me, { kind: 'voice', voiceDurationSec: payload.voiceDurationSec, replyTo: quote });
      setReplyTo(null);
      return;
    }
    if (!content) return;
    sendMessage(params.id, content, me, { replyTo: quote });
    setText('');
    setTray('none');
    setReplyTo(null);
  };

  const renderBody = (item: ChatMessage) => {
    if (item.kind === 'gif' && item.gifUri) {
      return <Image source={{ uri: item.gifUri }} style={styles.gif} />;
    }
    if (item.kind === 'voice') {
      return (
        <View style={styles.voice}>
          <Ionicons name="play" size={16} color={colors.cyan} />
          <View style={[styles.voiceBar, { backgroundColor: colors.border }]}>
            <View style={[styles.voiceFill, { backgroundColor: colors.cyan, width: `${Math.min(90, (item.voiceDurationSec ?? 1) * 12)}%` }]} />
          </View>
          <Text style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 11 }}>{item.voiceDurationSec ?? 1}s</Text>
        </View>
      );
    }
    return (
      <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 15, fontStyle: item.deleted ? 'italic' : 'normal' }}>
        {item.content}
      </Text>
    );
  };

  const closeAction = () => {
    setActive(null);
    setMoreEmoji(false);
  };

  return (
    <LinearGradient colors={gradients.background} style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 16, flex: 1 }}>
        <ScreenHeader
          title={room?.kind === 'global' ? '# general' : room?.name ?? 'Chat'}
          onBack={() => nav.goBack()}
          right={
            <Pressable onPress={() => setMenu(true)} style={styles.icon} accessibilityRole="button" accessibilityLabel="Room menu">
              <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
            </Pressable>
          }
        />
        <View style={styles.logoWrap}>
          <Image
            source={
              room?.kind === 'global' || room?.id === 'g-general'
                ? brandLogo
                : room?.logo ?? (room?.avatar ? { uri: room.avatar } : brandLogo)
            }
            style={[styles.logo, { backgroundColor: colors.plumDeep }]}
          />
        </View>
        <ChatMemberSlider
          onUserPress={(id) => {
            if (id) nav.navigate('Profile', { id });
          }}
        />
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
          {room?.kind === 'global' ? 'Everyone can text here · ' : room?.kind === 'server' ? `${room.serverRegion ?? 'Server'} · ` : ''}
          {room?.memberCount ?? 0} members
          {room?.kind === 'dm' && room.streakCount ? ` · ${streakGlyph(streakEmoji)} ${room.streakCount}-day streak` : ''}
          {room?.muted ? ' · muted' : ''}
        </Text>
        {pinned[0] ? (
          <Pressable style={[styles.pinBar, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setActive(pinned[0])}>
            <Ionicons name="pin" size={14} color={colors.cyan} />
            <Text style={{ color: colors.text, fontFamily: fonts.body, flex: 1 }} numberOfLines={1}>
              {pinned[0].kind === 'gif' ? 'GIF' : pinned[0].content}
            </Text>
          </Pressable>
        ) : null}

        {thread.length === 0 ? <EmptyState title="No messages yet. Say hello." /> : null}

        <FlatList
          inverted
          data={thread}
          keyExtractor={(m) => m.id}
          onEndReached={() => params?.id && loadOlderMessages(params.id)}
          onEndReachedThreshold={0.2}
          contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
          ListHeaderComponent={
            typingRoomId === params?.id ? (
              <Text style={{ color: colors.cyan, fontFamily: fonts.body, fontSize: 12, padding: 8 }}>Someone is typing…</Text>
            ) : (
              <View />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (item.deleted) return;
                setMoreEmoji(false);
                setActive(item);
              }}
              onLongPress={() => {
                if (item.deleted) return;
                setMoreEmoji(false);
                setActive(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Message from ${item.senderName}`}
              style={[
                styles.bubble,
                { backgroundColor: colors.surface },
                item.mine && { alignSelf: 'flex-end', backgroundColor: colors.magentaDeep },
              ]}
            >
              {!item.mine ? <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed, fontSize: 12 }}>{item.senderName}</Text> : null}
              {item.replyTo ? (
                <View style={[styles.quote, { borderColor: colors.cyan }]}>
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi, fontSize: 11 }}>{item.replyTo.senderName}</Text>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }} numberOfLines={1}>
                    {item.replyTo.content}
                  </Text>
                </View>
              ) : null}
              {item.forwarded ? <Text style={{ color: colors.muted2, fontFamily: fonts.body, fontSize: 11 }}>Forwarded</Text> : null}
              {renderBody(item)}
              {item.reactions?.length ? (
                <View style={styles.reacts}>
                  {item.reactions.map((r) => (
                    <Pressable
                      key={r.emoji}
                      onPress={() => reactToMessage(item.id, r.emoji, me)}
                      style={[styles.reactChip, { backgroundColor: colors.surfaceElevated }]}
                    >
                      <Text style={{ fontSize: 12 }}>
                        {r.emoji} {r.users.length}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.metaRow}>
                {item.starred ? <Ionicons name="star" size={10} color={colors.warning} /> : null}
                {item.pinned ? <Ionicons name="pin" size={10} color={colors.cyan} /> : null}
                <Text style={{ color: colors.muted2, fontFamily: fonts.mono, fontSize: 10 }}>
                  {formatTime(item.createdAt)}
                  {item.edited && !item.deleted ? ' · edited' : ''}
                </Text>
                {item.mine && item.status === 'sent' ? <Ionicons name="checkmark-done" size={12} color={colors.cyan} /> : null}
                {item.status === 'failed' ? (
                  <Pressable onPress={() => retryMessage(item.id)}>
                    <Text style={{ color: colors.danger, fontFamily: fonts.bodyMed, fontSize: 12 }}>Retry</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          )}
        />

        {tray === 'emoji' ? <EmojiPickerTray onPick={(e) => setText((t) => t + e)} /> : null}
        {tray === 'gif' ? <GifPickerTray onPick={(uri) => send({ kind: 'gif', gifUri: uri })} /> : null}

        {replyTo ? (
          <View style={[styles.replyBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi, fontSize: 12 }}>Replying to {replyTo.senderName}</Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }} numberOfLines={1}>
                {replyTo.kind === 'gif' ? 'GIF' : replyTo.content}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} accessibilityRole="button" accessibilityLabel="Cancel reply">
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composer, { marginBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable onPress={() => setTray((t) => (t === 'emoji' ? 'none' : 'emoji'))} style={styles.send} accessibilityRole="button" accessibilityLabel="Emoji">
              <Ionicons name="happy-outline" size={22} color={tray === 'emoji' ? colors.magenta : colors.muted} />
            </Pressable>
            <Pressable onPress={() => setTray((t) => (t === 'gif' ? 'none' : 'gif'))} style={styles.send} accessibilityRole="button" accessibilityLabel="GIFs">
              <Text style={{ color: tray === 'gif' ? colors.magenta : colors.muted, fontFamily: fonts.bodySemi, fontSize: 12 }}>GIF</Text>
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={editingId ? 'Update message' : recording ? 'Recording…' : 'Message'}
              placeholderTextColor={colors.muted2}
              style={[styles.input, { color: colors.text }]}
            />
            {editingId ? (
              <Pressable
                onPress={() => {
                  setEditingId(null);
                  setText('');
                }}
                style={styles.send}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            ) : (
              <Pressable
                onPressIn={() => {
                  holdStart.current = Date.now();
                  setRecording(true);
                }}
                onPressOut={() => {
                  const sec = Math.max(1, Math.round((Date.now() - holdStart.current) / 1000));
                  setRecording(false);
                  if (sec >= 1) send({ kind: 'voice', voiceDurationSec: sec });
                }}
                style={styles.send}
                accessibilityRole="button"
                accessibilityLabel="Hold for voice note"
              >
                <Ionicons name={recording ? 'radio-button-on' : 'mic'} size={20} color={recording ? colors.danger : colors.text} />
              </Pressable>
            )}
            <Pressable onPress={() => send()} style={styles.send} accessibilityRole="button" accessibilityLabel="Send">
              <Ionicons name={editingId ? 'checkmark' : 'send'} size={18} color={colors.text} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>

      <MessageActionSheet
        message={active}
        moreEmoji={moreEmoji}
        onClose={closeAction}
        onOpenEmoji={() => setMoreEmoji(true)}
        onReact={(emoji) => {
          if (active) reactToMessage(active.id, emoji, me);
          closeAction();
        }}
        onReply={() => {
          if (active) setReplyTo(active);
          closeAction();
        }}
        onForward={() => {
          setForwardMsg(active);
          closeAction();
        }}
        onCopy={() => {
          if (active) copyText(active.kind === 'gif' ? active.gifUri ?? 'GIF' : active.content);
          closeAction();
        }}
        onInfo={() => {
          setInfoId(active?.id ?? null);
          closeAction();
        }}
        onStar={() => {
          if (active) toggleStarMessage(active.id);
          closeAction();
        }}
        onPin={() => {
          if (active) togglePinMessage(active.id);
          closeAction();
        }}
        onDelete={() => {
          if (active) setDeleteId(active.id);
          closeAction();
        }}
        onEdit={() => {
          if (active && active.kind !== 'gif') {
            setEditingId(active.id);
            setText(active.content);
          }
          closeAction();
        }}
      />

      <ForwardSendTo
        visible={!!forwardMsg}
        rooms={rooms}
        excludeRoomId={params?.id}
        frequent={rooms
          .filter((r) => r.kind === 'dm' && r.joined)
          .map((r) => ({
            id: r.id,
            name: r.name,
            subtitle: r.lastMessage || 'Direct message',
            avatarId: onlineUsers.find((u) => u.profileId === r.peerId)?.avatarId,
          }))}
        onClose={() => setForwardMsg(null)}
        onSend={(ids) => {
          if (!forwardMsg) return;
          ids.forEach((roomId) => {
            sendMessage(roomId, forwardMsg.content, me, {
              kind: forwardMsg.kind,
              gifUri: forwardMsg.gifUri,
              voiceDurationSec: forwardMsg.voiceDurationSec,
              forwarded: true,
            });
          });
        }}
      />
      <MessageInfoSheet message={infoId ? messages.find((m) => m.id === infoId) ?? null : null} onClose={() => setInfoId(null)} />

      <ConfirmSheet
        visible={menu}
        title={room?.name ?? 'Room'}
        body="Room actions"
        confirmLabel={room?.pinned ? 'Unpin' : 'Pin room'}
        extraActions={[
          {
            label: room?.muted ? 'Unmute' : 'Mute',
            onPress: () => {
              if (params?.id) toggleMute(params.id);
              setMenu(false);
            },
          },
          { label: 'Report', onPress: () => setMenu(false) },
          ...(room?.kind === 'global'
            ? []
            : [
                {
                  label: 'Leave room',
                  onPress: () => {
                    setMenu(false);
                    setLeave(true);
                  },
                },
              ]),
        ]}
        onClose={() => setMenu(false)}
        onConfirm={() => {
          if (params?.id) togglePin(params.id);
          setMenu(false);
        }}
      />
      <ConfirmSheet
        visible={leave}
        title="Leave room?"
        body="You can rejoin from Discover."
        confirmLabel="Leave"
        onClose={() => setLeave(false)}
        onConfirm={() => {
          if (params?.id) leaveRoom(params.id);
          setLeave(false);
          nav.goBack();
        }}
      />
      <ConfirmSheet
        visible={!!deleteId}
        title="Delete for everyone?"
        body="This removes the message for all members in the room."
        confirmLabel="Delete"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMessage(deleteId);
          setDeleteId(null);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginTop: -4, marginBottom: 6 },
  logo: { width: 40, height: 40, borderRadius: radius.sm },
  pinBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 10, minHeight: 36, marginBottom: 8 },
  bubble: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 4,
    maxWidth: '72%',
  },
  quote: { borderLeftWidth: 2, paddingLeft: 8, marginBottom: 6 },
  reacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactChip: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' },
  composer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  input: { flex: 1, fontFamily: fonts.body, minHeight: 44 },
  send: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  gif: { width: 180, height: 120, borderRadius: 12, marginTop: 4 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 140, marginTop: 4 },
  voiceBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  voiceFill: { height: 6, borderRadius: 3 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, padding: 8, marginBottom: 8 },
});
