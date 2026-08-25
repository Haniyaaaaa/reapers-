import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import { VerifiedBadge } from '../../../components/avatars/VerifiedBadge';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { BladeCard } from '../../../components/cards/BladeCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { FilterChip } from '../../../components/inputs/FilterChip';
import { Screen } from '../../../components/layout/Screen';
import { experts } from '../../../data/mock';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { fonts, radius, useTheme } from '../../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'ExpertsTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const TAGS = ['All', 'Systems', 'Live ops', 'Shaders', 'VFX'];

export function ExpertDirectoryScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const { phase } = useFakeLoad();
  const [tag, setTag] = useState('All');
  const list = useMemo(
    () => experts.filter((e) => tag === 'All' || e.specialties.includes(tag)),
    [tag],
  );

  return (
    <Screen>
      <Text style={[styles.h, { color: colors.text }]}>Experts</Text>
      <View style={styles.chips}>
        {TAGS.map((t) => (
          <FilterChip key={t} label={t} selected={tag === t} onPress={() => setTag(t)} />
        ))}
      </View>
      {phase === 'loading' ? <Skeleton width="100%" height={120} /> : null}
      {phase === 'ready' && list.length === 0 ? <EmptyState title="No experts match that specialty." /> : null}
      {phase === 'ready'
        ? list.map((e) => (
            <Pressable key={e.id} onPress={() => nav.navigate('ExpertProfile', { id: e.id })} accessibilityRole="button" accessibilityLabel={e.name}>
              <BladeCard style={styles.card}>
                <View style={styles.row}>
                  <AvatarRing name={e.name} size={56} avatarId={e.id === 'x1' ? 'queen-ace' : 'pixel-mage'} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.text }]}>{e.name}</Text>
                      {e.verified ? <VerifiedBadge /> : null}
                    </View>
                    <Text style={[styles.muted, { color: colors.muted }]}>
                      {e.role} · {e.company}
                    </Text>
                    <Text style={[styles.tags, { color: colors.cyan }]}>{e.specialties.join(' · ')}</Text>
                    <Text style={[styles.next, { color: colors.muted }]}>Next: {e.nextSlot}</Text>
                  </View>
                </View>
                <Pressable onPress={() => nav.navigate('ExpertProfile', { id: e.id })} style={[styles.book, { backgroundColor: colors.magenta }]} accessibilityRole="button">
                  <Text style={[styles.bookText, { color: colors.onPrimary }]}>Book</Text>
                </Pressable>
              </BladeCard>
            </Pressable>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.display, fontSize: 28, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  card: { padding: 16, marginBottom: 14, gap: 12 },
  row: { flexDirection: 'row', gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.bodySemi, fontSize: 16 },
  muted: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  tags: { fontFamily: fonts.mono, fontSize: 11, marginTop: 6 },
  next: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  book: {
    alignSelf: 'flex-end',
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  bookText: { fontFamily: fonts.bodySemi },
});
