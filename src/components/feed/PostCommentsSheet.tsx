import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, ImageSourcePropType, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InlineErrorText } from '../feedback/InlineErrorText';
import { ConfirmSheet } from '../feedback/ConfirmSheet';
import { LoadMoreButton } from '../feedback/LoadMoreButton';
import { resolveAvatarSource } from '../../data/cyberAvatars';
import { useAuth } from '../../hooks/useAuth';
import { usePostsStore } from '../../store/postsStore';
import { EMPTY_ARRAY } from '../../utils/emptyArray';
import { subscribeToPostComments, subscribeToPostReactions } from '../../services/supabase/realtime';
import { submitReport } from '../../services/supabase/reports';
import { fonts, useTheme } from '../../theme';
import type { PostComment } from '../../types/post';
import { CutAvatar } from '../avatars/CutAvatar';
import { EmojiPickerTray } from '../chat/EmojiPickerTray';
import { GifPickerTray } from '../chat/GifPickerTray';
import { encodeGifComment, parseGifComment } from '../../utils/commentGif';
import { useSingleFlight } from '../../hooks/useSingleFlight';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.82);

/** A GIF that fails to load (dead link, rate limit) shows a tap-to-retry box instead of nothing. */
function CommentGif({ uri, borderColor, iconColor }: { uri: string; borderColor: string; iconColor: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) {
    return (
      <Pressable
        onPress={() => { setFailed(false); setAttempt((a) => a + 1); }}
        style={[styles.commentGif, styles.commentGifFailed, { borderColor }]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading GIF"
      >
        <Ionicons name="refresh" size={18} color={iconColor} />
      </Pressable>
    );
  }
  return <Image key={attempt} source={{ uri }} style={styles.commentGif} resizeMode="cover" onError={() => setFailed(true)} />;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Comments live in a bottom drawer over the feed, not a pushed screen — matches
 * PostReactionSheet's Modal-over-backdrop convention, just anchored to the bottom edge and
 * tall enough for a real comment thread + composer. Styled with the same cyber dark palette
 * as CyberFeedPostCard/ChatDetailScreen (not the light/dark `useTheme` system) since it opens
 * directly over that feed and needs to read as part of the same surface. */
export function PostCommentsSheet({
  postId,
  onClose,
  userAvatarSource,
}: {
  postId: string | null;
  onClose: () => void;
  userAvatarSource: ImageSourcePropType;
}) {
  const { colors, light } = useTheme();
  const isLight = light;
  const { user } = useAuth();
  const userId = user?.id;
  const insets = useSafeAreaInsets();

  const sheetBg = isLight ? colors.surface : '#0E1423';
  const sheetBorder = isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)';
  const grabberBg = isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.2)';
  const dividerBorder = isLight ? colors.border : 'rgba(255, 255, 255, 0.08)';
  const iconColor = isLight ? colors.muted : '#8E9BB5';
  const postAuthorColor = isLight ? colors.text : '#FFFFFF';
  const postContentColor = isLight ? colors.muted : '#A6B4CE';
  const commentUserColor = isLight ? colors.text : '#FFFFFF';
  const commentTextColor = isLight ? colors.muted : '#A6B4CE';
  const commentTimeColor = isLight ? colors.muted : '#8E9BB5';
  const inputBg = isLight ? colors.surfaceElevated : 'rgba(14, 20, 35, 0.85)';
  const inputBorder = isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)';
  const inputTextColor = isLight ? colors.text : '#FFFFFF';
  const placeholderColor = isLight ? colors.muted2 : '#4E5B70';
  const emptyTextColor = isLight ? colors.muted : '#8E9BB5';
  const editInputBg = isLight ? colors.surfaceElevated : 'rgba(30, 36, 54, 0.6)';
  const editInputBorder = isLight ? 'rgba(0, 180, 216, 0.40)' : 'rgba(0, 229, 255, 0.35)';
  const editCancelColor = isLight ? colors.muted : '#8E9BB5';
  const editSaveColor = isLight ? colors.primary : '#00E5FF';

  const post = usePostsStore((s) => (postId ? s.posts.find((p) => p.id === postId) : undefined));
  const comments = usePostsStore((s) => (postId ? s.comments[postId] ?? EMPTY_ARRAY : EMPTY_ARRAY));
  const hasMore = usePostsStore((s) => (postId ? s.commentsHasMore[postId] ?? false : false));
  const loading = usePostsStore((s) => (postId ? s.commentsLoading[postId] ?? false : false));
  const fetchComments = usePostsStore((s) => s.fetchComments);
  const loadMoreComments = usePostsStore((s) => s.loadMoreComments);
  const addComment = usePostsStore((s) => s.addComment);
  const editComment = usePostsStore((s) => s.editComment);
  const deleteComment = usePostsStore((s) => s.deleteComment);
  const handleRealtimeComment = usePostsStore((s) => s.handleRealtimeComment);
  const fetchFeed = usePostsStore((s) => s.fetchFeed);

  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'post_comment'; id: string } | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [tray, setTray] = useState<'none' | 'emoji' | 'gif'>('none');

  useEffect(() => {
    if (postId) fetchComments(postId);
    setTray('none');
  }, [postId, fetchComments]);

  useEffect(() => {
    if (!postId) return;
    const unsubComments = subscribeToPostComments(postId, handleRealtimeComment);
    // A burst of reactions collapses into ONE trailing feed refetch (the last state always lands)
    // instead of a full-feed request per event.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubReactions = userId
      ? subscribeToPostReactions(postId, () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => fetchFeed(userId), 600);
        })
      : () => undefined;
    return () => {
      if (timer) clearTimeout(timer);
      unsubComments();
      unsubReactions();
    };
  }, [postId, handleRealtimeComment, fetchFeed, userId]);

  const submit = async () => {
    if (!user || !postId) return;
    const body = text.trim();
    if (!body) return;
    setText('');
    setErr('');
    try {
      await addComment(postId, user.id, body);
    } catch (e) {
      setText(body);
      setErr(e instanceof Error ? e.message : 'Could not post comment — try again.');
    }
  };

  const sendGif = async (uri: string) => {
    if (!user || !postId) return;
    setTray('none');
    setErr('');
    try {
      await addComment(postId, user.id, encodeGifComment(uri));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not post GIF — try again.');
    }
  };

  // One post at a time; `posting` drives the "Posting…" status line so it never looks like nothing happened.
  const { run: runSubmit, pending: postingText } = useSingleFlight(submit);
  const { run: runSendGif, pending: postingGif } = useSingleFlight(sendGif);
  const posting = postingText || postingGif;

  const toggleTray = (next: 'emoji' | 'gif') => {
    Keyboard.dismiss();
    setTray((t) => (t === next ? 'none' : next));
  };

  const submitReportReason = (reason: string) => {
    if (user && reportTarget) submitReport(user.id, reportTarget.type, reportTarget.id, reason).catch(() => undefined);
    setReportTarget(null);
  };

  const startEditingComment = (comment: PostComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const saveEditedComment = (commentId: string) => {
    const trimmed = editingText.trim();
    if (trimmed && postId && user) editComment(postId, commentId, user.id, trimmed);
    setEditingCommentId(null);
  };

  const renderComment = ({ item }: { item: PostComment }) => {
    const gifUri = parseGifComment(item.text);
    return (
    <View style={styles.commentRow}>
      <CutAvatar source={resolveAvatarSource(item.avatarUri, item.avatarId)} size={32} cut={8} borderWidth={1} />
      <View style={styles.commentBody}>
        <View style={styles.commentUserRow}>
          <Text style={[styles.commentUser, { color: commentUserColor }]}>{item.userName}</Text>
          <Text style={[styles.commentTime, { color: commentTimeColor }]}>{formatTime(item.createdAt)}</Text>
          {item.userId === user?.id ? (
            <View style={styles.commentOwnActions}>
              {gifUri ? null : (
                <Pressable onPress={() => startEditingComment(item)} hitSlop={8}>
                  <Ionicons name="create-outline" size={16} color={isLight ? colors.primary : '#00E5FF'} />
                </Pressable>
              )}
              <Pressable onPress={() => setDeleteCommentId(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color="#FF4D6D" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setReportTarget({ type: 'post_comment', id: item.id })} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={14} color={iconColor} />
            </Pressable>
          )}
        </View>

        {editingCommentId === item.id ? (
          <View style={styles.editCommentWrap}>
            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              style={[
                styles.editCommentInput,
                {
                  color: inputTextColor,
                  backgroundColor: editInputBg,
                  borderColor: editInputBorder,
                },
              ]}
              multiline
              maxLength={1000}
              autoFocus
            />
            <View style={styles.editCommentActionsRow}>
              <Pressable onPress={() => setEditingCommentId(null)} accessibilityRole="button">
                <Text style={[styles.editCommentCancelText, { color: editCancelColor }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => saveEditedComment(item.id)} accessibilityRole="button">
                <Text style={[styles.editCommentSaveText, { color: editSaveColor }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : gifUri ? (
          <CommentGif uri={gifUri} borderColor={inputBorder} iconColor={iconColor} />
        ) : (
          <Text style={[styles.commentText, { color: commentTextColor }]}>{item.text}</Text>
        )}
      </View>
    </View>
    );
  };

  return (
    <Modal visible={!!postId} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { height: SHEET_HEIGHT, backgroundColor: sheetBg, borderColor: sheetBorder }]} onPress={() => undefined}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: grabberBg }]} />
            </View>

            <View style={[styles.header, { borderBottomColor: dividerBorder }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Comments</Text>
              <View style={styles.headerActions}>
                {post ? (
                  <Pressable onPress={() => setReportTarget({ type: 'post', id: post.id })} accessibilityRole="button" hitSlop={8}>
                    <Ionicons name="flag-outline" size={18} color={iconColor} />
                  </Pressable>
                ) : null}
                <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8} style={{ marginLeft: 16 }}>
                  <Ionicons name="close" size={22} color={iconColor} />
                </Pressable>
              </View>
            </View>

            {post ? (
              <View style={[styles.postPreview, { borderBottomColor: dividerBorder }]}>
                <Text style={[styles.postAuthor, { color: postAuthorColor }]}>{post.authorName}</Text>
                {post.content ? <Text style={[styles.postContent, { color: postContentColor }]}>{post.content}</Text> : null}
              </View>
            ) : null}

            <FlatList
              keyboardShouldPersistTaps="handled"
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={renderComment}
              contentContainerStyle={styles.list}
              ListEmptyComponent={!loading ? <Text style={[styles.emptyText, { color: emptyTextColor }]}>No comments yet — be the first.</Text> : null}
              ListFooterComponent={<LoadMoreButton hasMore={hasMore} onPress={() => postId && loadMoreComments(postId)} />}
            />

            {posting ? <Text style={[styles.postingText, { color: iconColor }]}>Posting…</Text> : null}
            {err ? <InlineErrorText message={err} /> : null}

            {tray === 'emoji' ? (
              <View style={styles.trayWrap}>
                <EmojiPickerTray onPick={(e) => setText((t) => t + e)} onClose={() => setTray('none')} />
              </View>
            ) : null}
            {tray === 'gif' ? (
              <View style={styles.trayWrap}>
                <GifPickerTray onPick={runSendGif} onClose={() => setTray('none')} />
              </View>
            ) : null}

            <View style={[styles.composerRow, { borderTopColor: dividerBorder, paddingBottom: Math.max(12, insets.bottom) }]}>
              <View style={styles.composerAvatarWrap}>
                <Image source={userAvatarSource} style={styles.composerAvatarImg} />
              </View>

              {/* Same dock as chat: rounded pill field, emoji + GIF buttons, send circle once there's text */}
              <View style={[styles.inputPill, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  onFocus={() => setTray('none')}
                  placeholder="Add a comment"
                  placeholderTextColor={placeholderColor}
                  style={[styles.textInput, { color: inputTextColor }]}
                  maxLength={1000}
                  onSubmitEditing={runSubmit}
                />
              </View>

              {text.trim() ? (
                <Pressable onPress={runSubmit} style={styles.sendBtnWrap} accessibilityRole="button" accessibilityLabel="Post comment">
                  <View style={[styles.sendCircle, { backgroundColor: colors.electricAccent }]}>
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  </View>
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={() => toggleTray('emoji')} style={styles.dockIconBtn} accessibilityRole="button" accessibilityLabel="Emoji">
                    <Ionicons name="happy-outline" size={23} color={tray === 'emoji' ? '#D83CFF' : inputTextColor} />
                  </Pressable>
                  <Pressable onPress={() => toggleTray('gif')} style={styles.dockIconBtn} accessibilityRole="button" accessibilityLabel="GIF">
                    <View style={[styles.gifBadge, { borderColor: tray === 'gif' ? '#D83CFF' : inputTextColor }]}>
                      <Text style={[styles.gifBadgeText, { color: tray === 'gif' ? '#D83CFF' : inputTextColor }]}>GIF</Text>
                    </View>
                  </Pressable>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>

      <ConfirmSheet
        visible={!!reportTarget}
        title={reportTarget?.type === 'post' ? 'Report this post' : 'Report this comment'}
        body="Reported content is reviewed by the Reapers team. This doesn't notify the author."
        confirmLabel="Spam"
        extraActions={[
          { label: 'Harassment', onPress: () => submitReportReason('Harassment') },
          { label: 'Other', onPress: () => submitReportReason('Other') },
        ]}
        onClose={() => setReportTarget(null)}
        onConfirm={() => submitReportReason('Spam')}
      />

      <ConfirmSheet
        visible={!!deleteCommentId}
        title="Delete this comment?"
        body="This can't be undone."
        confirmLabel="Delete"
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => {
          if (user && postId && deleteCommentId) deleteComment(postId, deleteCommentId, user.id);
          setDeleteCommentId(null);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    width: '100%',
    backgroundColor: '#0E1423',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: { fontFamily: fonts.bodySemi, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  postPreview: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  postAuthor: { fontFamily: fonts.bodySemi, fontSize: 14, color: '#FFFFFF' },
  postContent: { fontFamily: fonts.body, fontSize: 13, marginTop: 4, lineHeight: 18, color: '#A6B4CE' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexGrow: 1 },
  emptyText: { color: '#8E9BB5', fontFamily: fonts.body, textAlign: 'center', marginTop: 20 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  commentAvatarWrap: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  commentAvatarImg: { width: '100%', height: '100%' },
  commentBody: { flex: 1 },
  commentUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentUser: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#FFFFFF' },
  commentTime: { fontFamily: fonts.mono, fontSize: 10, flex: 1, color: '#8E9BB5' },
  commentText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 2, color: '#A6B4CE' },
  commentOwnActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editCommentWrap: { marginTop: 4 },
  editCommentInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    backgroundColor: 'rgba(30, 36, 54, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  editCommentActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 6 },
  editCommentCancelText: { fontFamily: fonts.bodyMed, fontSize: 12, color: '#8E9BB5' },
  editCommentSaveText: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#00E5FF' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  composerAvatarWrap: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  composerAvatarImg: { width: '100%', height: '100%' },
  inputPill: { flex: 1, height: 42, borderRadius: 21, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  textInput: { fontFamily: fonts.body, fontSize: 14, color: '#FFFFFF', paddingVertical: 0 },
  dockIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  gifBadge: { borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 1 },
  gifBadgeText: { fontFamily: fonts.bodySemi, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  sendBtnWrap: { width: 34, height: 34 },
  sendCircle: { width: '100%', height: '100%', borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  postingText: { fontFamily: fonts.bodyMed, fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
  trayWrap: { paddingHorizontal: 12, paddingTop: 8 },
  commentGif: { width: 180, aspectRatio: 1.3, borderRadius: 10, marginTop: 6 },
  commentGifFailed: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
