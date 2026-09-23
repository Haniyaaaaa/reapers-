import { useState } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { LoadMoreButton } from '../feedback/LoadMoreButton';
import { PostReactionSheet, QuickReactionBar } from '../feed/PostReactionSheet';
import { resolveAvatarSource } from '../../data/cyberAvatars';
import { useProfilePreviewStore } from '../../store/profilePreviewStore';
import { fonts, useTheme } from '../../theme';
import type { FeedPost } from '../../types/post';
import { CutAvatar } from '../avatars/CutAvatar';

function timeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

interface CyberFeedPostCardProps {
  userAvatarSource: ImageSourcePropType;
  posts: FeedPost[];
  hasMore: boolean;
  onLoadMore: () => void;
  newPostsAvailable: boolean;
  onLoadNewPosts: () => void;
  onSubmitText: (text: string) => void;
  onSubmitActivity: (text: string, tag: string) => void;
  /** Just picks a local image and hands its URI back — does not upload or post anything.
   * The composer shows it as a removable preview and only actually creates the post (via
   * onSubmitPhoto) once the user hits send, so they can add a caption first instead of the
   * photo posting itself immediately on pick. */
  onPickPhoto: () => Promise<string | undefined>;
  onSubmitPhoto: (text: string, localUri: string) => void;
  onToggleReaction: (postId: string, emoji: string) => void;
  onOpenComments: (postId: string) => void;
  onShare: (post: FeedPost) => void;
  onReport: (postId: string) => void;
  /** Requests deletion — the caller is expected to confirm before actually deleting. */
  onDelete: (postId: string) => void;
  onEdit: (postId: string, content: string) => void;
}

export function CyberFeedPostCard({
  userAvatarSource,
  posts,
  hasMore,
  onLoadMore,
  newPostsAvailable,
  onLoadNewPosts,
  onSubmitText,
  onSubmitActivity,
  onPickPhoto,
  onSubmitPhoto,
  onToggleReaction,
  onOpenComments,
  onShare,
  onReport,
  onDelete,
  onEdit,
}: CyberFeedPostCardProps) {
  const { colors, light } = useTheme();

  const [inputText, setInputText] = useState('');
  const [activityMode, setActivityMode] = useState(false);
  const [activityTag, setActivityTag] = useState('');
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [reactionSheetPostId, setReactionSheetPostId] = useState<string | null>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEditingPost = (post: FeedPost) => {
    setEditingPostId(post.id);
    setEditText(post.content ?? '');
    setMenuPostId(null);
  };

  const saveEditedPost = (postId: string) => {
    const trimmed = editText.trim();
    if (trimmed) onEdit(postId, trimmed);
    setEditingPostId(null);
  };

  const submit = () => {
    const text = inputText.trim();
    if (pendingPhotoUri) {
      onSubmitPhoto(text, pendingPhotoUri);
      setPendingPhotoUri(null);
    } else if (activityMode) {
      if (!text || !activityTag.trim()) return;
      onSubmitActivity(text, activityTag.trim());
    } else {
      if (!text) return;
      onSubmitText(text);
    }
    setInputText('');
    setActivityTag('');
    setActivityMode(false);
  };

  const pickPhoto = async () => {
    const uri = await onPickPhoto();
    if (uri) setPendingPhotoUri(uri);
  };

  return (
    <View style={styles.container}>
      {/* 1. Post Creator Box matching Figma spec */}
      <CyberCutBox
        cutSize={24}
        radius={6}
        fill="rgba(18, 14, 36, 0.6)"
        borderColor="rgba(168, 85, 247, 0.2)"
        borderWidth={1}
        glass
        style={styles.composerCard}
      >
        <View style={styles.composerInner}>
          <View style={styles.composerTopRow}>
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill="rgba(168, 85, 247, 0.2)"
              borderColor="rgba(192, 132, 252, 0.35)"
              borderWidth={1}
              style={styles.composerAvatarWrap}
            >
              <Image source={userAvatarSource} style={styles.avatarImg} />
            </CyberCutBox>

            <View
              style={[
                styles.composerInputWrap,
                {
                  backgroundColor: light ? 'rgba(241, 245, 249, 0.9)' : 'rgba(30, 36, 54, 0.6)',
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={pendingPhotoUri ? 'Add a caption (optional)...' : activityMode ? 'What are you up to?' : 'Share an update with your circle...'}
                placeholderTextColor={colors.muted2}
                style={[styles.composerInput, { color: colors.text }]}
                onSubmitEditing={submit}
                maxLength={2000}
              />
            </View>

            {inputText.trim() || pendingPhotoUri ? (
              <Pressable onPress={submit} style={styles.postBtn} accessibilityRole="button">
                <Ionicons name="send" size={16} color="#00E5FF" />
              </Pressable>
            ) : null}
          </View>

          {pendingPhotoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: pendingPhotoUri }} style={styles.photoPreviewImg} />
              <Pressable onPress={() => setPendingPhotoUri(null)} style={styles.photoPreviewRemoveBtn} accessibilityRole="button">
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          {activityMode ? (
            <View
              style={[
                styles.activityTagRow,
                {
                  backgroundColor: light ? 'rgba(241, 245, 249, 0.9)' : 'rgba(30, 36, 54, 0.6)',
                  borderColor: light ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.3)',
                },
              ]}
            >
              <TextInput
                value={activityTag}
                onChangeText={setActivityTag}
                placeholder="Location / Activity tag, e.g. Lahore"
                placeholderTextColor={colors.muted2}
                style={[styles.composerInput, { color: colors.text }]}
                maxLength={60}
              />
            </View>
          ) : null}

          {/* Quick Action Capsule Pills: Photo, Activity, Thought */}
          <View style={styles.composerPillsRow}>
            <Pressable
              style={[
                styles.composerPill,
                light && { backgroundColor: '#FFFFFF', borderColor: 'rgba(168, 85, 247, 0.35)' },
              ]}
              accessibilityRole="button"
              onPress={pickPhoto}
            >
              <Ionicons name="image-outline" size={15} color="#D83CFF" />
              <Text style={[styles.composerPillText, { color: light ? colors.text : '#FFFFFF' }]}>Photo</Text>
            </Pressable>

            <Pressable
              style={[
                styles.composerPill,
                light && {
                  backgroundColor: activityMode ? 'rgba(216, 60, 255, 0.12)' : '#FFFFFF',
                  borderColor: activityMode ? '#D83CFF' : 'rgba(168, 85, 247, 0.35)',
                },
                activityMode && !light && styles.composerPillActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: activityMode }}
              onPress={() => setActivityMode((v) => !v)}
            >
              <Ionicons name="location-outline" size={15} color="#D83CFF" />
              <Text style={[styles.composerPillText, { color: light ? (activityMode ? '#9333EA' : colors.text) : '#FFFFFF' }]}>Activity</Text>
            </Pressable>

            <Pressable
              style={[
                styles.composerPill,
                light && {
                  backgroundColor: !activityMode ? 'rgba(216, 60, 255, 0.12)' : '#FFFFFF',
                  borderColor: !activityMode ? '#D83CFF' : 'rgba(168, 85, 247, 0.35)',
                },
                !activityMode && !light && styles.composerPillActive,
              ]}
              accessibilityRole="button"
              onPress={() => setActivityMode(false)}
            >
              <Ionicons name="sparkles-outline" size={15} color="#D83CFF" />
              <Text style={[styles.composerPillText, { color: light ? (!activityMode ? '#9333EA' : colors.text) : '#FFFFFF' }]}>Thought</Text>
            </Pressable>
          </View>
        </View>
      </CyberCutBox>

      {newPostsAvailable ? (
        <Pressable onPress={onLoadNewPosts} style={styles.newPostsPill} accessibilityRole="button">
          <Ionicons name="arrow-up" size={13} color="#00E5FF" />
          <Text style={styles.newPostsText}>New posts</Text>
        </Pressable>
      ) : null}

      {/* 2. Feed Post Cards matching Figma spec */}
      {posts.length === 0 ? (
        <CyberCutBox
          cutSize={12}
          radius={6}
          fill="rgba(18, 14, 36, 0.65)"
          borderColor="rgba(168, 85, 247, 0.2)"
          borderWidth={1}
          style={styles.emptyFeedBox}
        >
          <Ionicons name="chatbubbles-outline" size={20} color="#00E5FF" style={{ marginBottom: 6 }} />
          <Text style={styles.emptyFeedText}>No feed updates yet</Text>
          <Text style={styles.emptyFeedSubText}>Broadcast progress, post thoughts, or chat in circles.</Text>
        </CyberCutBox>
      ) : (
        posts.map((post) => (
          <CyberCutBox
            key={post.id}
            cutSize={24}
            radius={6}
            fill="rgba(18, 14, 36, 0.6)"
            borderColor="rgba(168, 85, 247, 0.2)"
            borderWidth={1}
            glass
            style={styles.postCard}
          >
            <View style={styles.postInner}>
              {/* Header: Author Avatar + Name + Meta */}
              <View style={styles.postHeaderRow}>
                <Pressable
                  onPress={() => useProfilePreviewStore.getState().open(post.userId)}
                  style={styles.postAuthorTouch}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${post.authorName}'s profile`}
                >
                  <CutAvatar
                    source={resolveAvatarSource(post.authorAvatarUri, post.authorAvatarId)}
                    size={50}
                    cut={11}
                    borderColor="rgba(192, 132, 252, 0.35)"
                    borderWidth={1}
                    fill="rgba(168, 85, 247, 0.2)"
                  />

                  <View style={styles.postAuthorInfo}>
                    <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
                    <Text style={[styles.postMeta, { color: colors.muted }]}>
                      {timeAgo(post.createdAt)} ago
                      {post.activityTag ? ` · 📍 ${post.activityTag}` : ''}
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.menuAnchor}>
                  <Pressable
                    onPress={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
                    style={styles.menuBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
                  </Pressable>

                  {menuPostId === post.id ? (
                    <>
                      <Pressable style={styles.menuBackdrop} onPress={() => setMenuPostId(null)} />
                      <View style={[styles.menu, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        {post.mine ? (
                          <>
                            <Pressable
                              onPress={() => startEditingPost(post)}
                              style={styles.menuRow}
                              accessibilityRole="button"
                            >
                              <Ionicons name="create-outline" size={16} color={colors.electricAccent} />
                              <Text style={[styles.menuRowText, { color: colors.text }]}>Edit post</Text>
                            </Pressable>
                            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                            <Pressable
                              onPress={() => {
                                onDelete(post.id);
                                setMenuPostId(null);
                              }}
                              style={styles.menuRow}
                              accessibilityRole="button"
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.danger} />
                              <Text style={styles.menuRowDanger}>Delete post</Text>
                            </Pressable>
                          </>
                        ) : (
                          <Pressable
                            onPress={() => {
                              onReport(post.id);
                              setMenuPostId(null);
                            }}
                            style={styles.menuRow}
                            accessibilityRole="button"
                          >
                            <Ionicons name="flag-outline" size={16} color={colors.muted} />
                            <Text style={[styles.menuRowText, { color: colors.text }]}>Report</Text>
                          </Pressable>
                        )}
                      </View>
                    </>
                  ) : null}
                </View>
              </View>

              {/* Post Body Content */}
              {editingPostId === post.id ? (
                <View style={styles.editWrap}>
                  <TextInput
                    value={editText}
                    onChangeText={setEditText}
                    style={[
                      styles.editInput,
                      {
                        color: colors.text,
                        backgroundColor: light ? 'rgba(241, 245, 249, 0.9)' : 'rgba(30, 36, 54, 0.6)',
                        borderColor: colors.border,
                      },
                    ]}
                    multiline
                    maxLength={2000}
                    autoFocus
                  />
                  <View style={styles.editActionsRow}>
                    <Pressable onPress={() => setEditingPostId(null)} style={styles.editCancelBtn} accessibilityRole="button">
                      <Text style={[styles.editCancelText, { color: colors.muted }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={() => saveEditedPost(post.id)} style={styles.editSaveBtn} accessibilityRole="button">
                      <Text style={styles.editSaveText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : post.content ? (
                <Text style={[styles.postContentText, { color: colors.text }]}>{post.content}</Text>
              ) : null}

              {post.mediaUrl ? (
                <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} resizeMode="cover" />
              ) : null}

              {post.reactions?.length ? (
                <View style={styles.reactionChipsRow}>
                  {post.reactions.map((r) => (
                    <Pressable
                      key={r.emoji}
                      onPress={() => onToggleReaction(post.id, r.emoji)}
                      style={[
                        styles.reactionChip,
                        { backgroundColor: light ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.06)' },
                        r.mine && styles.reactionChipMine,
                      ]}
                    >
                      <Text style={[styles.reactionChipText, { color: colors.text }]}>
                        {r.emoji} {r.count}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <QuickReactionBar
                onReact={(e) => onToggleReaction(post.id, e)}
                onOpenFull={() => setReactionSheetPostId(post.id)}
              />

              {/* Post Footer Actions matching Figma: Heart + count, Comments + count, Share */}
              <View style={[styles.postFooterRow, { borderTopColor: colors.border }]}>
                <View style={styles.leftActions}>
                  <Pressable
                    onPress={() => onToggleReaction(post.id, '❤️')}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={post.reactions?.some((r) => r.emoji === '❤️' && r.mine) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={post.reactions?.some((r) => r.emoji === '❤️' && r.mine) ? colors.danger : colors.muted}
                    />
                    <Text style={[styles.actionCountText, { color: colors.muted }]}>
                      {post.reactions?.reduce((sum, r) => sum + r.count, 0) ?? 0}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onOpenComments(post.id)}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.muted} />
                    <Text style={[styles.actionCountText, { color: colors.muted }]}>{post.commentCount ?? 0}</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => onShare(post)} style={styles.shareBtn} accessibilityRole="button">
                  <Ionicons name="share-outline" size={18} color={colors.muted} />
                  <Text style={[styles.shareText, { color: colors.muted }]}>Share</Text>
                </Pressable>
              </View>
            </View>
          </CyberCutBox>
        ))
      )}

      <LoadMoreButton hasMore={hasMore} onPress={onLoadMore} />

      <PostReactionSheet
        visible={!!reactionSheetPostId}
        onReact={(e) => {
          if (reactionSheetPostId) onToggleReaction(reactionSheetPostId, e);
        }}
        onClose={() => setReactionSheetPostId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 14 },
  emptyFeedBox: { paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  emptyFeedText: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#E2E8F0', marginBottom: 4 },
  emptyFeedSubText: { fontFamily: fonts.body, fontSize: 11.5, color: '#94A3B8', textAlign: 'center' },
  composerCard: { width: '100%', padding: 16 },
  composerInner: { width: '100%' },
  composerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  composerAvatarWrap: { width: 50, height: 50, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  composerInputWrap: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(30, 36, 54, 0.6)',
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  composerInput: { fontFamily: fonts.body, fontSize: 13.5, color: '#FFFFFF' },
  postBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  photoPreviewWrap: { marginBottom: 12, alignSelf: 'flex-start', position: 'relative' },
  photoPreviewImg: { width: 96, height: 96, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  photoPreviewRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTagRow: {
    marginBottom: 12,
    height: 36,
    backgroundColor: 'rgba(30, 36, 54, 0.6)',
    borderRadius: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  composerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  composerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 36, 54, 0.5)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  composerPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(216, 60, 255, 0.6)',
  },
  composerPillText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newPostsPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  newPostsText: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#00E5FF' },
  postCard: { width: '100%', padding: 16 },
  postInner: { width: '100%' },
  postHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  postAuthorTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  postAvatarBox: { width: 50, height: 50, overflow: 'hidden' },
  postAuthorInfo: { flex: 1, justifyContent: 'center' },
  authorName: { fontFamily: fonts.display, fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  postMeta: { fontFamily: fonts.body, fontSize: 12.5, color: '#9CA3AF', marginTop: 3 },
  menuAnchor: { position: 'relative' },
  menuBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 19 },
  menu: {
    position: 'absolute',
    top: 32,
    right: 0,
    minWidth: 150,
    backgroundColor: '#161B2E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  menuDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginHorizontal: 8 },
  menuRowText: { fontFamily: fonts.bodyMed, fontSize: 12.5, color: '#E2E8F0' },
  menuRowDanger: { fontFamily: fonts.bodyMed, fontSize: 12.5, color: '#FF4D6D' },
  postContentText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: '#E2E8F0', marginVertical: 10 },
  editWrap: { marginVertical: 10 },
  editInput: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
    backgroundColor: 'rgba(30, 36, 54, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  editCancelBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  editCancelText: { fontFamily: fonts.bodyMed, fontSize: 12.5, color: '#9CA3AF' },
  editSaveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(0, 229, 255, 0.15)' },
  editSaveText: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: '#00E5FF' },
  postMedia: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  reactionChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  reactionChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  reactionChipMine: { backgroundColor: 'rgba(0, 229, 255, 0.15)' },
  reactionChipText: { fontFamily: fonts.mono, fontSize: 11, color: '#E2E8F0' },
  postFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCountText: { fontFamily: fonts.bodySemi, fontSize: 13.5, fontWeight: '600', color: '#E2E8F0' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareText: { fontFamily: fonts.bodySemi, fontSize: 13.5, fontWeight: '600', color: '#E2E8F0' },
});
