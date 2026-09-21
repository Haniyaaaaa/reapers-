import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, ScrollViewProps, TextInput, View } from 'react-native';
import { useKeyboard } from '../../hooks/useKeyboard';

/** ScrollView that keeps the focused input visible above the keyboard.
 *
 * Why this exists: with Android edge-to-edge (the default since Expo SDK 54) the window is NOT
 * resized when the keyboard opens, so the keyboard simply covers the bottom of the screen and
 * fields near it (a Bio box, a description...) end up hidden while typing. This adds keyboard-
 * height space under the content and scrolls the active field into view, following focus as
 * you move between fields and as a multiline field grows. iOS and horizontal scrollers get the
 * plain ScrollView (iOS screens already use KeyboardAvoidingView / native insets). */
export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(function KeyboardAwareScrollView(props, ref) {
  if (props.horizontal || Platform.OS !== 'android') {
    return <ScrollView ref={ref} keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'} {...props} />;
  }
  return <AndroidKeyboardAwareScrollView {...props} forwardedRef={ref} />;
});

const MARGIN = 24;

function AndroidKeyboardAwareScrollView({
  forwardedRef,
  children,
  onScroll,
  onContentSizeChange,
  ...rest
}: ScrollViewProps & { forwardedRef: React.ForwardedRef<ScrollView> }) {
  const scrollRef = useRef<ScrollView>(null);
  useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);
  const scrollY = useRef(0);
  const lastRevealed = useRef<unknown>(null);
  const { height: kbHeight, top: kbTop } = useKeyboard();
  const kbTopRef = useRef<number | null>(null);
  kbTopRef.current = kbTop;

  const reveal = useCallback(() => {
    const top = kbTopRef.current;
    const input = TextInput.State.currentlyFocusedInput?.();
    const sv = scrollRef.current;
    if (top == null || !input || !sv) return;
    // ScrollView's ref is a host instance at runtime (so it has measureInWindow) but its type omits it.
    const host = sv as unknown as { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };
    host.measureInWindow((_sx, sy, _sw, sh) => {
      input.measureInWindow((_x, y, _w, h) => {
        // Only react to inputs that live inside this scroll view.
        if (y + h < sy || y > sy + sh) return;
        const overlap = y + h + MARGIN - top;
        if (overlap > 0) sv.scrollTo({ y: scrollY.current + overlap, animated: true });
      });
    });
  }, []);

  // When the keyboard opens, reveal after the spacer below has laid out.
  useEffect(() => {
    if (kbTop == null) {
      lastRevealed.current = null;
      return;
    }
    const t = setTimeout(() => {
      lastRevealed.current = TextInput.State.currentlyFocusedInput?.() ?? null;
      reveal();
    }, 120);
    return () => clearTimeout(t);
  }, [kbTop, reveal]);

  // Tapping from one field to another doesn't re-open the keyboard, so there's no event for it —
  // watch which input has focus while the keyboard is up and reveal it when it changes.
  useEffect(() => {
    if (kbTop == null) return;
    const id = setInterval(() => {
      const current = TextInput.State.currentlyFocusedInput?.() ?? null;
      if (current && current !== lastRevealed.current) {
        lastRevealed.current = current;
        reveal();
      }
    }, 250);
    return () => clearInterval(id);
  }, [kbTop, reveal]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...rest}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      onContentSizeChange={(w, h) => {
        onContentSizeChange?.(w, h);
        // A multiline field growing pushes the caret line down — keep it visible.
        if (kbTopRef.current != null) reveal();
      }}
    >
      {children}
      {kbHeight > 0 ? <View style={{ height: kbHeight }} /> : null}
    </ScrollView>
  );
}
