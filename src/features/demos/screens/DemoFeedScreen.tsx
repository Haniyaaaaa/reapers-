import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import { BladeCard } from '../../../components/cards/BladeCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { FilterChip } from '../../../components/inputs/FilterChip';
import { Screen } from '../../../components/layout/Screen';
import { useAuth } from '../../../hooks/useAuth';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import { formatDuration } from '../../../utils/format';
import { Ionicons } from '@expo/vector-icons';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'DemosTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const FILTERS = ['For You', 'New', 'Top Rated', 'Jam Entries'];

export function DemoFeedScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const { isDeveloper } = useAuth();
  const { phase } = useFakeLoad();
  const demos = useCommunityStore((s) => s.demos);
  const [filter, setFilter] = useState('For You');

  const list = useMemo(() => {
    if (filter === 'New') return [...demos].reverse();
    if (filter === 'Top Rated')
      return [...demos].sort((a, b) => b.scores.gameplay + b.scores.art - (a.scores.gameplay + a.scores.art));
    if (filter === 'Jam Entries') return demos.filter((d) => d.genre === 'Action' || d.title.toLowerCase().includes('jam'));
    return demos;
  }, [demos, filter]);

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={[styles.h, { color: colors.text }]}>Demos</Text>
        {isDeveloper ? (
          <Pressable onPress={() => nav.navigate('DemoUpload')} style={[styles.fab, { backgroundColor: colors.magenta }]} accessibilityRole="button" accessibilityLabel="Upload demo">
            <Ionicons name="cloud-upload" size={18} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <FilterChip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      {phase === 'loading' ? <Skeleton width="100%" height={220} /> : null}
      {phase === 'ready' && list.length === 0 ? <EmptyState title="No demos for this filter." /> : null}
      {phase === 'ready'
        ? list.map((d) => {
            return (
              <BladeCard key={d.id} style={styles.card}>
                <Pressable onPress={() => nav.navigate('DemoDetail', { id: d.id })} accessibilityRole="button" accessibilityLabel={d.title}>
                  <Image source={{ uri: d.thumbnail }} style={styles.thumb} />
                  <View style={styles.overlay} pointerEvents="none">
                    <Ionicons name="play" size={28} color={colors.text} />
                    <Text style={[styles.tag, { color: colors.text, backgroundColor: colors.overlay }]}>{formatDuration(d.durationSec)}</Text>
                  </View>
                </Pressable>
                <View style={styles.body}>
                  <Pressable onPress={() => nav.navigate('DemoDetail', { id: d.id })}>
                    <Text style={[styles.title, { color: colors.text }]}>{d.title}</Text>
                  </Pressable>
                  <Text style={[styles.genre, { color: colors.cyan }]}>{d.genre}</Text>
                  <Text style={[styles.excerpt, { color: colors.muted }]} numberOfLines={2}>
                    {d.description}
                  </Text>
                  <View style={styles.bars}>
                    {(['gameplay', 'art', 'polish'] as const).map((k) => (
                      <View key={k} style={styles.barWrap}>
                        <Text style={[styles.barLabel, { color: colors.muted2 }]}>{k}</Text>
                        <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                          <View style={[styles.barFill, { width: `${((d.scores?.[k] ?? 0) / 5) * 100}%`, backgroundColor: colors.magenta }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.dev, { color: colors.muted }]}>{d.developerName}</Text>
                  <Pressable onPress={() => nav.navigate('DemoDetail', { id: d.id })} style={styles.review} accessibilityRole="button">
                    <Text style={[styles.reviewText, { color: colors.cyan }]}>Review</Text>
                  </Pressable>
                </View>
              </BladeCard>
            );
          })
        : null}
      {phase === 'ready' && list.length > 0 ? <Text style={[styles.end, { color: colors.muted2 }]}>End of feed</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  h: { fontFamily: fonts.display, fontSize: 28 },
  fab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  card: { marginBottom: 18 },
  thumb: { width: '100%', height: 180 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,15,28,0.28)',
  },
  tag: { fontFamily: fonts.mono, marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  body: { padding: 16, gap: 8 },
  title: { fontFamily: fonts.displayMed, fontSize: 18 },
  genre: { fontFamily: fonts.mono, fontSize: 11 },
  excerpt: { fontFamily: fonts.body },
  bars: { gap: 4, marginTop: 6 },
  barWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 70, fontFamily: fonts.mono, fontSize: 10 },
  barBg: { flex: 1, height: 4, borderRadius: 2 },
  barFill: { height: 4, borderRadius: 2 },
  dev: { fontFamily: fonts.bodyMed, fontSize: 12 },
  review: { minHeight: 44, justifyContent: 'center' },
  reviewText: { fontFamily: fonts.bodySemi },
  end: { fontFamily: fonts.mono, textAlign: 'center', marginVertical: 16 },
});
