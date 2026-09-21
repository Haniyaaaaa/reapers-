import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.9;

/** Drag-down-to-close for bottom sheets. Attach `panHandlers` to the sheet's grabber/header (not
 * the scrolling body, so it never fights a ScrollView) and apply `sheetStyle` to the sheet. A
 * short drag springs back; a long or fast one slides the sheet off and calls `onClose`. */
export function useSwipeToDismiss(visible: boolean, onClose: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          // Only follow downward drags; upward pulls are ignored.
          translateY.setValue(Math.max(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            Animated.timing(translateY, { toValue: 700, duration: 160, useNativeDriver: true }).start(() => onCloseRef.current());
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [translateY],
  );

  return { panHandlers: panResponder.panHandlers, sheetStyle: { transform: [{ translateY }] } };
}
