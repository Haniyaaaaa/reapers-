import { useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { fonts, useTheme } from '../../theme';

const GAP = 12;
const PEEK = 0.88; // each card takes 88% of the width, so the next one peeks in
const AUTOPLAY_MS = 3500;

/** Snapping screenshot slider: 16:9 cards with the next one peeking in, a "1 / N" counter, an
 * expand hint and a dot rail. It advances by itself and loops; it holds still while the user is
 * dragging, while `paused` (e.g. the full-size viewer is open) and while its screen isn't focused.
 * Tapping a card opens it full size. */
export function ScreenshotCarousel({ urls, onOpen, paused = false }: { urls: string[]; onOpen: (index: number) => void; paused?: boolean }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const focused = useIsFocused();
  const ref = useRef<ScrollView>(null);

  const cardWidth = urls.length > 1 ? Math.round(width * PEEK) : width;
  const cardHeight = Math.round((cardWidth * 9) / 16);
  const step = cardWidth + GAP;

  // Re-armed after every page change, so a manual swipe also gets a full interval before the next advance.
  useEffect(() => {
    if (urls.length < 2 || step <= 0 || paused || dragging || !focused) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % urls.length;
      ref.current?.scrollTo({ x: next * step, animated: true });
      setIndex(next);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [urls.length, step, paused, dragging, focused, index]);

  // Programmatic (autoplay) scrolls set the index themselves; tracking their in-between offsets
  // would flicker the dots back to the old page, so only user drags/momentum are read here.
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (step <= 0) return;
    setIndex(Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.x / step), 0), urls.length - 1));
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (step <= 0 || !dragging) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / step);
    setIndex((prev) => (prev === next ? prev : Math.min(Math.max(next, 0), urls.length - 1)));
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.wrap}>
      {width > 0 ? (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={() => setDragging(true)}
          onScrollEndDrag={(e) => {
            setDragging(false);
            settle(e);
          }}
          onMomentumScrollEnd={settle}
          contentContainerStyle={{ gap: GAP }}
        >
          {urls.map((url, i) => (
            <Pressable
              key={url}
              onPress={() => onOpen(i)}
              accessibilityRole="button"
              accessibilityLabel={`View screenshot ${i + 1} of ${urls.length} full size`}
              style={[styles.card, { width: cardWidth, height: cardHeight, borderColor: i === index ? 'rgba(0, 229, 255, 0.55)' : colors.cardBorder }]}
            >
              <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
              <LinearGradient colors={['rgba(9,15,28,0.55)', 'transparent']} style={styles.topShade} pointerEvents="none" />
              <LinearGradient colors={['transparent', 'rgba(9,15,28,0.65)']} style={styles.bottomShade} pointerEvents="none" />
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {i + 1} / {urls.length}
                </Text>
              </View>
              <View style={styles.expand}>
                <Ionicons name="expand-outline" size={15} color="#FFFFFF" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {urls.length > 1 ? (
        <View style={styles.dots}>
          {urls.map((url, i) => (
            <View key={url} style={[styles.dot, i === index && styles.dotActive, i === index && { backgroundColor: colors.cyan }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#0E1423',
  },
  image: { width: '100%', height: '100%' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 56 },
  counter: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(9, 15, 28, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  counterText: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.8, color: '#FFFFFF' },
  expand: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 15, 28, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  dotActive: { width: 22 },
});
