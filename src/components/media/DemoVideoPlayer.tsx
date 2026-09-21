import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

/** Inline demo video with play/pause driven by the parent, and tap-to-fullscreen. Playback state
 * is reported back (playingChange) so pausing from the fullscreen controls or the video ending
 * keeps the parent's Play/Pause button honest. */
export function DemoVideoPlayer({
  uri,
  playing,
  onPlayingChange,
  height = 280,
}: {
  uri: string;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  height?: number;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  const viewRef = useRef<VideoView>(null);
  // Controls (scrub, pause, exit) only while full screen; the inline view stays clean.
  const [fullscreen, setFullscreen] = useState(false);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  // Report the player changing state on its own (e.g. pausing from the fullscreen controls). The
  // first run is skipped: a freshly mounted player is not playing yet, and reporting that would
  // immediately flip the parent's `playing` back to false — which is exactly why the first tap
  // on "Play demo" mounted the video but never started it.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (isPlaying !== playing) onPlayingChange(isPlaying);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  return (
    <View style={[styles.wrap, { height }]}>
      <VideoView
        ref={viewRef}
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={fullscreen}
        onFullscreenEnter={() => setFullscreen(true)}
        onFullscreenExit={() => setFullscreen(false)}
      />
      {/* Tap anywhere on the video for full screen */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => viewRef.current?.enterFullscreen()}
        accessibilityRole="button"
        accessibilityLabel="Watch full screen"
      />
      <View style={styles.expandBadge} pointerEvents="none">
        <Ionicons name="expand" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: '#000000', overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  expandBadge: { position: 'absolute', right: 12, bottom: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
