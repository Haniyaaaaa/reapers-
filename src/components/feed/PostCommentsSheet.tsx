import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, ImageSourcePropType, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { InlineErrorText } from '../feedback/InlineErrorText';
import { ConfirmSheet } from '../feedback/ConfirmSheet';
import { LoadMoreButton } from '../feedback/LoadMoreButton';
import { getCyberAvatarSource } from '../../data/cyberAvatars';
import { useAuth } from '../../hooks/useAuth';
import { usePostsStore } from '../../store/postsStore';
import { EMPTY_ARRAY } from '../../utils/emptyArray';
import { subscribeToPostComments, subscribeToPostReactions } from '../../services/supabase/realtime';
import { submitReport } from '../../services/supabase/reports';
import { fonts, useTheme } from '../../theme';
import type { PostComment } from '../../types/post';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.82);

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

  useEffect(() => {
    if (postId) fetchComments(postId);
  }, [postId, fetchComments]);

  useEffect(() => {
    if (!postId) return;
    const unsubComments = subscribeToPostComments(postId, handleRealtimeComment);
    const unsubReactions = user ? subscribeToPostReactions(postId, () => fetchFeed(user.id)) : () => undefined;
    return () => {
      unsubComments();
      unsubReactions();
    };
  }, [postId, handleRealtimeComment, fetchFeed, user]);

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

  const renderComment = ({ item }: { item: PostComment }) => (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatarWrap}>
        <Image
          source={item.avatarUri ? { uri: item.avatarUri } : getCyberAvatarSource(item.avatarId)}
          style={styles.commentAvatarImg}
        />
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentUserRow}>
          <Text style={[styles.commentUser, { color: commentUserColor }]}>{item.userName}</Text>
          <Text style={[styles.commentTime, { color: commentTimeColor }]}>{formatTime(item.createdAt)}</Text>
          {item.userId === user?.id ? (
            <View style={styles.commentOwnActions}>
              <Pressable onPress={() => startEditingComment(item)} hitSlop={8}>
                <Ionicons name="create-outline" size={16} color={isLight ? colors.primary : '#00E5FF'} />
              </Pressable>
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
        ) : (
          <Text style={[styles.commentText, { color: commentTextColor }]}>{item.text}</Text>
        )}
      </View>
    </View>
  );

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
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={renderComment}
              contentContainerStyle={styles.list}
              ListEmptyComponent={!loading ? <Text style={[styles.emptyText, { color: emptyTextColor }]}>No comments yet — be the first.</Text> : null}
              ListFooterComponent={<LoadMoreButton hasMore={hasMore} onPress={() => postId && loadMoreComments(postId)} />}
            />

            {err ? <InlineErrorText message={err} /> : null}

            <View style={[styles.composerRow, { borderTopColor: dividerBorder, paddingBottom: Math.max(12, insets.bottom) }]}>
              <View style={styles.composerAvatarWrap}>
                <Image source={userAvatarSource} style={styles.composerAvatarImg} />
              </View>

              <CyberCutBox
                cutSize={10}
                radius={6}
                fill={inputBg}
                borderColor={inputBorder}
                borderWidth={0.88}
                style={styles.inputCutBox}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Add a comment"
                  placeholderTextColor={placeholderColor}
                  style={[styles.textInput, { color: inputTextColor }]}
                  maxLength={1000}
                  onSubmitEditing={submit}
                />
              </CyberCutBox>

              <Pressable onPress={submit} disabled={!text.trim()} style={styles.sendBtnWrap} accessibilityRole="button">
                <CyberCutBox
                  gradient={!!text.trim()}
                  fill={text.trim() ? undefined : inputBg}
                  borderColor={text.trim() ? undefined : inputBorder}
                  borderWidth={text.trim() ? 0 : 0.88}
                  cutSize={8}
                  radius={4}
                  style={styles.sendCutBox}
                >
                  <View style={styles.sendInner}>
                    <Ionicons name="send" size={16} color={text.trim() ? '#FFFFFF' : placeholderColor} />
                  </View>
                </CyberCutBox>
              </Pressable>
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
  inputCutBox: { flex: 1, height: 42 },
  textInput: { flex: 1, height: '100%', paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 13.5, color: '#FFFFFF' },
  sendBtnWrap: { width: 40, height: 40 },
  sendCutBox: { width: 40, height: 40 },
  sendInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
