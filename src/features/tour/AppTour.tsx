import { useCallback, useEffect, useRef } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../../navigation/navigationRef';
import { hasSeenTour, markTourSeen } from '../../services/tourStorage';
import { useTourStore } from '../../store/tourStore';
import { GlassSurface } from '../../components/glass/GlassSurface';
import { fonts } from '../../theme';
import type { User } from '../../types/user';
import { TOUR_STEPS, type TourTarget } from './tourSteps';

/** Delay before the first-run tour appears, so Home has painted and the moment feels intentional. */
const AUTO_START_DELAY_MS = 1400;
/** The tab bar's cube rises above the bar; this much extra height stays undimmed so it stays bright. */
const CUBE_OVERHANG = 48;
/** Tab slots sit on a fixed grid centred on the screen (spacing measured from the real tab bar). */
const SLOT_SPACING = 0.178;

// Calm palette: soft aqua + lavender accents and a muted blue-to-violet gradient for buttons and
// the icon, instead of the app's neon cyan/magenta — the tour should feel gentle, not loud.
const ACCENT = '#8FD9E6';
const ACCENT_2 = '#B49CF5';
const SOFT_GRADIENT: [string, string, string] = ['#3F73E8', '#5B5BE6', '#7D5AE0'];

function goTo(target: TourTarget) {
  if (!navigationRef.isReady()) return;
  if (target.kind === 'tab') {
    navigationRef.navigate('Main', { screen: 'Tabs', params: { screen: target.tab } });
  } else if (target.screen === 'Profile') {
    navigationRef.navigate('Main', { screen: 'Profile', params: {} });
  } else {
    navigationRef.navigate('Main', { screen: target.screen });
  }
}

/** Guided first-run tour. It sits above the whole app and walks the person through each main screen:
 * every "Next" navigates to the next screen for real, the screen behind is dimmed, and the tab bar
 * stays bright with an arrow to the tab being introduced. Skipping OR finishing remembers it on this
 * device, so it never comes back on its own; "Replay app tour" in Settings can start it again. */
export function AppTour({ enabled, autoStart = true, user }: { enabled: boolean; autoStart?: boolean; user: User | null }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const active = useTourStore((s) => s.active);
  const step = useTourStore((s) => s.step);
  const userId = user?.id;

  // First run: everyone sees the tour once — new sign-ups and existing members alike (this is how the
  // new version introduces itself). Finishing or skipping saves a per-account flag, so it never
  // comes back on its own; "Replay" in Settings can start it again.
  useEffect(() => {
    if (!enabled || !autoStart || !userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      if (await hasSeenTour(userId)) return;
      if (cancelled) return;
      timer = setTimeout(() => {
        if (!cancelled) useTourStore.getState().start();
      }, AUTO_START_DELAY_MS);
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, autoStart, userId]);

  // Leaving the app (sign-out, etc.) mid-tour ends it.
  useEffect(() => {
    if (!enabled && active) useTourStore.getState().stop();
  }, [enabled, active]);

  // Take the app to the screen this step is about.
  useEffect(() => {
    if (active) goTo(TOUR_STEPS[step].target);
  }, [active, step]);

  const finish = useCallback(() => {
    if (userId) markTourSeen(userId);
    useTourStore.getState().stop();
    goTo({ kind: 'tab', tab: 'HomeTab', slot: 2 });
  }, [userId]);

  const next = useCallback(() => {
    const s = useTourStore.getState().step;
    if (s >= TOUR_STEPS.length - 1) finish();
    else useTourStore.getState().setStep(s + 1);
  }, [finish]);

  const back = useCallback(() => {
    const s = useTourStore.getState().step;
    if (s > 0) useTourStore.getState().setStep(s - 1);
  }, []);

  // Android back button steps back through the tour instead of leaving the screen underneath.
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (useTourStore.getState().step > 0) back();
      else finish();
      return true;
    });
    return () => sub.remove();
  }, [active, back, finish]);

  // Animations: backdrop fades in with the tour; the card eases in on every step; the icon breathes.
  const fade = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      fade.setValue(0);
      return;
    }
    Animated.timing(fade, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, fade, pulse]);

  useEffect(() => {
    if (!active) return;
    cardIn.setValue(0);
    Animated.timing(cardIn, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [active, step, cardIn]);

  if (!enabled || !active) return null;

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const brightZone = 64 + Math.max(insets.bottom, 12) + CUBE_OVERHANG;
  const arrowX = current.target.kind === 'tab' ? width * (0.5 + (current.target.slot - 2) * SLOT_SPACING) : null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Swallows every touch so nothing underneath can be tapped mid-tour. */}
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} />

      {/* Dim the screen being introduced, fading out just above the tab bar so the bar stays bright. */}
      <Animated.View pointerEvents="none" style={[styles.dim, { bottom: brightZone, opacity: fade }]}>
        <LinearGradient
          colors={['rgba(5, 8, 18, 0.12)', 'rgba(5, 8, 18, 0.22)', 'rgba(5, 8, 18, 0)']}
          locations={[0, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.cardWrap,
          {
            bottom: brightZone + 6,
            opacity: cardIn,
            transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <View style={styles.cardGlow}>
          <GlassSurface radius={22}>
            <View style={styles.cardInner}>
              {/* Header: icon, kicker, counter, skip */}
              <View style={styles.headerRow}>
                <View style={styles.iconWrap}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.iconHalo,
                      {
                        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] }),
                        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
                      },
                    ]}
                  />
                  <LinearGradient colors={SOFT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
                    <Ionicons name={current.icon} size={19} color="#FFFFFF" />
                  </LinearGradient>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>{current.kicker}</Text>
                  <Text style={styles.counter}>
                    STEP {step + 1} OF {TOUR_STEPS.length}
                  </Text>
                </View>

                {!isLast ? (
                  <Pressable onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip the tour">
                    <Text style={styles.skip}>Skip</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.title}>{current.title}</Text>
              <Text style={styles.body}>{current.body}</Text>

              {/* Progress */}
              <View style={styles.segments} accessibilityLabel={`Step ${step + 1} of ${TOUR_STEPS.length}`}>
                {TOUR_STEPS.map((s, i) => (
                  <View
                    key={s.key}
                    style={[styles.segment, i < step && styles.segmentDone, i === step && styles.segmentCurrent]}
                  />
                ))}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {!isFirst ? (
                  <Pressable onPress={back} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Previous step">
                    <View style={[styles.btnCut, styles.ghostBtn]}>
                      <Ionicons name="arrow-back" size={15} color="#F2F5FF" />
                    </View>
                  </Pressable>
                ) : null}

                <Pressable onPress={next} style={styles.nextBtn} accessibilityRole="button" accessibilityLabel={isLast ? 'Finish the tour' : 'Next step'}>
                  <LinearGradient colors={SOFT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.btnCut, styles.btnInner, styles.nextFill]}>
                    <Text style={styles.nextText}>{isLast ? "LET'S GO" : isFirst ? 'START TOUR' : 'NEXT'}</Text>
                    {!isLast ? <Ionicons name="arrow-forward" size={15} color="#F2F5FF" style={{ marginLeft: 6 }} /> : null}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </GlassSurface>
        </View>

        {/* Arrow pointing down at the tab being introduced */}
        {arrowX !== null ? (
          <View style={styles.arrowRow} pointerEvents="none">
            <View style={[styles.arrow, { left: arrowX - 9 - 16 }]} />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, elevation: 999 },
  dim: { position: 'absolute', top: 0, left: 0, right: 0 },
  cardWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16 },
  cardGlow: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  cardInner: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  iconHalo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT_2 },
  iconBox: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  kicker: { fontFamily: fonts.monoBold, fontSize: 10.5, letterSpacing: 1.4, color: ACCENT },
  counter: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.8, color: '#7E8BA6', marginTop: 1 },
  skip: { fontFamily: fonts.bodyMed, fontSize: 13, color: '#8391AB' },
  title: { fontFamily: fonts.display, fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 3, letterSpacing: 0.2 },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: '#D3DBEC', marginBottom: 10 },
  segments: { flexDirection: 'row', gap: 3, marginBottom: 10 },
  segment: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  segmentDone: { backgroundColor: 'rgba(143, 217, 230, 0.85)' },
  segmentCurrent: { backgroundColor: ACCENT_2 },
  actions: { flexDirection: 'row', gap: 8 },
  backBtn: { width: 44, height: 40 },
  nextBtn: { flex: 1, height: 40 },
  btnCut: { width: '100%', height: '100%', borderRadius: 13, overflow: 'hidden' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ghostBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  nextFill: { opacity: 0.95 },
  nextText: { fontFamily: fonts.display, fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#F2F5FF' },
  arrowRow: { height: 12 },
  arrow: {
    position: 'absolute',
    top: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ACCENT,
  },
});
