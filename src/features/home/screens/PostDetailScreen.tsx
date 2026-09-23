import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Text, Share } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberFeedPostCard } from '../../../components/cards/CyberFeedPostCard';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { PostCommentsSheet } from '../../../components/feed/PostCommentsSheet';
import { useAuth } from '../../../hooks/useAuth';
import { usePostsStore } from '../../../store/postsStore';
import { useTheme, fonts } from '../../../theme';
import { submitReport } from '../../../services/supabase/reports';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

export function PostDetailScreen() {
  const route = useRoute<RouteProp<MainStackParamList, 'PostDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const currentAvatar = resolveAvatarSource(user?.avatarUri, user?.avatarId);
  
  const postId = route.params.id;
  const post = usePostsStore((s) => s.postsById?.[postId] || s.posts.find(p => p.id === postId) || s.myPosts.find(p => p.id === postId));
  const fetchPost = usePostsStore((s) => s.fetchPost);
  const reactToPost = usePostsStore((s) => s.reactToPost);
  const deletePostAction = usePostsStore((s) => s.deletePost);
  const editPostAction = usePostsStore((s) => s.editPost);

  const [loading, setLoading] = useState(!post);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    
    if (!post) {
      setLoading(true);
      fetchPost(postId, user.id).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [postId, user, post, fetchPost]);

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <CyberBackground showArtwork={false} />
        <View style={styles.headerBar}>
          <Pressable onPress={() => nav.goBack()} style={styles.backBtnTouch} accessibilityRole="button">
            <CyberCutBox cutSize={8} radius={4} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.backCutBox}>
              <View style={styles.backInner}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </View>
            </CyberCutBox>
          </Pressable>
          <Text style={[styles.headerTitleText, { color: colors.text }]}>Post</Text>
        </View>
        <View style={{ padding: 16 }}>
          {loading ? <Skeleton width="100%" height={200} /> : <Text style={[styles.notFoundText, { color: colors.muted }]}>Post not found or has been deleted.</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <CyberBackground showArtwork={false} />
      
      <View style={styles.headerBar}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtnTouch} accessibilityRole="button">
          <CyberCutBox cutSize={8} radius={4} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.backCutBox}>
            <View style={styles.backInner}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </View>
          </CyberCutBox>
        </Pressable>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>{post.authorName}'s Post</Text>
      </View>

      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        <CyberFeedPostCard
          userAvatarSource={currentAvatar}
          posts={[post]}
          hasMore={false}
          onLoadMore={() => {}}
          newPostsAvailable={false}
          onLoadNewPosts={() => {}}
          onSubmitText={() => {}}
          onSubmitActivity={() => {}}
          onPickPhoto={async () => undefined}
          onSubmitPhoto={() => {}}
          onToggleReaction={(pId, emoji) => user && reactToPost(pId, emoji, user.id)}
          onOpenComments={() => {}} // Not needed here, we show it inline below
          onShare={(p) => {
            const deepLink = `https://reapers.pk/post/${p.id}`;
            const parts = [
              `${p.authorName} on Reapers:`,
              p.content || (p.kind === 'photo' ? 'Shared a photo' : 'Shared an update'),
              deepLink,
            ].filter(Boolean);
            Share.share({ message: parts.join('\n\n'), url: p.mediaUrl });
          }}
          onReport={(pId) => setReportPostId(pId)}
          onDelete={(pId) => setDeletePostId(pId)}
          onEdit={(pId, content) => user && editPostAction(pId, user.id, content)}
        />
        
        {/* Fill remaining space with comments sheet */}
        <View style={{ flex: 1, marginTop: 16 }}>
          <PostCommentsSheet postId={post.id} onClose={() => {}} userAvatarSource={currentAvatar} inline />
        </View>
      </KeyboardAwareScrollView>

      <ConfirmSheet
        visible={!!reportPostId}
        title="Report this post"
        body="Reported posts are reviewed by the Reapers team. This doesn't notify the author."
        confirmLabel="Spam"
        extraActions={[
          { label: 'Harassment', onPress: () => { if (user && reportPostId) submitReport(user.id, 'post', reportPostId, 'Harassment').catch(() => undefined); setReportPostId(null); } },
          { label: 'Other', onPress: () => { if (user && reportPostId) submitReport(user.id, 'post', reportPostId, 'Other').catch(() => undefined); setReportPostId(null); } },
        ]}
        onClose={() => setReportPostId(null)}
        onConfirm={() => { if (user && reportPostId) submitReport(user.id, 'post', reportPostId, 'Spam').catch(() => undefined); setReportPostId(null); }}
      />
      <ConfirmSheet
        visible={!!deletePostId}
        title="Delete this post?"
        body="This removes it permanently for everyone. This can't be undone."
        confirmLabel="Delete"
        onClose={() => setDeletePostId(null)}
        onConfirm={() => { if (user && deletePostId) deletePostAction(deletePostId, user.id); setDeletePostId(null); nav.goBack(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090F1C' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8, gap: 12 },
  backBtnTouch: { width: 38, height: 38 },
  backCutBox: { width: 38, height: 38 },
  backInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  headerTitleText: { fontFamily: fonts.display, fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  notFoundText: { fontFamily: fonts.body, fontSize: 14, color: '#8E9BB5' },
});
