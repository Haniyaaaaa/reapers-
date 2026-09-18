import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MainStackParamList } from '../../../navigation/types';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { FilterChip } from '../../../components/inputs/FilterChip';
import { InlineVideoPlayer } from '../../../components/media/InlineVideoPlayer';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useChatStore } from '../../../store/chatStore';
import { fonts, radius, useTheme } from '../../../theme';
import { formatTime } from '../../../utils/format';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import type { ChatMessage } from '../../../types/chat';

type Tab = 'photos' | 'videos' | 'links';

export function RoomMediaScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'RoomMedia'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('photos');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const media = useChatStore((s) => s.roomMedia[params.roomId]);
  const fetchRoomImages = useChatStore((s) => s.fetchRoomImages);
  const loadMoreRoomImages = useChatStore((s) => s.loadMoreRoomImages);
  const fetchRoomVideos = useChatStore((s) => s.fetchRoomVideos);
  const loadMoreRoomVideos = useChatStore((s) => s.loadMoreRoomVideos);
  const fetchRoomLinks = useChatStore((s) => s.fetchRoomLinks);
  const loadMoreRoomLinks = useChatStore((s) => s.loadMoreRoomLinks);

  useEffect(() => {
    if (tab === 'photos') fetchRoomImages(params.roomId);
    if (tab === 'videos') fetchRoomVideos(params.roomId);
    if (tab === 'links') fetchRoomLinks(params.roomId);
  }, [tab, params.roomId, fetchRoomImages, fetchRoomVideos, fetchRoomLinks]);

  const images = media?.images ?? EMPTY_ARRAY;
  const videos = media?.videos ?? EMPTY_ARRAY;
  const links = media?.links ?? EMPTY_ARRAY;

  const renderGridItem = (item: ChatMessage) => (
    <Pressable
      key={item.id}
      style={styles.cell}
      onPress={() => (item.kind === 'video' ? setPlayingVideo(item.mediaUrl!) : setViewingImage(item.mediaUrl!))}
      accessibilityRole="button"
    >
      <Image source={{ uri: item.kind === 'video' ? item.mediaThumbnailUrl ?? item.mediaUrl : item.mediaUrl }} style={styles.cellImage} />
      {item.kind === 'video' ? (
        <View style={styles.playBadge} pointerEvents="none">
          <Ionicons name="play" size={16} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <Screen scroll={false}>
      <ScreenHeader title="Shared media" onBack={() => nav.goBack()} />
      <View style={styles.tabs}>
        <FilterChip label="Photos" selected={tab === 'photos'} onPress={() => setTab('photos')} />
        <FilterChip label="Videos" selected={tab === 'videos'} onPress={() => setTab('videos')} />
        <FilterChip label="Links" selected={tab === 'links'} onPress={() => setTab('links')} />
      </View>

      {tab === 'photos' ? (
        images.length === 0 ? (
          <EmptyState title="No photos shared here yet." />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={images}
            numColumns={3}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => renderGridItem(item)}
            onEndReached={() => loadMoreRoomImages(params.roomId)}
            onEndReachedThreshold={0.3}
          />
        )
      ) : null}

      {tab === 'videos' ? (
        videos.length === 0 ? (
          <EmptyState title="No videos shared here yet." />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={videos}
            numColumns={3}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => renderGridItem(item)}
            onEndReached={() => loadMoreRoomVideos(params.roomId)}
            onEndReachedThreshold={0.3}
          />
        )
      ) : null}

      {tab === 'links' ? (
        links.length === 0 ? (
          <EmptyState title="No links shared here yet." />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={links}
            keyExtractor={(l) => l.id}
            onEndReached={() => loadMoreRoomLinks(params.roomId)}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) => (
              <Pressable onPress={() => Linking.openURL(item.url)} style={styles.linkRow} accessibilityRole="link">
                <Ionicons name="link-outline" size={18} color={colors.cyan} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }} numberOfLines={1}>
                    {item.url}
                  </Text>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
                    {item.senderName} · {formatTime(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )
      ) : null}

      <Modal visible={!!viewingImage} transparent animationType="fade" onRequestClose={() => setViewingImage(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setViewingImage(null)}>
          {viewingImage ? <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>

      <Modal visible={!!playingVideo} transparent animationType="fade" onRequestClose={() => setPlayingVideo(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPlayingVideo(null)}>
          {playingVideo ? (
            <View style={styles.fullVideo}>
              <InlineVideoPlayer uri={playingVideo} playing muted={false} height={320} />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  cell: { width: '33.333%', aspectRatio: 1, padding: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: radius.sm },
  playBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.2)' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)' },
  fullImage: { width: '92%', height: '80%' },
  fullVideo: { width: '100%' },
});
