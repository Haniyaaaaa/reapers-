import { useVideoPlayer, VideoView } from 'expo-video';
import { createElement, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

type Props = {
  uri: string;
  playing: boolean;
  muted: boolean;
  height?: number;
};

function WebPlayer({ uri, playing, muted, height = 180 }: Props) {
  return (
    <View style={[styles.wrap, { height }]}>
      {/* web-only host element */}
      {createElement('video', {
        src: uri,
        autoPlay: playing,
        muted,
        loop: true,
        playsInline: true,
        style: { width: '100%', height, objectFit: 'cover' },
      })}
    </View>
  );
}

function NativePlayer({ uri, playing, muted, height = 180 }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return (
    <View style={[styles.wrap, { height }]}>
      <VideoView player={player} style={[styles.video, { height }]} contentFit="cover" nativeControls={false} />
    </View>
  );
}

export function InlineVideoPlayer(props: Props) {
  if (Platform.OS === 'web') return <WebPlayer {...props} />;
  return <NativePlayer {...props} />;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: colors.navy, overflow: 'hidden' },
  video: { width: '100%' },
});
