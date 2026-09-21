import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { fonts, useTheme } from '../../theme';

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** A sent voice message's play/pause control — its own component (not inline in the message
 * list) because `useAudioPlayer` must be one instance per clip, not one shared across the
 * whole thread. */
export function VoiceMessageBubble({ uri, fallbackDurationSec, tint }: { uri: string; fallbackDurationSec?: number; tint: string }) {
  const { colors } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || fallbackDurationSec || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= duration) player.seekTo(0);
      player.play();
    }
  };

  return (
    <Pressable onPress={toggle} style={styles.wrap} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'}>
      <View style={[styles.playBtn, { backgroundColor: tint }]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color="#FFFFFF" style={!status.playing ? { marginLeft: 2 } : undefined} />
      </View>
      <View style={styles.trackCol}>
        <View style={[styles.track, { backgroundColor: colors.cardBorder }]}>
          <View style={[styles.trackFill, { backgroundColor: tint, width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.durationText, { color: colors.muted }]}>{formatDuration(status.playing || status.currentTime > 0 ? status.currentTime : duration)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 180, paddingVertical: 2 },
  playBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  trackCol: { flex: 1, gap: 4 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2 },
  durationText: { fontFamily: fonts.mono, fontSize: 10 },
});
