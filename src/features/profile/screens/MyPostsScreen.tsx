import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { usePostsStore } from '../../../store/postsStore';
import { DATE_BUCKETS, matchesDateBucket, type DateBucket } from '../../../utils/dateFilters';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { FeedPost, PostKind } from '../../../types/post';

function timeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

const KIND_FILTERS: { key: 'ALL' | PostKind; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'text', label: 'THOUGHTS' },
  { key: 'photo', label: 'PHOTOS' },
  { key: 'activity', label: 'ACTIVITY' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.chipTouch}>
      <CyberCutBox
        gradient={active}
        cutSize={6}
        radius={4}
        fill={active ? undefined : colors.cardFill}
        borderColor={active ? undefined : colors.cardBorder}
        borderWidth={active ? 0 : 0.88}
        style={styles.chipCut}
      >
        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.muted }, active && styles.chipTextActive]}>{label}</Text>
      </CyberCutBox>
    </Pressable>
  );
}

/** All of your own posts, independent of the (recency-capped) home feed cursor — reachable
 * from the profile screen's quick links, same convention as MyBookings/MyEventApplications. */
export function MyPostsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { colors, isDark, isLight } = useTheme();

  const posts = usePostsStore((s) => s.myPosts);
  const hasMore = usePostsStore((s) => s.myPostsHasMore);
  const loading = usePostsStore((s) => s.myPostsLoading);
  const fetchMyPosts = usePostsStore((s) => s.fetchMyPosts);
  const loadMoreMyPosts = usePostsStore((s) => s.loadMoreMyPosts);
  const editPost = usePostsStore((s) => s.editPost);
  const deletePost = usePostsStore((s) => s.deletePost);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'ALL' | PostKind>('ALL');
  const [dateFilter, setDateFilter] = useState<DateBucket>('ALL');

  useEffect(() => {
    if (user) fetchMyPosts(user.id);
  }, [user, fetchMyPosts]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchMyPosts(user.id);
  });

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) => (kindFilter === 'ALL' || p.kind === kindFilter) && matchesDateBucket(p.createdAt, dateFilter),
      ),
    [posts, kindFilter, dateFilter],
  );

  const totals = useMemo(
    () => ({
      posts: posts.length,
      likes: posts.reduce((sum, p) => sum + (p.reactions?.reduce((s, r) => s + r.count, 0) ?? 0), 0),
      comments: posts.reduce((sum, p) => sum + p.commentCount, 0),
    }),
    [posts],
  );

  const startEdit = (post: FeedPost) => {
    setEditingId(post.id);
    setEditText(post.content ?? '');
  };

  const saveEdit = (postId: string) => {
    const trimmed = editText.trim();
    if (trimmed && user) editPost(postId, user.id, trimmed);
    setEditingId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />
      <Screen refreshControl={refreshControl}>
        <ScreenHeader title="My Posts" onBack={() => nav.goBack()} />

        {/* Stat strip */}
        <View style={styles.statsRow}>
          <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
            <View style={styles.statInner}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totals.posts}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>POSTS</Text>
            </View>
          </CyberCutBox>
          <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
            <View style={styles.statInner}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totals.likes}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>LIKES</Text>
            </View>
          </CyberCutBox>
          <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
            <View style={styles.statInner}>
              <Text style={[styles.statNum, { color: colors.text }]}>{totals.comments}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>COMMENTS</Text>
            </View>
          </CyberCutBox>
        </View>

        {/* Filters */}
        <Text style={[styles.filterLabel, { color: colors.muted }]}>TYPE</Text>
        <View style={styles.chipRow}>
          {KIND_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={kindFilter === f.key} onPress={() => setKindFilter(f.key)} />
          ))}
        </View>
        <Text style={[styles.filterLabel, { color: colors.muted }]}>DATE</Text>
        <View style={styles.chipRow}>
          {DATE_BUCKETS.map((b) => (
            <Chip key={b} label={b} active={dateFilter === b} onPress={() => setDateFilter(b)} />
          ))}
        </View>

        <LinearGradient
          colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.divider}
        />

        {!loading && filtered.length === 0 ? (
          <EmptyState title={posts.length === 0 ? "You haven't posted anything yet." : 'No posts match these filters.'} />
        ) : null}

        {filtered.map((post) => (
          <CyberCutBox
            key={post.id}
            cutSize={14}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            glass={isDark}
            style={styles.postCard}
          >
            <View style={styles.postInner}>
              <View style={styles.headerRow}>
                <View style={styles.avatarBox}>
                  <Image
                    source={post.authorAvatarUri ? { uri: post.authorAvatarUri } : getCyberAvatarSource(post.authorAvatarId)}
                    style={styles.avatarImg}
                  />
                </View>
                <View style={styles.authorInfo}>
                  <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
                  <Text style={[styles.metaText, { color: colors.muted }]}>{timeAgo(post.createdAt)} ago</Text>
                </View>
                <Pressable onPress={() => startEdit(post)} hitSlop={8} style={{ marginRight: 16 }}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => setDeleteId(post.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#FF4D6D" />
                </Pressable>
              </View>

              {editingId === post.id ? (
                <View style={styles.editWrap}>
                  <TextInput
                    value={editText}
                    onChangeText={setEditText}
                    style={[
                      styles.editInput,
                      {
                        backgroundColor: colors.inputFill,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      },
                    ]}
                    placeholderTextColor={colors.muted2}
                    multiline
                    maxLength={2000}
                    autoFocus
                  />
                  <View style={styles.editActionsRow}>
                    <Pressable onPress={() => setEditingId(null)}>
                      <Text style={[styles.editCancelText, { color: colors.muted }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={() => saveEdit(post.id)}>
                      <Text style={[styles.editSaveText, { color: colors.primary }]}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : post.content ? (
                <Text style={[styles.contentText, { color: colors.text }]}>{post.content}</Text>
              ) : null}

              {post.mediaUrl ? <Image source={{ uri: post.mediaUrl }} style={styles.mediaImg} resizeMode="cover" /> : null}

              <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.footerStatText, { color: colors.muted }]}>
                  ❤️ {post.reactions?.reduce((sum, r) => sum + r.count, 0) ?? 0}
                </Text>
                <Text style={[styles.footerStatText, { color: colors.muted }]}>💬 {post.commentCount}</Text>
              </View>
            </View>
          </CyberCutBox>
        ))}

        <LoadMoreButton hasMore={hasMore} onPress={() => user && loadMoreMyPosts(user.id)} />
      </Screen>

      <ConfirmSheet
        visible={!!deleteId}
        title="Delete this post?"
        body="This removes it permanently for everyone. This can't be undone."
        confirmLabel="Delete"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (user && deleteId) deletePost(deleteId, user.id);
          setDeleteId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090F1C' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statTile: { flex: 1, height: 62 },
  statInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.6, color: '#8E9BB5', marginTop: 2 },
  filterLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: '#8E9BB5', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chipTouch: { minWidth: 72 },
  chipCut: { height: 32, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5, color: '#8E9BB5' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  divider: { height: 2, borderRadius: 1, width: '100%', marginBottom: 18 },
  postCard: { width: '100%', padding: 16, marginBottom: 14 },
  postInner: { width: '100%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarBox: { width: 42, height: 42, borderRadius: 8, overflow: 'hidden', backgroundColor: '#1E2438' },
  avatarImg: { width: '100%', height: '100%' },
  authorInfo: { flex: 1 },
  authorName: { fontFamily: fonts.bodySemi, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  metaText: { fontFamily: fonts.body, fontSize: 11.5, color: '#8E9BB5', marginTop: 2 },
  contentText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: '#E2E8F0', marginBottom: 10 },
  mediaImg: { width: '100%', height: 190, borderRadius: 8, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  footerRow: { flexDirection: 'row', gap: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  footerStatText: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#E2E8F0' },
  editWrap: { marginBottom: 10 },
  editInput: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
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
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  editCancelText: { fontFamily: fonts.bodyMed, fontSize: 13, color: '#8E9BB5' },
  editSaveText: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#00E5FF' },
});
