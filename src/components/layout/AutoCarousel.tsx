import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

interface AutoCarouselProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Time each page stays on screen before advancing. */
  intervalMs?: number;
  showDots?: boolean;
}

/**
 * Full-width paged carousel that advances on its own and loops. It holds still while the user
 * is dragging (and restarts the full interval after they let go) and while its screen is not
 * focused, so hidden tabs never keep a timer running.
 */
export function AutoCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  intervalMs = 4000,
  showDots = false,
}: AutoCarouselProps<T>) {
  const focused = useIsFocused();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const count = items.length;

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const next = e.nativeEvent.layout.width;
      if (next === width) return;
      setWidth(next);
      scrollRef.current?.scrollTo({ x: index * next, animated: false });
    },
    [width, index],
  );

  // The list can shrink under us (filters, refetch); never rest on a page that no longer exists.
  useEffect(() => {
    if (index >= count && count > 0) {
      setIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [count, index]);

  // Re-armed after every page change, so a manual swipe also gets a full interval before the next auto-advance.
  useEffect(() => {
    if (count < 2 || width === 0 || !focused || dragging) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % count;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [count, width, focused, dragging, index, intervalMs]);

  // The auto-advance tick changes `index` every few seconds. Memoizing the page elements means
  // that tick re-renders only the dots — React skips the (unchanged) cards.
  const pages = useMemo(
    () =>
      items.map((item, i) => (
        <View key={keyExtractor(item)} style={{ width }}>
          {renderItem(item, i)}
        </View>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, renderItem, width],
  );

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setDragging(false);
    if (width === 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(page, 0), count - 1));
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={onLayout}
        onScrollBeginDrag={() => setDragging(true)}
        onScrollEndDrag={() => setDragging(false)}
        onMomentumScrollEnd={settle}
      >
        {pages}
      </ScrollView>

      {showDots && count > 1 ? (
        <View style={styles.dotsRow}>
          {items.map((item, i) => (
            <View key={keyExtractor(item)} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  dot: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#00E5FF',
  },
});
