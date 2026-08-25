import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { CommunityRow } from '../../../components/cards/CommunityRow';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { SearchBar } from '../../../components/inputs/SearchBar';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, useTheme } from '../../../theme';

export function CommunitiesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { phase } = useFakeLoad();
  const communities = useCommunityStore((s) => s.communities);
  const joinCommunity = useCommunityStore((s) => s.joinCommunity);
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);

  const filtered = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    return communities.filter(
      (c) =>
        !needle ||
        c.shortName.toLowerCase().includes(needle) ||
        c.name.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle),
    );
  }, [communities, dq]);

  const yours = filtered.filter((c) => c.joined);
  const discover = filtered.filter((c) => !c.joined);

  return (
    <Screen>
      <ScreenHeader title="Communities" onBack={() => nav.goBack()} />
      <Text style={[styles.lead, { color: colors.muted }]}>Official orgs are already here — join to open their chatroom.</Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="CEGA, PGDA, IGDA…" />

      {phase === 'loading' ? (
        <View style={{ gap: 10, marginTop: 12 }}>
          <Skeleton width="100%" height={72} />
          <Skeleton width="100%" height={72} />
        </View>
      ) : null}

      {phase === 'ready' && filtered.length === 0 ? (
        <EmptyState title="No communities match that search." actionLabel="Clear search" onAction={() => setQ('')} />
      ) : null}

      {phase === 'ready' && filtered.length > 0 ? (
        <>
          {yours.length > 0 ? <SectionHeader title="Your communities" /> : null}
          <View style={styles.list}>
            {yours.map((c) => (
              <CommunityRow
                key={c.id}
                community={c}
                onPress={() => nav.navigate('CommunityDetail', { id: c.id })}
                onJoin={() => nav.navigate('CommunityDetail', { id: c.id })}
              />
            ))}
          </View>
          {discover.length > 0 ? <SectionHeader title="Discover" /> : null}
          <View style={styles.list}>
            {discover.map((c) => (
              <CommunityRow
                key={c.id}
                community={c}
                onPress={() => nav.navigate('CommunityDetail', { id: c.id })}
                onJoin={() => {
                  joinCommunity(c.id);
                  nav.navigate('CommunityDetail', { id: c.id });
                }}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.body, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  list: { gap: 10, marginBottom: 8 },
});
