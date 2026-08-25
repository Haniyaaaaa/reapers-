import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Demo } from '../../types/demo';
import { fonts, radius, useTheme } from '../../theme';
import { formatDuration } from '../../utils/format';
import { BladeCard } from './BladeCard';

export function DemoCard({ demo, onPress }: { demo: Demo; onPress?: () => void }) {
  const { colors } = useTheme();
  const avg = ((demo.scores?.gameplay ?? 0) + (demo.scores?.art ?? 0) + (demo.scores?.polish ?? 0)) / 3;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={demo.title}>
      <BladeCard style={styles.card}>
        <Image source={{ uri: demo.thumbnail }} style={styles.image} accessibilityLabel={`${demo.title} thumbnail`} />
        <View style={[styles.tag, { backgroundColor: colors.overlay }]}>
          <Text style={[styles.tagText, { color: colors.text }]}>{formatDuration(demo.durationSec)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {demo.title}
          </Text>
          <Text style={[styles.dev, { color: colors.muted }]}>{demo.developerName}</Text>
          <View style={styles.bars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.seg,
                  { backgroundColor: colors.border },
                  i < Math.round(avg) && { backgroundColor: colors.magenta },
                ]}
              />
            ))}
          </View>
        </View>
      </BladeCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 228 },
  image: { width: '100%', height: 148 },
  tag: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontFamily: fonts.mono, fontSize: 11 },
  body: { padding: 14, gap: 6 },
  title: { fontFamily: fonts.displayMed, fontSize: 16 },
  dev: { fontFamily: fonts.body, fontSize: 12 },
  bars: { flexDirection: 'row', gap: 5, marginTop: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
});
