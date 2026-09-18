import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { DemoCard } from '../../../components/cards/DemoCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useDemoStore } from '../../../store/demoStore';
import { DATE_BUCKETS, matchesDateBucket, type DateBucket } from '../../../utils/dateFilters';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.chipTouch}>
      <CyberCutBox
        gradient={active}
        cutSize={6}
        radius={4}
        fill={active ? undefined : colors.cardFill}
        borderColor={active ? undefined : colors.cardBorder}
        borderWidth={active ? 0 : 0.88}
        style={styles.chipCut}
      >
        <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.muted }, active && styles.chipTextActive]}>{label}</Text>
      </CyberCutBox>
    </Pressable>
  );
}

/** Every demo you've uploaded — reachable from the profile screen's quick links. Reuses the
 * same fetchDemosByDeveloper the profile screen's own (space-constrained) Portfolio Demos
 * section already relies on, just always visible (with a real empty state + upload CTA)
 * instead of only rendering when there's at least one demo. */
export function MyDemosScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const demos = useDemoStore((s) => s.demos);
  const fetchDemosByDeveloper = useDemoStore((s) => s.fetchDemosByDeveloper);

  const [genreFilter, setGenreFilter] = useState('ALL');
  const [dateBucket, setDateBucket] = useState<DateBucket>('ALL');

  const myDemos = useMemo(() => demos.filter((d) => d.developerId === user?.id), [demos, user?.id]);
  const genres = useMemo(() => ['ALL', ...Array.from(new Set(myDemos.map((d) => d.genre).filter(Boolean)))], [myDemos]);

  const filtered = useMemo(
    () =>
      myDemos.filter(
        (d) => (genreFilter === 'ALL' || d.genre === genreFilter) && matchesDateBucket(d.createdAt, dateBucket),
      ),
    [myDemos, genreFilter, dateBucket],
  );

  const totals = useMemo(
    () => ({
      demos: myDemos.length,
      plays: myDemos.reduce((sum, d) => sum + (d.playCount ?? 0), 0),
      reviews: myDemos.reduce((sum, d) => sum + d.reviewCount, 0),
    }),
    [myDemos],
  );

  useEffect(() => {
    if (user) fetchDemosByDeveloper(user.id);
  }, [user, fetchDemosByDeveloper]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchDemosByDeveloper(user.id);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CyberBackground showArtwork={false} />
      <Screen refreshControl={refreshControl}>
        <ScreenHeader title="My Demos" onBack={() => nav.goBack()} />

        {myDemos.length === 0 ? (
          <EmptyState title="You haven't uploaded any demos yet." actionLabel="Upload Demo" onAction={() => nav.navigate('DemoUpload')} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
                <View style={styles.statInner}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{totals.demos}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>DEMOS</Text>
                </View>
              </CyberCutBox>
              <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
                <View style={styles.statInner}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{totals.plays}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>PLAYS</Text>
                </View>
              </CyberCutBox>
              <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statTile}>
                <View style={styles.statInner}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{totals.reviews}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>REVIEWS</Text>
                </View>
              </CyberCutBox>
            </View>

            {genres.length > 2 ? (
              <>
                <Text style={[styles.filterLabel, { color: colors.muted }]}>GENRE</Text>
                <View style={styles.chipRow}>
                  {genres.map((g) => (
                    <Chip key={g} label={g.toUpperCase()} active={genreFilter === g} onPress={() => setGenreFilter(g)} />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.filterLabel, { color: colors.muted }]}>UPLOADED</Text>
            <View style={styles.chipRow}>
              {DATE_BUCKETS.map((b) => (
                <Chip key={b} label={b} active={dateBucket === b} onPress={() => setDateBucket(b)} />
              ))}
            </View>

            <LinearGradient
              colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.divider}
            />

            {filtered.length === 0 ? (
              <EmptyState title="No demos match these filters." />
            ) : (
              <View style={{ gap: 12 }}>
                {filtered.map((d) => (
                  <DemoCard key={d.id} demo={d} onPress={() => nav.navigate('DemoDetail', { id: d.id })} />
                ))}
              </View>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statTile: { flex: 1, height: 62 },
  statInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  statNum: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.6, color: '#8E9BB5', marginTop: 2 },
  filterLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: '#8E9BB5', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chipTouch: { minWidth: 72 },
  chipCut: { height: 32, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5, color: '#8E9BB5' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  divider: { height: 2, borderRadius: 1, width: '100%', marginBottom: 18 },
});
