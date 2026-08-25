import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { experts } from '../../../data/mock';
import { callClient } from '../../../services/video/callClient';
import { colors, fonts, radius } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';

export function VideoCallScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'VideoCall'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const expert = experts.find((e) => e.id === params.id);
  const [phase, setPhase] = useState<'connecting' | 'incall' | 'reconnecting' | 'ended'>('connecting');
  const [seconds, setSeconds] = useState(10 * 60);
  const [muted, setMuted] = useState(false);
  const [cam, setCam] = useState(true);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setPhase('incall'), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'incall') return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setPhase('ended');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const warn = phase === 'incall' && seconds <= 60;

  if (phase === 'ended') {
    return (
      <Screen footerPad={false}>
        <Text style={styles.h}>How was the session?</Text>
        <Text style={styles.muted}>{expert?.name}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setStars(n)} style={styles.star} accessibilityRole="button">
              <Text style={{ color: n <= stars ? colors.magenta : colors.muted2, fontSize: 28 }}>★</Text>
            </Pressable>
          ))}
        </View>
        <AuthTextField label="Comment (optional)" value={comment} onChangeText={setComment} multiline />
        <PrimaryButton
          label="Submit rating"
          onPress={async () => {
            await callClient.leave();
            nav.popToTop();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} footerPad={false}>
      <View style={styles.remote}>
        <Text style={styles.feed}>{expert?.name ?? 'Expert'}</Text>
        <Text style={styles.timer}>
          {mm}:{ss}
        </Text>
        {phase === 'connecting' ? <Text style={styles.muted}>Connecting…</Text> : null}
        {phase === 'reconnecting' ? <Text style={styles.warn}>Reconnecting…</Text> : null}
        {warn ? <Text style={styles.warn}>1 minute remaining</Text> : null}
      </View>
      <View style={styles.local}>
        <Text style={styles.feed}>{cam ? 'You' : 'Camera off'}</Text>
      </View>
      <View style={styles.bar}>
        <Pressable onPress={() => setMuted((v) => !v)} style={styles.ctrl} accessibilityRole="button" accessibilityLabel="Mute">
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setCam((v) => !v)} style={styles.ctrl} accessibilityRole="button" accessibilityLabel="Toggle camera">
          <Ionicons name={cam ? 'videocam' : 'videocam-off'} size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setPhase(phase === 'incall' ? 'reconnecting' : 'incall')} style={styles.ctrl} accessibilityRole="button">
          <Ionicons name="wifi" size={22} color={colors.cyan} />
        </Pressable>
        <Pressable onPress={() => setPhase('ended')} style={[styles.ctrl, styles.end]} accessibilityRole="button" accessibilityLabel="End call">
          <Ionicons name="call" size={22} color={colors.text} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { color: colors.text, fontFamily: fonts.display, fontSize: 24, marginTop: 24 },
  muted: { color: colors.muted, fontFamily: fonts.body, marginTop: 8 },
  warn: { color: colors.warning, fontFamily: fonts.bodyMed, marginTop: 8 },
  remote: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  local: { height: 120, backgroundColor: colors.navy, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  feed: { color: colors.text, fontFamily: fonts.displayMed, fontSize: 18 },
  timer: { color: colors.cyan, fontFamily: fonts.monoBold, fontSize: 28, marginTop: 8 },
  bar: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  ctrl: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  end: { backgroundColor: colors.danger },
  stars: { flexDirection: 'row', marginVertical: 12 },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
