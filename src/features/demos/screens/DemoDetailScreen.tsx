import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { InlineVideoPlayer } from '../../../components/media/InlineVideoPlayer';
import type { MainStackParamList } from '../../../navigation/types';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import { formatTime } from '../../../utils/format';
import { Ionicons } from '@expo/vector-icons';

export function DemoDetailScreen() {
  const route = useRoute<RouteProp<MainStackParamList, 'DemoDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const id = route.params?.id;
  const demo = useCommunityStore((s) => s.demos.find((d) => d.id === id));
  const allComments = useCommunityStore((s) => s.comments);
  const addComment = useCommunityStore((s) => s.addComment);
  const [playing, setPlaying] = useState(false);
  const [text, setText] = useState('');
  const [liked, setLiked] = useState(false);

  const sorted = useMemo(
    () =>
      allComments
        .filter((c) => c.demoId === id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [allComments, id],
  );

  if (!id || !demo) {
    return (
      <Screen>
        <ScreenHeader title="Demo" onBack={() => nav.goBack()} />
        <EmptyState title="This demo could not be opened. Go back and try again." actionLabel="Back" onAction={() => nav.goBack()} />
      </Screen>
    );
  }

  const post = () => {
    const body = text.trim();
    if (!body) return;
    addComment(demo.id, user?.displayName ?? 'You', body, user?.avatarId);
    setText('');
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title={demo.title} onBack={() => nav.goBack()} />
      <Pressable onPress={() => setPlaying(true)} accessibilityRole="button" accessibilityLabel="Play demo">
        {playing && demo.videoUrl ? (
          <View style={[styles.player, { backgroundColor: colors.surface }]}>
            <InlineVideoPlayer uri={demo.videoUrl} playing muted={false} height={220} />
          </View>
        ) : (
          <View>
            <Image source={{ uri: demo.thumbnail }} style={styles.player} accessibilityLabel={`${demo.title} thumbnail`} />
            <View style={styles.playWrap} pointerEvents="none">
              <Ionicons name="play-circle" size={56} color="#fff" />
            </View>
          </View>
        )}
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={() => setLiked((v) => !v)} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? colors.magenta : colors.text} />
        </Pressable>
        <Pressable style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed }}>{sorted.length} comments</Text>
      </View>
      <Text style={[styles.h, { color: colors.text }]}>{demo.title}</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 4 }}>
        {demo.developerName} · {demo.genre}
      </Text>
      <Text style={{ color: colors.text, fontFamily: fonts.body, marginTop: 10, lineHeight: 22 }}>{demo.description}</Text>
      {demo.externalUrl ? (
        <Pressable onPress={() => Linking.openURL(demo.externalUrl!)} style={styles.linkRow} accessibilityRole="link">
          <Ionicons name="link-outline" size={18} color={colors.cyan} />
          <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }} numberOfLines={1}>
            {demo.externalUrl}
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.h2, { color: colors.text }]}>Comments</Text>
      {sorted.length === 0 ? <EmptyState title="No comments yet — say how the demo felt." /> : null}
      {sorted.map((c) => (
        <View key={c.id} style={styles.comment}>
          <AvatarRing name={c.userName} size={36} avatarId={c.avatarId} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>
              {c.userName}{' '}
              <Text style={{ color: colors.muted2, fontFamily: fonts.body, fontSize: 12 }}>{formatTime(c.createdAt)}</Text>
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.body, marginTop: 2, lineHeight: 20 }}>{c.text}</Text>
          </View>
        </View>
      ))}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AvatarRing name={user?.displayName ?? 'You'} size={32} uri={user?.avatarUri} avatarId={user?.avatarId} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="How did this demo feel?"
            placeholderTextColor={colors.muted2}
            style={[styles.input, { color: colors.text }]}
          />
          <Pressable onPress={post} accessibilityRole="button" accessibilityLabel="Post comment">
            <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi }}>Post</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  player: { width: '100%', height: 220, borderRadius: radius.md, marginBottom: 8 },
  playWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,15,28,0.35)',
    borderRadius: radius.md,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  h: { fontFamily: fonts.display, fontSize: 24 },
  h2: { fontFamily: fonts.display, fontSize: 18, marginTop: 20, marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 8 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  input: { flex: 1, fontFamily: fonts.body, minHeight: 44 },
});
