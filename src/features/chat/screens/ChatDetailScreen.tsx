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
import { ImageViewerModal } from '../../../components/media/ImageViewerModal';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { roomAvatarSource } from '../../../data/roomAvatar';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { AudioQuality, IOSOutputFormat, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions } from 'expo-audio';

import type { MainStackParamList } from '../../../navigation/types';
import { AttachmentSheet } from '../../../components/chat/AttachmentSheet';
import { ChatMemberSlider } from '../../../components/chat/ChatMemberSlider';
import { EmojiPickerTray } from '../../../components/chat/EmojiPickerTray';
import { GifPickerTray } from '../../../components/chat/GifPickerTray';
import { MessageActionSheet } from '../../../components/chat/MessageActionSheet';
import { VoiceMessageBubble } from '../../../components/chat/VoiceMessageBubble';
import { MessageInfoSheet } from '../../../components/chat/MessageInfoSheet';
import { ForwardSendTo } from '../../../components/chat/ForwardSendTo';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { InlineVideoPlayer } from '../../../components/media/InlineVideoPlayer';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useAuth } from '../../../hooks/useAuth';
import { useChatStore } from '../../../store/chatStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { useUiStore } from '../../../store/uiStore';
import { usePresenceStore } from '../../../store/presenceStore';
import { STALE_MS } from '../../../store/swr';
import { subscribeToRoomMessages, subscribeToRoomReactions, joinTypingChannel } from '../../../services/supabase/realtime';
import { submitReport } from '../../../services/supabase/reports';
import { fonts, useTheme } from '../../../theme';
import { checkContent } from '../../../utils/contentFilter';
import { copyText } from '../../../utils/copyText';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import { formatDayLabel, formatTime, isSameDay } from '../../../utils/format';
import { streakGlyph } from '../../../data/streaks';
import type { ChatMessage } from '../../../types/chat';

const MEDIA_MAX_W = 240;
const MEDIA_MAX_H = 320;

/** Sizes the bubble image to the picture's own aspect ratio (fit within a max box) so nothing is
 * cropped — a fixed 200x140 frame with resizeMode "cover" was chopping portrait photos. */
function ChatMediaImage({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const [ratio, setRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    Image.getSize(
      uri,
      (w, h) => { if (alive && w > 0 && h > 0) setRatio(w / h); },
      () => { if (alive) setRatio(null); },
    );
    return () => { alive = false; };
  }, [uri, attempt]);
  const r = ratio ?? 4 / 3;
  let width = MEDIA_MAX_W;
  let height = width / r;
  if (height > MEDIA_MAX_H) {
    height = MEDIA_MAX_H;
    width = height * r;
  }
  // A GIF/image that fails to load (dead link, rate limit) used to just render nothing —
  // indistinguishable from one still loading. Show a visible retry state instead.
  if (failed) {
    return (
      <Pressable
        onPress={() => setAttempt((a) => a + 1)}
        style={{ width, height, borderRadius: 6, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', gap: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Retry loading image"
      >
        <Ionicons name="refresh" size={18} color={colors.muted} />
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 10.5 }}>Couldn't load — tap to retry</Text>
      </Pressable>
    );
  }
  return <Image key={attempt} source={{ uri }} style={{ width, height, borderRadius: 6 }} resizeMode="cover" onError={() => setFailed(true)} />;
}

const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

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
  const handleRealtimeReaction = useChatStore((s) => s.handleRealtimeReaction);
  const fetchPeerLastRead = useChatStore((s) => s.fetchPeerLastRead);
  const peerLastRead = useChatStore((s) => (roomId ? s.peerLastRead[roomId] : undefined));

  const room = rooms.find((r) => r.id === roomId);
  const isPeerOnline = usePresenceStore((s) => (room?.kind === 'dm' && room.peerId ? s.onlineUserIds.has(room.peerId) : false));
  // Every picture in the conversation, oldest first, so the full-screen viewer can swipe between them.
  const galleryUrls = useMemo(
    () =>
      [...thread]
        .reverse()
        .filter((m) => !m.deleted)
        .map((m) => (m.kind === 'gif' ? m.gifUri : m.kind === 'image' || m.kind === 'sticker' ? m.mediaUrl : undefined))
        .filter((u): u is string => !!u),
    [thread],
  );
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

  const me = user?.displayName ?? 'You';

  // Voice notes are mono: iPhone mics, Bluetooth headsets and the simulator are mono, and the
  // stock HIGH_QUALITY preset asks for stereo, which makes AVAudioRecorder.prepareToRecord() fail
  // ("Failed to prepare recorder") on those inputs.
  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const startRecording = async () => {
    if (recording) return;
    setNotice('');
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setNotice('Microphone access is off. Enable it in Settings to send voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      try {
        // Pass the options explicitly: with none, expo-audio reuses the native recorder it built when
        // this screen mounted — before the audio session was switched to recording mode. Passing them
        // makes it create a fresh recorder now that the session is ready.
        await recorder.prepareToRecordAsync(VOICE_RECORDING_OPTIONS);
      } catch (first) {
        console.warn('[voice] prepareToRecordAsync failed, retrying with fallback settings', first);
        // The input rejected our settings — retry once with the lowest-common-denominator preset.
        await recorder.prepareToRecordAsync({ ...RecordingPresets.LOW_QUALITY, numberOfChannels: 1, sampleRate: 22050 });
      }
      recorder.record();
      setRecording(true);
    } catch (err) {
      console.warn('[voice] could not start recording', err);
      setRecording(false);
      // In development show the real native reason so it can be diagnosed; users get the friendly text.
      const reason = __DEV__ && err instanceof Error ? `\n(${err.message.split('\n').slice(0, 3).join(' ')})` : '';
      setNotice(`Couldn't start recording. Check that your microphone isn't in use by another app and try again.${reason}`);
      // Release the audio session so playback and other recording attempts aren't left broken.
      try {
        await recorder.stop();
      } catch {
        // Nothing to stop if prepare never succeeded.
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  };

  const cancelRecording = async () => {
    setRecording(false);
    try {
      await recorder.stop();
    } catch {
      // Already stopped.
    }
    setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
  };

  const stopAndSendRecording = async () => {
    const durationSec = Math.max(1, Math.round(recorder.currentTime));
    setRecording(false);
    try {
      await recorder.stop();
    } catch {
      setNotice("Couldn't save the recording — try again.");
      return;
    } finally {
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
    const uri = recorder.uri;
    if (uri && roomId && user) sendMediaMessageAction(roomId, user.id, me, 'voice', uri, durationSec);
  };

  const formatRecordingTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  // Effects below key on the stable user id, not the `user` object: a new-but-equal object must
  // not refetch the thread or tear down the realtime channels.
  const userId = user?.id;

  useEffect(() => {
    if (rooms.length === 0 && userId) fetchRooms(userId, { ifStaleMs: STALE_MS });
  }, [rooms.length, userId, fetchRooms]);

  useEffect(() => {
    if (!roomId || !userId) return;
    markRead(userId, roomId);
    ensureStarredLoaded(userId);
    ensureHiddenLoaded(userId).then(() => fetchMessages(roomId, userId));
  }, [roomId, userId, fetchMessages, markRead, ensureStarredLoaded, ensureHiddenLoaded]);

  useEffect(() => {
    if (!roomId || room?.kind !== 'dm' || !room.peerId) return;
    fetchPeerLastRead(roomId, room.peerId);
  }, [roomId, room?.kind, room?.peerId, fetchPeerLastRead]);

  const typingChannelRef = useRef<ReturnType<typeof joinTypingChannel> | null>(null);

  // Read through a ref so the subscription effect below doesn't re-run (tearing down and
  // re-creating the channels) every time the room record loads or changes.
  const roomInfoRef = useRef<{ kind?: string; peerId?: string }>({});
  roomInfoRef.current = { kind: room?.kind, peerId: room?.peerId };

  useEffect(() => {
    if (!roomId || !userId) return;
    const unsubMessages = subscribeToRoomMessages(
      roomId,
      (row) => {
        handleRealtimeInsert(roomId, userId, row);
        const info = roomInfoRef.current;
        if (info.kind === 'dm' && info.peerId) fetchPeerLastRead(roomId, info.peerId);
      },
      (row) => handleRealtimeUpdate(roomId, row),
    );
    // One reaction event patches one message in place — no thread refetch.
    const unsubReactions = subscribeToRoomReactions(roomId, (change) => handleRealtimeReaction(roomId, userId, change));
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
  }, [roomId, userId, handleRealtimeInsert, handleRealtimeUpdate, handleRealtimeReaction, setTyping, fetchPeerLastRead]);

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
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
      if (res.canceled || !roomId || !user) return;
      const asset = res.assets[0];
      sendMediaMessageAction(roomId, user.id, me, asset.type === 'video' ? 'video' : 'image', asset.uri);
    } catch (e) {
      console.warn('[attach] photo picker failed', e);
      setNotice("Couldn't open your photo library. Check Photos access for Reapers in Settings and try again.");
    }
  };

  // No compression (quality: 1) — a lower quality forces re-encoding to JPEG on some
  // platforms, which would flatten a sticker's transparent background to solid white.
  const pickSticker = async () => {
    setAttaching(false);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !roomId || !user) return;
      sendMediaMessageAction(roomId, user.id, me, 'sticker', res.assets[0].uri);
    } catch (e) {
      console.warn('[attach] sticker picker failed', e);
      setNotice("Couldn't open your photo library. Check Photos access for Reapers in Settings and try again.");
    }
  };

  const captureMedia = async () => {
    setAttaching(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setNotice('Camera access is off. Enable it for Reapers in Settings to take photos and videos.');
        return;
      }
      if (!roomId || !user) return;
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
      if (res.canceled) return;
      const asset = res.assets[0];
      sendMediaMessageAction(roomId, user.id, me, asset.type === 'video' ? 'video' : 'image', asset.uri);
    } catch (e) {
      console.warn('[attach] camera failed', e);
      setNotice("The camera isn't available here. The iOS Simulator has no camera — try a real device.");
    }
  };

  const renderBody = (item: ChatMessage) => {
    if (item.kind === 'gif' && item.gifUri) {
      return (
        <Pressable onPress={() => setViewingImage(item.gifUri!)} accessibilityRole="button">
          <ChatMediaImage uri={item.gifUri} />
        </Pressable>
      );
    }
    if (item.kind === 'image' && item.mediaUrl) {
      return (
        <Pressable onPress={() => setViewingImage(item.mediaUrl!)} accessibilityRole="button">
          <ChatMediaImage uri={item.mediaUrl} />
        </Pressable>
      );
    }
    if (item.kind === 'sticker' && item.mediaUrl) {
      // Rendered without the surrounding bubble chrome (no cut-box/fill) so the sticker's own
      // transparent PNG shows through, the way a sticker is supposed to look.
      return (
        <Pressable onPress={() => setViewingImage(item.mediaUrl!)} accessibilityRole="button">
          <Image source={{ uri: item.mediaUrl }} style={styles.stickerImg} resizeMode="contain" />
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
    if (item.kind === 'voice' && item.mediaUrl) {
      return <VoiceMessageBubble uri={item.mediaUrl} fallbackDurationSec={item.voiceDurationSec} tint={item.mine ? colors.electricAccent : '#D83CFF'} />;
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
        <Pressable onPress={() => nav.goBack()} style={styles.headerBtn} accessibilityRole="button" hitSlop={6}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
            <CutAvatar source={roomAvatarSource(room)} size={40} cut={10} borderWidth={1} fill="#161B2E" />
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
          <Pressable onPress={() => setMenu(true)} style={styles.headerBtn} accessibilityRole="button" hitSlop={6}>
            <Ionicons name="information-circle-outline" size={26} color={colors.text} />
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
        keyboardShouldPersistTaps="handled"
        ref={flatListRef}
        style={{ flex: 1 }}
        inverted
        data={thread}
        keyExtractor={(m) => m.id}
        initialNumToRender={14}
        maxToRenderPerBatch={10}
        windowSize={9}
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
              <Text style={styles.typingText}>{room?.kind === 'dm' && room.name ? `${room.name.toUpperCase()} IS TYPING` : 'SOMEONE IS TYPING'}</Text>
            </View>
          ) : (
            <View />
          )
        }
        renderItem={({ item, index }) => {
          const isMine = item.mine;
          const olderNeighbor = thread[index + 1];
          const isFirstOfDay = !olderNeighbor || !isSameDay(item.createdAt, olderNeighbor.createdAt);
          return (
            <View>
              {isFirstOfDay ? (
                <View style={styles.dateSeparatorRow}>
                  <View style={[styles.dateSeparatorPill, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.dateSeparatorText, { color: colors.muted }]}>{formatDayLabel(item.createdAt)}</Text>
                  </View>
                </View>
              ) : null}
            <Pressable
              onPress={() => !item.deleted && setActive(item)}
              onLongPress={() => !item.deleted && setActive(item)}
              style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}
            >
              {/* Other User Avatar — opens their profile, same as tapping their name does
                  (both need to stop the tap reaching the row's own onPress, which opens the
                  message action sheet instead). */}
              {!isMine && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    useProfilePreviewStore.getState().open(item.senderId);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.senderName}'s profile`}
                >
                  <CutAvatar source={resolveAvatarSource(item.senderAvatar, item.senderAvatarId)} size={36} cut={9} borderWidth={1} fill="#161B2E" />
                </Pressable>
              )}

              {/* Message Content Container */}
              <View style={[styles.msgContentCol, isMine && { alignItems: 'flex-end' }]}>
                {/* Sender Header Line */}
                <View style={styles.senderHeaderLine}>
                  {isMine ? (
                    <Text style={[styles.senderNameText, { color: colors.text }]}>{item.senderName}</Text>
                  ) : (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        useProfilePreviewStore.getState().open(item.senderId);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${item.senderName}'s profile`}
                    >
                      <Text style={[styles.senderNameText, { color: colors.text }]}>{item.senderName}</Text>
                    </Pressable>
                  )}

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

                {/* Chamfer Message Bubble — a sticker renders with no chrome around it, same as
                    WhatsApp/Telegram treat stickers vs. regular chat bubbles */}
                {item.kind === 'sticker' && !item.deleted ? (
                  renderBody(item)
                ) : (
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
                )}

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
                <CutAvatar source={resolveAvatarSource(user?.avatarUri, user?.avatarId)} size={36} cut={9} borderWidth={1} fill="#161B2E" />
              )}
            </Pressable>
            </View>
          );
        }}
      />
      )}

      {/* Trays */}
      {tray === 'emoji' ? <EmojiPickerTray onPick={(e) => setText((t) => t + e)} onClose={() => setTray('none')} /> : null}
      {tray === 'gif' ? <GifPickerTray onPick={(uri) => send({ kind: 'gif', gifUri: uri })} onClose={() => setTray('none')} /> : null}

      {/* BOTTOM INPUT DOCK */}
      <KeyboardAvoidingView behavior="padding">
        {notice ? <Text style={[styles.noticeText, { color: colors.danger }]}>{notice}</Text> : null}
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
          {recording ? (
            // Recording state — replaces the whole row, Instagram-style: cancel on the left,
            // a live timer in the middle, send on the right.
            <>
              <Pressable onPress={cancelRecording} style={styles.dockIconBtn} accessibilityRole="button" accessibilityLabel="Cancel recording">
                <Ionicons name="trash-outline" size={22} color={colors.muted} />
              </Pressable>
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={[styles.recordingTimeText, { color: colors.text }]}>{formatRecordingTime(recorderState.durationMillis ?? 0)}</Text>
              </View>
              <Pressable onPress={stopAndSendRecording} style={styles.sendBtnWrap} accessibilityRole="button" accessibilityLabel="Send voice message">
                <View style={[styles.sendCircle, { backgroundColor: colors.electricAccent }]}>
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </View>
              </Pressable>
            </>
          ) : (
            <>
              {/* Pill Text Input — Instagram's message field: fully rounded, no chamfer */}
              <View style={[styles.inputPill, { backgroundColor: colors.inputFill, borderColor: colors.inputBorder }]}>
                <TextInput
                  value={text}
                  onChangeText={(v) => {
                    setText(v);
                    notifyTyping();
                  }}
                  placeholder="Message..."
                  placeholderTextColor={colors.muted2}
                  style={[styles.dockTextInput, { color: colors.text }]}
                  maxLength={2000}
                  multiline
                />
              </View>

              {text.trim() ? (
                <Pressable onPress={() => send()} style={styles.sendBtnWrap} accessibilityRole="button" accessibilityLabel="Send message">
                  <View style={[styles.sendCircle, { backgroundColor: colors.electricAccent }]}>
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  </View>
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={startRecording} style={styles.dockIconBtn} accessibilityRole="button" accessibilityLabel="Record a voice message">
                    <Ionicons name="mic-outline" size={24} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => setAttaching(true)} style={styles.dockIconBtn} accessibilityRole="button" accessibilityLabel="Attach photo, video, sticker or GIF">
                    <Ionicons name="image-outline" size={23} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={() => setTray((t) => (t === 'emoji' ? 'none' : 'emoji'))} style={styles.dockIconBtn} accessibilityRole="button" accessibilityLabel="Emoji">
                    <Ionicons name="happy-outline" size={23} color={tray === 'emoji' ? '#D83CFF' : colors.text} />
                  </Pressable>
                </>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <AttachmentSheet
        visible={attaching}
        onClose={() => setAttaching(false)}
        onPickMedia={pickMedia}
        onCapture={captureMedia}
        onPickSticker={pickSticker}
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
      <ImageViewerModal
        urls={galleryUrls}
        startIndex={viewingImage ? Math.max(0, galleryUrls.indexOf(viewingImage)) : null}
        onClose={() => setViewingImage(null)}
      />

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
                if (roomId) nav.navigate('RoomStarred', { roomId, tab: 'starred' });
              }}
            >
              <Ionicons name="star-outline" size={19} color={colors.text} />
              <Text style={[styles.menuRowText, { color: colors.text }]}>Starred messages</Text>
            </Pressable>

            <Pressable
              style={styles.menuRow}
              accessibilityRole="button"
              onPress={() => {
                setMenu(false);
                if (roomId) nav.navigate('RoomStarred', { roomId, tab: 'pinned' });
              }}
            >
              <Ionicons name="pin-outline" size={19} color={colors.text} />
              <Text style={[styles.menuRowText, { color: colors.text }]}>Pinned messages</Text>
            </Pressable>

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
                <Text style={[styles.menuRowText, { color: colors.danger }]}>{room?.communityId ? 'Leave community chat' : 'Leave room'}</Text>
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
        title={room?.communityId ? "Leave community chat?" : 'Leave room?'}
        body={
          room?.communityId
            ? "You'll stop receiving messages here, but you'll stay a member of the community — you can rejoin its chat anytime from the community page."
            : "You'll stop receiving messages from this room. You can rejoin later if it's public, or need a new invite if it's private."
        }
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
    alignItems: 'center',
    justifyContent: 'center',
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
  dateSeparatorRow: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  dateSeparatorPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dateSeparatorText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    letterSpacing: 0.3,
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
  stickerImg: {
    width: 120,
    height: 120,
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
  dockIconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputPill: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  dockTextInput: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  sendBtnWrap: {
    width: 34,
    height: 34,
  },
  sendCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeText: { fontFamily: fonts.bodyMed, fontSize: 12, paddingHorizontal: 16, paddingVertical: 6 },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FF4D6D',
  },
  recordingTimeText: {
    fontFamily: fonts.mono,
    fontSize: 14,
    letterSpacing: 0.4,
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
