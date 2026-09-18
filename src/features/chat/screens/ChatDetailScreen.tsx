import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

import type { MainStackParamList } from '../../../navigation/types';
import { AttachmentSheet } from '../../../components/chat/AttachmentSheet';
import { ChatMemberSlider } from '../../../components/chat/ChatMemberSlider';
import { EmojiPickerTray } from '../../../components/chat/EmojiPickerTray';
import { GifPickerTray } from '../../../components/chat/GifPickerTray';
import { MessageActionSheet } from '../../../components/chat/MessageActionSheet';
import { MessageInfoSheet } from '../../../components/chat/MessageInfoSheet';
import { ForwardSendTo } from '../../../components/chat/ForwardSendTo';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { InlineVideoPlayer } from '../../../components/media/InlineVideoPlayer';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { brandLogo } from '../../../data/brand';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useAuth } from '../../../hooks/useAuth';
import { useChatStore } from '../../../store/chatStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { useUiStore } from '../../../store/uiStore';
import { usePresenceStore } from '../../../store/presenceStore';
import { subscribeToRoomMessages, subscribeToRoomReactions, joinTypingChannel } from '../../../services/supabase/realtime';
import { submitReport } from '../../../services/supabase/reports';
import { fonts, useTheme } from '../../../theme';
import { checkContent } from '../../../utils/contentFilter';
import { copyText } from '../../../utils/copyText';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import { formatTime } from '../../../utils/format';
import { streakGlyph } from '../../../data/streaks';
import type { ChatMessage } from '../../../types/chat';

export function ChatDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'ChatDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const roomId = params?.id;

  const rooms = useChatStore((s) => s.rooms);
  const fetchRooms = useChatStore((s) => s.fetchRooms);
  const thread = useChatStore((s) => (roomId ? s.messages[roomId] ?? EMPTY_ARRAY : EMPTY_ARRAY));
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const sendMessageAction = useChatStore((s) => s.sendMessage);
  const sendMediaMessageAction = useChatStore((s) => s.sendMediaMessage);
  const retryMessageAction = useChatStore((s) => s.retryMessage);
  const editMessageAction = useChatStore((s) => s.editMessage);
  const deleteMessageAction = useChatStore((s) => s.deleteMessage);
  const deleteMessageForMeAction = useChatStore((s) => s.deleteMessageForMe);
  const reactToMessageAction = useChatStore((s) => s.reactToMessage);
  const toggleStarMessageAction = useChatStore((s) => s.toggleStarMessage);
  const togglePinMessageAction = useChatStore((s) => s.togglePinMessage);
  const ensureStarredLoaded = useChatStore((s) => s.ensureStarredLoaded);
  const ensureHiddenLoaded = useChatStore((s) => s.ensureHiddenLoaded);
  const typingRoomId = useChatStore((s) => s.typingRoomId);
  const setTyping = useChatStore((s) => s.setTyping);
  const leaveRoomAction = useChatStore((s) => s.leaveRoom);
  const toggleMuteAction = useChatStore((s) => s.toggleMute);
  const togglePinAction = useChatStore((s) => s.togglePin);
  const updateRoomAction = useChatStore((s) => s.updateRoom);
  const deleteRoomAction = useChatStore((s) => s.deleteRoom);
  const markRead = useChatStore((s) => s.markRead);
  const handleRealtimeInsert = useChatStore((s) => s.handleRealtimeInsert);
  const handleRealtimeUpdate = useChatStore((s) => s.handleRealtimeUpdate);
  const fetchPeerLastRead = useChatStore((s) => s.fetchPeerLastRead);
  const peerLastRead = useChatStore((s) => (roomId ? s.peerLastRead[roomId] : undefined));

  const room = rooms.find((r) => r.id === roomId);
  const isPeerOnline = usePresenceStore((s) => (room?.kind === 'dm' && room.peerId ? s.onlineUserIds.has(room.peerId) : false));
  const pinned = useMemo(() => thread.filter((m) => m.pinned && !m.deleted), [thread]);

  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [leave, setLeave] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteRoomConfirm, setDeleteRoomConfirm] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [active, setActive] = useState<ChatMessage | null>(null);
  const [moreEmoji, setMoreEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [tray, setTray] = useState<'none' | 'emoji' | 'gif'>('none');
  const [attaching, setAttaching] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [blockedMsg, setBlockedMsg] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = user?.displayName ?? 'Kai Mercer';

  useEffect(() => {
    if (rooms.length === 0 && user) fetchRooms(user.id);
  }, [rooms.length, user, fetchRooms]);

  useEffect(() => {
    if (!roomId || !user) return;
    markRead(user.id, roomId);
    ensureStarredLoaded(user.id);
    ensureHiddenLoaded(user.id).then(() => fetchMessages(roomId, user.id));
  }, [roomId, user, fetchMessages, markRead, ensureStarredLoaded, ensureHiddenLoaded]);

  useEffect(() => {
    if (!roomId || room?.kind !== 'dm' || !room.peerId) return;
    fetchPeerLastRead(roomId, room.peerId);
  }, [roomId, room?.kind, room?.peerId, fetchPeerLastRead]);

  const typingChannelRef = useRef<ReturnType<typeof joinTypingChannel> | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    const unsubMessages = subscribeToRoomMessages(
      roomId,
      (row) => {
        handleRealtimeInsert(roomId, user.id, row);
        if (room?.kind === 'dm' && room.peerId) fetchPeerLastRead(roomId, room.peerId);
      },
      (row) => handleRealtimeUpdate(roomId, row),
    );
    const unsubReactions = subscribeToRoomReactions(roomId, () => fetchMessages(roomId, user.id));
    const typing = joinTypingChannel(roomId, () => {
      setTyping(roomId);
      setTimeout(() => setTyping(null), 2600);
    });
    typingChannelRef.current = typing;
    return () => {
      unsubMessages();
      unsubReactions();
      typing.leave();
      typingChannelRef.current = null;
    };
  }, [roomId, user, handleRealtimeInsert, handleRealtimeUpdate, fetchMessages, setTyping, room?.kind, room?.peerId, fetchPeerLastRead]);

  const notifyTyping = () => {
    if (user) typingChannelRef.current?.notifyTyping(user.id);
  };

  useEffect(() => {
    if (pinnedIndex >= pinned.length) setPinnedIndex(0);
  }, [pinned.length, pinnedIndex]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  const scrollToMessage = (id: string) => {
    const index = thread.findIndex((m) => m.id === id);
    if (index === -1) return;
    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setHighlightId(id);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightId(null), 1600);
  };

  const send = (payload?: { content?: string; kind?: ChatMessage['kind']; gifUri?: string; voiceDurationSec?: number }) => {
    const content = (payload?.content ?? text).trim();
    if (!roomId || !user) return;
    if (editingId && content) {
      if (checkContent(content).flagged) {
        setBlockedMsg(true);
        return;
      }
      editMessageAction(roomId, editingId, content);
      setEditingId(null);
      setText('');
      return;
    }
    const quote =
      replyTo && !replyTo.deleted
        ? { id: replyTo.id, senderName: replyTo.senderName, content: replyTo.kind === 'gif' ? 'GIF' : replyTo.content }
        : undefined;

    if (payload?.kind === 'gif' && payload.gifUri) {
      sendMessageAction(roomId, user.id, me, 'GIF', { kind: 'gif', gifUri: payload.gifUri, replyTo: quote });
      setTray('none');
      setReplyTo(null);
      return;
    }
    if (!content) return;
    if (checkContent(content).flagged) {
      setBlockedMsg(true);
      return;
    }
    sendMessageAction(roomId, user.id, me, content, { replyTo: quote });
    setText('');
    setTray('none');
    setReplyTo(null);
  };

  const pickMedia = async () => {
    setAttaching(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (res.canceled || !roomId || !user) return;
    const asset = res.assets[0];
    sendMediaMessageAction(roomId, user.id, me, asset.type === 'video' ? 'video' : 'image', asset.uri);
  };

  const captureMedia = async () => {
    setAttaching(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted || !roomId || !user) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets[0];
    sendMediaMessageAction(roomId, user.id, me, asset.type === 'video' ? 'video' : 'image', asset.uri);
  };

  const renderBody = (item: ChatMessage) => {
    if (item.kind === 'gif' && item.gifUri) {
      return <Image source={{ uri: item.gifUri }} style={styles.mediaPreview} />;
    }
    if (item.kind === 'image' && item.mediaUrl) {
      return (
        <Pressable onPress={() => setViewingImage(item.mediaUrl!)} accessibilityRole="button">
          <Image source={{ uri: item.mediaUrl }} style={styles.mediaPreview} />
        </Pressable>
      );
    }
    if (item.kind === 'video' && item.mediaUrl) {
      return (
        <View style={styles.mediaPreview}>
          <InlineVideoPlayer uri={item.mediaUrl} playing={playingVideoId === item.id} muted={false} height={180} />
        </View>
      );
    }
    return (
      <Text style={[styles.messageText, { color: colors.text }]}>
        {item.content}
      </Text>
    );
  };

  const closeAction = () => {
    setActive(null);
    setMoreEmoji(false);
  };

  const reportRoom = (reason: string) => {
    if (!user || !room) return;
    const targetType = room.kind === 'dm' && room.peerId ? 'user' : 'room';
    const targetId = room.kind === 'dm' && room.peerId ? room.peerId : room.id;
    submitReport(user.id, targetType, targetId, reason).catch(() => undefined);
    setReport(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* TOP HEADER BAR */}
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

        {/* Room / Peer Info Header */}
        <Pressable
          style={styles.headerCenter}
          disabled={!room}
          onPress={() => {
            if (!room) return;
            if (room.communityId) nav.navigate('CommunityDetail', { id: room.communityId });
            else if (room.kind === 'dm' && room.peerId) useProfilePreviewStore.getState().open(room.peerId);
            else setMenu(true);
          }}
          accessibilityRole="button"
        >
          <View style={styles.avatarWrapper}>
            <CyberCutBox cutSize={6} radius={4} fill="#161B2E" style={styles.headerAvatarCut}>
              <Image source={room?.avatar ? { uri: room.avatar } : brandLogo} style={styles.headerAvatarImg} />
            </CyberCutBox>
            {room?.kind === 'dm' && isPeerOnline && <View style={styles.onlineBadgeDot} />}
          </View>

          <View style={styles.headerTextCol}>
            <Text style={[styles.roomNameText, { color: colors.text }]} numberOfLines={1}>
              {room?.name || 'Unity Guild'}
            </Text>
            <Text style={[styles.roomStatusText, { color: colors.muted }]} numberOfLines={1}>
              {room?.kind === 'dm'
                ? isPeerOnline
                  ? '🟢 ONLINE'
                  : 'DIRECT MESSAGE'
                : `${room?.communityId ? 'COMMUNITY' : 'ROOM'} · ${
                    room?.memberCount ? `${room.memberCount.toLocaleString()} MEMBERS` : 'TAP FOR INFO'
                  }`}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable onPress={() => setMenu(true)} style={styles.headerBtn} accessibilityRole="button">
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.headerCutBox}
            >
              <Ionicons name="ellipsis-horizontal" size={17} color={colors.text} />
            </CyberCutBox>
          </Pressable>
        </View>
      </View>

      {/* PINNED MESSAGES BAR */}
      {pinned[pinnedIndex] ? (
        <View style={styles.pinnedBarWrap}>
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.pinnedCutBox}
          >
            <Pressable
              onPress={() => scrollToMessage(pinned[pinnedIndex].id)}
              style={styles.pinnedInner}
              accessibilityRole="button"
            >
              <Ionicons name="pin" size={15} color="#D83CFF" />
              <View style={styles.pinnedTextCol}>
                {pinned.length > 1 ? (
                  <Text style={[styles.pinnedCountText, { color: colors.muted2 }]}>
                    PINNED MESSAGE {pinnedIndex + 1}/{pinned.length}
                  </Text>
                ) : (
                  <Text style={[styles.pinnedCountText, { color: colors.muted2 }]}>PINNED MESSAGE</Text>
                )}
                <Text style={[styles.pinnedText, { color: colors.text }]} numberOfLines={1}>
                  {pinned[pinnedIndex].kind === 'gif' ? 'GIF' : pinned[pinnedIndex].content}
                </Text>
              </View>
            </Pressable>

            {pinned.length > 1 ? (
              <Pressable
                onPress={() => setPinnedIndex((i) => (i + 1) % pinned.length)}
                hitSlop={8}
                style={styles.pinnedCycleBtn}
                accessibilityRole="button"
                accessibilityLabel="Show next pinned message"
              >
                <Ionicons name="chevron-down" size={16} color={colors.muted2} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => roomId && togglePinMessageAction(roomId, pinned[pinnedIndex].id)}
              hitSlop={8}
              style={styles.pinnedCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Unpin message"
            >
              <Ionicons name="close" size={16} color={colors.muted2} />
            </Pressable>
          </CyberCutBox>
        </View>
      ) : null}

      {/* MESSAGES LIST */}
      {thread.length === 0 ? (
        <View style={styles.emptyListWrap}>
          <EmptyState title="No messages yet. Say hello to start the conversation." />
        </View>
      ) : (
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        inverted
        data={thread}
        keyExtractor={(m) => m.id}
        onEndReached={() => roomId && user && loadOlderMessages(roomId, user.id)}
        onEndReachedThreshold={0.2}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
          }, 100);
        }}
        contentContainerStyle={[styles.messagesContainer, { paddingBottom: 16, flexGrow: 1 }]}
        ListHeaderComponent={
          typingRoomId === roomId ? (
            <View style={styles.typingBar}>
              <Text style={styles.typingDot}>🟢 🟢 🟢</Text>
              <Text style={styles.typingText}>ADA IS TYPING</Text>
            </View>
          ) : (
            <View />
          )
        }
        renderItem={({ item }) => {
          const isMine = item.mine;
          return (
            <Pressable
              onPress={() => !item.deleted && setActive(item)}
              onLongPress={() => !item.deleted && setActive(item)}
              style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}
            >
              {/* Other User Avatar */}
              {!isMine && (
                <CyberCutBox cutSize={6} radius={4} fill="#161B2E" style={styles.msgAvatarCut}>
                  <Image source={brandLogo} style={styles.msgAvatarImg} />
                </CyberCutBox>
              )}

              {/* Message Content Container */}
              <View style={[styles.msgContentCol, isMine && { alignItems: 'flex-end' }]}>
                {/* Sender Header Line */}
                <View style={styles.senderHeaderLine}>
                  <Text style={[styles.senderNameText, { color: colors.text }]}>{item.senderName}</Text>

                  <View style={[styles.roleBadge, isMine ? styles.roleBadgeMine : styles.roleBadgeMod]}>
                    <Text style={[styles.roleBadgeText, isMine && { color: colors.electricAccent }]}>
                      {isMine ? 'YOU' : 'MODERATOR'}
                    </Text>
                  </View>

                  {item.pinned ? <Ionicons name="pin" size={11} color="#D83CFF" /> : null}
                  {item.starred ? <Ionicons name="star" size={11} color="#F5C542" /> : null}

                  <Text style={[styles.msgTimeText, { color: colors.muted2 }]}>{formatTime(item.createdAt)}</Text>
                </View>

                {/* Reply Quote Banner */}
                {item.replyTo && (
                  <View style={styles.replyQuoteWrap}>
                    <Text style={styles.replyQuoteSender}>{item.replyTo.senderName}</Text>
                    <Text style={styles.replyQuoteContent} numberOfLines={1}>
                      {item.replyTo.content}
                    </Text>
                  </View>
                )}

                {/* Chamfer Message Bubble */}
                <CyberCutBox
                  cutSize={10}
                  radius={6}
                  fill={
                    item.id === highlightId
                      ? 'rgba(245, 197, 66, 0.28)'
                      : isMine
                      ? isDark
                        ? 'rgba(15, 60, 75, 0.9)'
                        : 'rgba(14, 165, 233, 0.15)'
                      : colors.cardFill
                  }
                  borderColor={
                    item.id === highlightId
                      ? '#F5C542'
                      : isMine
                      ? isDark
                        ? 'rgba(0, 229, 255, 0.4)'
                        : 'rgba(14, 165, 233, 0.4)'
                      : colors.cardBorder
                  }
                  borderWidth={item.id === highlightId ? 1.4 : 0.88}
                  style={styles.bubbleCutBox}
                >
                  <View style={styles.bubbleInner}>
                    {renderBody(item)}
                  </View>
                </CyberCutBox>

                {/* Reactions Row */}
                {item.reactions && item.reactions.length > 0 && (
                  <View style={styles.reactionsRow}>
                    {item.reactions.map((r) => (
                      <Pressable
                        key={r.emoji}
                        onPress={() => user && roomId && reactToMessageAction(roomId, item.id, r.emoji, user.id)}
                        style={[styles.reactionChip, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}
                      >
                        <Text style={[styles.reactionText, { color: colors.text }]}>
                          {r.emoji} {r.count}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* My User Avatar */}
              {isMine && (
                <CyberCutBox cutSize={6} radius={4} fill="#161B2E" style={styles.msgAvatarCut}>
                  <Image source={brandLogo} style={styles.msgAvatarImg} />
                </CyberCutBox>
              )}
            </Pressable>
          );
        }}
      />
      )}

      {/* Trays */}
      {tray === 'emoji' ? <EmojiPickerTray onPick={(e) => setText((t) => t + e)} /> : null}
      {tray === 'gif' ? <GifPickerTray onPick={(uri) => send({ kind: 'gif', gifUri: uri })} /> : null}

      {/* BOTTOM INPUT DOCK */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {replyTo ? (
          <View style={[styles.replyPreviewBar, { backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
            <View style={styles.replyPreviewAccent} />
            <View style={styles.replyPreviewTextCol}>
              <Text style={styles.replyPreviewSender} numberOfLines={1}>
                Replying to {replyTo.mine ? 'yourself' : replyTo.senderName}
              </Text>
              <Text style={[styles.replyPreviewContent, { color: colors.muted }]} numberOfLines={1}>
                {replyTo.kind === 'gif' ? 'GIF' : replyTo.content}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel reply">
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.bottomDock, { backgroundColor: colors.surface, borderTopColor: colors.cardBorder, paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Attachment Button */}
          <Pressable onPress={() => setAttaching(true)} style={styles.dockAttachBtn} accessibilityRole="button">
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.dockAttachCut}
            >
              <Ionicons name="add" size={20} color={colors.electricAccent} />
            </CyberCutBox>
          </Pressable>

          {/* Text Input Box */}
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.inputFill}
            borderColor={colors.inputBorder}
            borderWidth={0.88}
            style={styles.inputCutBox}
          >
            <View style={styles.inputInnerRow}>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  notifyTyping();
                }}
                placeholder={`Message ${room?.name ?? 'this chat'}`}
                placeholderTextColor={colors.muted2}
                style={[styles.dockTextInput, { color: colors.text }]}
                maxLength={2000}
              />

              <Pressable onPress={() => setTray((t) => (t === 'emoji' ? 'none' : 'emoji'))} hitSlop={8}>
                <Ionicons name="happy-outline" size={20} color={tray === 'emoji' ? '#D83CFF' : colors.muted2} />
              </Pressable>
            </View>
          </CyberCutBox>

          {/* Send Button */}
          <Pressable onPress={() => send()} style={styles.sendBtnWrap} accessibilityRole="button">
            <CyberCutBox gradient cutSize={8} radius={4} style={styles.sendCutBox}>
              <View style={styles.sendInner}>
                <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
              </View>
            </CyberCutBox>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AttachmentSheet
        visible={attaching}
        onClose={() => setAttaching(false)}
        onPickMedia={pickMedia}
        onCapture={captureMedia}
        onOpenGif={() => {
          setAttaching(false);
          setTray('gif');
        }}
      />

      <ConfirmSheet
        visible={blockedMsg}
        danger={false}
        title="Message not sent"
        body="Your message contains language that isn't allowed here. Please edit it before sending."
        confirmLabel="Edit message"
        onConfirm={() => setBlockedMsg(false)}
        onClose={() => setBlockedMsg(false)}
      />

      {/* Message Actions Sheet */}
      <MessageActionSheet
        message={active}
        moreEmoji={moreEmoji}
        onClose={closeAction}
        onOpenEmoji={() => setMoreEmoji(true)}
        onReact={(emoji) => {
          if (active && user && roomId) reactToMessageAction(roomId, active.id, emoji, user.id);
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
          if (active && user) toggleStarMessageAction(active.id, user.id);
          closeAction();
        }}
        onPin={() => {
          if (active && roomId) togglePinMessageAction(roomId, active.id);
          closeAction();
        }}
        onDelete={() => {
          setDeleteTarget(active);
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

      {/* Room Options Menu — the "..." header button/tapping the room name previously opened
          this (setMenu(true)) but nothing ever rendered for it, so there was no way to invite
          people, view members, mute, rename, leave, report, or delete a room from inside the
          chat itself. All the actions below were already wired up in the store; only this
          sheet was missing. */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(false)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)' }]} />
            </View>

            {room?.kind !== 'dm' ? (
              <Pressable
                style={styles.menuRow}
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  if (room) nav.navigate('RoomMembers', { roomId: room.id });
                }}
              >
                <Ionicons name="person-add-outline" size={19} color={colors.text} />
                <Text style={[styles.menuRowText, { color: colors.text }]}>Invite / manage members</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.menuRow}
              accessibilityRole="button"
              onPress={() => {
                setMenu(false);
                if (user && roomId) toggleMuteAction(user.id, roomId);
              }}
            >
              <Ionicons name={room?.muted ? 'notifications-outline' : 'notifications-off-outline'} size={19} color={colors.text} />
              <Text style={[styles.menuRowText, { color: colors.text }]}>{room?.muted ? 'Unmute notifications' : 'Mute notifications'}</Text>
            </Pressable>

            <Pressable
              style={styles.menuRow}
              accessibilityRole="button"
              onPress={() => {
                setMenu(false);
                if (user && roomId) togglePinAction(user.id, roomId);
              }}
            >
              <Ionicons name="bookmark-outline" size={19} color={colors.text} />
              <Text style={[styles.menuRowText, { color: colors.text }]}>{room?.pinned ? 'Unpin conversation' : 'Pin conversation'}</Text>
            </Pressable>

            {room?.kind !== 'dm' && (room?.myRole === 'owner' || room?.myRole === 'admin') ? (
              <Pressable
                style={styles.menuRow}
                accessibilityRole="button"
                onPress={() => {
                  setRenameValue(room?.name ?? '');
                  setRenaming(true);
                  setMenu(false);
                }}
              >
                <Ionicons name="create-outline" size={19} color={colors.text} />
                <Text style={[styles.menuRowText, { color: colors.text }]}>Rename room</Text>
              </Pressable>
            ) : null}

            {room?.kind !== 'dm' && room?.kind !== 'global' ? (
              <Pressable
                style={styles.menuRow}
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  setLeave(true);
                }}
              >
                <Ionicons name="exit-outline" size={19} color={colors.danger} />
                <Text style={[styles.menuRowText, { color: colors.danger }]}>Leave room</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.menuRow}
              accessibilityRole="button"
              onPress={() => {
                setMenu(false);
                setReport(true);
              }}
            >
              <Ionicons name="flag-outline" size={19} color={colors.danger} />
              <Text style={[styles.menuRowText, { color: colors.danger }]}>{room?.kind === 'dm' ? 'Report user' : 'Report room'}</Text>
            </Pressable>

            {room?.kind !== 'dm' && room?.kind !== 'global' && room?.myRole === 'owner' ? (
              <Pressable
                style={styles.menuRow}
                accessibilityRole="button"
                onPress={() => {
                  setMenu(false);
                  setDeleteRoomConfirm(true);
                }}
              >
                <Ionicons name="trash-outline" size={19} color={colors.danger} />
                <Text style={[styles.menuRowText, { color: colors.danger }]}>Delete room</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename room */}
      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setRenaming(false)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)' }]} />
            </View>
            <Text style={[styles.renameTitle, { color: colors.text }]}>Rename room</Text>
            <AuthTextField label="Room name" value={renameValue} onChangeText={setRenameValue} autoCapitalize="words" />
            <PrimaryButton
              label={renameSaving ? 'Saving…' : 'Save'}
              onPress={async () => {
                const name = renameValue.trim();
                if (!name || !roomId) return;
                setRenameSaving(true);
                try {
                  await updateRoomAction(roomId, { name });
                  setRenaming(false);
                } finally {
                  setRenameSaving(false);
                }
              }}
              disabled={renameSaving || !renameValue.trim()}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmSheet
        visible={leave}
        title="Leave room?"
        body="You'll stop receiving messages from this room. You can rejoin later if it's public, or need a new invite if it's private."
        confirmLabel="Leave"
        onClose={() => setLeave(false)}
        onConfirm={async () => {
          if (user && roomId) await leaveRoomAction(user.id, roomId);
          setLeave(false);
          nav.goBack();
        }}
      />

      <ConfirmSheet
        visible={deleteRoomConfirm}
        title="Delete room?"
        body="This permanently deletes the room and its message history for everyone. This can't be undone."
        confirmLabel={deletingRoom ? 'Deleting…' : 'Delete'}
        onClose={() => setDeleteRoomConfirm(false)}
        onConfirm={async () => {
          if (!roomId || deletingRoom) return;
          setDeletingRoom(true);
          try {
            await deleteRoomAction(roomId);
            setDeleteRoomConfirm(false);
            nav.goBack();
          } finally {
            setDeletingRoom(false);
          }
        }}
      />

      <ConfirmSheet
        visible={report}
        danger
        title={room?.kind === 'dm' ? 'Report this user?' : 'Report this room?'}
        body="Let us know what's wrong. Our team will review this report."
        confirmLabel="Report: Spam"
        extraActions={[
          { label: 'Harassment', onPress: () => reportRoom('Harassment') },
          { label: 'Other', onPress: () => reportRoom('Other') },
        ]}
        onConfirm={() => reportRoom('Spam')}
        onClose={() => setReport(false)}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        title="Delete message?"
        body={
          deleteTarget?.mine
            ? "Delete for me removes it only from your view. Delete for everyone removes it from the conversation for all members."
            : "This removes it only from your view — it stays visible to everyone else."
        }
        confirmLabel="Delete for me"
        extraActions={
          deleteTarget?.mine
            ? [
                {
                  label: 'Delete for everyone',
                  onPress: () => {
                    if (roomId && deleteTarget) deleteMessageAction(roomId, deleteTarget.id);
                    setDeleteTarget(null);
                  },
                },
              ]
            : undefined
        }
        onConfirm={() => {
          if (roomId && user && deleteTarget) deleteMessageForMeAction(roomId, deleteTarget.id, user.id);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingHorizontal: 10,
  },
  avatarWrapper: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  headerAvatarCut: {
    width: 36,
    height: 36,
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#3DDC84',
    borderWidth: 1.5,
    borderColor: '#090F1C',
    zIndex: 5,
  },
  headerTextCol: {
    gap: 1,
  },
  roomNameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roomStatusText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#3DDC84',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyPreviewAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#00E5FF',
  },
  replyPreviewTextCol: {
    flex: 1,
    gap: 1,
  },
  replyPreviewSender: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: '#00E5FF',
  },
  replyPreviewContent: {
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
  pinnedBarWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pinnedCutBox: {
    width: '100%',
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
    gap: 10,
  },
  pinnedTextCol: {
    flex: 1,
    gap: 1,
  },
  pinnedCountText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.6,
  },
  pinnedText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#CBD5E1',
  },
  pinnedCycleBtn: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedCloseBtn: {
    paddingHorizontal: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    gap: 14,
  },
  emptyListWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  typingDot: {
    fontSize: 10,
  },
  typingText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: '#00E5FF',
  },
  msgRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  msgRowOther: {
    alignSelf: 'flex-start',
  },
  msgRowMine: {
    alignSelf: 'flex-end',
  },
  msgAvatarCut: {
    width: 34,
    height: 34,
    overflow: 'hidden',
  },
  msgAvatarImg: {
    width: '100%',
    height: '100%',
  },
  msgContentCol: {
    maxWidth: '75%',
    gap: 4,
  },
  senderHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderNameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleBadgeMod: {
    backgroundColor: 'rgba(216, 60, 255, 0.18)',
    borderColor: 'rgba(216, 60, 255, 0.45)',
  },
  roleBadgeMine: {
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    borderColor: 'rgba(0, 229, 255, 0.45)',
  },
  roleBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: '#D83CFF',
  },
  msgTimeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
  },
  replyQuoteWrap: {
    borderLeftWidth: 2,
    borderLeftColor: '#00E5FF',
    paddingLeft: 8,
    marginBottom: 4,
  },
  replyQuoteSender: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: '#00E5FF',
  },
  replyQuoteContent: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#A6B4CE',
  },
  bubbleCutBox: {
    width: '100%',
  },
  bubbleInner: {
    padding: 12,
  },
  messageText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5E1',
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  mediaPreview: {
    width: 200,
    height: 140,
    borderRadius: 6,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  reactionChip: {
    backgroundColor: 'rgba(14, 20, 35, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#FFFFFF',
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(9, 15, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  dockAttachBtn: {
    width: 42,
    height: 42,
  },
  dockAttachCut: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputCutBox: {
    flex: 1,
    height: 42,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
  },
  dockTextInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  sendBtnWrap: {
    width: 42,
    height: 42,
  },
  sendCutBox: {
    width: 42,
    height: 42,
  },
  sendInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 52,
  },
  menuRowText: {
    fontFamily: fonts.bodyMed,
    fontSize: 15,
  },
  renameTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
});
