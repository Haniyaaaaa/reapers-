import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';

/** Full-screen image viewer: swipe sideways between images, tap X (or the Android back button) to close. */
export function ImageViewerModal({ urls, startIndex, onClose }: { urls: string[]; startIndex: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = startIndex != null;
  const [index, setIndex] = useState(startIndex ?? 0);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (startIndex != null) setIndex(startIndex);
  }, [startIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {visible ? (
          <FlatList
            ref={listRef}
            data={urls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u) => u}
            initialScrollIndex={Math.min(startIndex ?? 0, Math.max(0, urls.length - 1))}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Pressable style={{ width, height }} onPress={onClose} accessibilityLabel="Close image">
                <Image source={{ uri: item }} style={{ width, height }} resizeMode="contain" />
              </Pressable>
            )}
          />
        ) : null}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        {urls.length > 1 ? (
          <View style={[styles.counter, { bottom: insets.bottom + 24 }]}>
            <Text style={styles.counterText}>{index + 1} / {urls.length}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  closeBtn: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  counterText: { fontFamily: fonts.mono, fontSize: 12, color: '#FFFFFF' },
});
