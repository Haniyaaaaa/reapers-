import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { BladeCard } from '../../../components/cards/BladeCard';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { ConnectButton } from '../../../components/buttons/ConnectButton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { FilterChip } from '../../../components/inputs/FilterChip';
import { SearchBar } from '../../../components/inputs/SearchBar';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';

export function NetworkScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { isDeveloper } = useAuth();
  const { phase } = useFakeLoad();
  const people = useCommunityStore((s) => s.people);
  const teams = useCommunityStore((s) => s.teams);
  const applied = useCommunityStore((s) => s.appliedTeams);
  const connectPerson = useCommunityStore((s) => s.connectPerson);
  const applyTeam = useCommunityStore((s) => s.applyTeam);
  const [tab, setTab] = useState<'people' | 'teams'>('people');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);

  const filteredPeople = useMemo(() => {
    const n = dq.toLowerCase();
    return people.filter(
      (p) => !n || p.displayName.toLowerCase().includes(n) || p.skills.some((s) => s.toLowerCase().includes(n)) || p.roles.some((r) => r.includes(n)),
    );
  }, [people, dq]);

  return (
    <Screen>
      <ScreenHeader
        title="Network"
        onBack={() => nav.goBack()}
        right={
          isDeveloper ? (
            <Pressable onPress={() => nav.navigate('PostTeamRequest')} style={styles.icon} accessibilityRole="button">
              <Text style={[styles.link, { color: colors.cyan }]}>Post</Text>
            </Pressable>
          ) : null
        }
      />
      <View style={styles.tabs}>
        <FilterChip label="People" selected={tab === 'people'} onPress={() => setTab('people')} />
        <FilterChip label="Team requests" selected={tab === 'teams'} onPress={() => setTab('teams')} />
      </View>
      {tab === 'people' ? <SearchBar value={q} onChangeText={setQ} placeholder="Skill, role, name" /> : null}
      {phase === 'loading' ? <Skeleton width="100%" height={80} /> : null}

      {phase === 'ready' && tab === 'people' && filteredPeople.length === 0 ? (
        <EmptyState title="No people match that search." />
      ) : null}
      {phase === 'ready' && tab === 'people'
        ? filteredPeople.map((p) => (
            <BladeCard key={p.id} style={styles.card}>
              <Pressable onPress={() => nav.navigate('Profile', { id: p.id })} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <AvatarRing name={p.displayName} size={52} avatarId={p.id === 'u4' ? 'neon-fox' : p.id === 'u5' ? 'void-knight' : 'cyber-wolf'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{p.displayName}</Text>
                  <Text style={[styles.muted, { color: colors.muted }]}>{p.roles.join(' · ')}</Text>
                  <Text style={[styles.skills, { color: colors.cyan }]}>{p.skills.join(' · ')}</Text>
                </View>
              </Pressable>
              <ConnectButton state={p.connect} onPress={() => connectPerson(p.id)} />
            </BladeCard>
          ))
        : null}

      {phase === 'ready' && tab === 'teams' && teams.length === 0 ? (
        <EmptyState title="No open team requests." actionLabel={isDeveloper ? 'Post a request' : undefined} onAction={isDeveloper ? () => nav.navigate('PostTeamRequest') : undefined} />
      ) : null}
      {phase === 'ready' && tab === 'teams'
        ? teams.map((t) => (
            <BladeCard key={t.id} style={styles.card}>
              <Text style={[styles.name, { color: colors.text }]}>{t.project}</Text>
              <Text style={[styles.muted, { color: colors.muted }]}>{t.roles.join(' · ')}</Text>
              <Text style={[styles.body, { color: colors.text }]}>{t.excerpt}</Text>
              <Pressable
                onPress={() => applyTeam(t.id)}
                disabled={applied.includes(t.id)}
                style={[styles.apply, { backgroundColor: colors.magenta }, applied.includes(t.id) && { backgroundColor: colors.surfaceElevated }]}
                accessibilityRole="button"
              >
                <Text style={[styles.applyText, { color: colors.text }]}>{applied.includes(t.id) ? 'Applied' : 'Apply'}</Text>
              </Pressable>
            </BladeCard>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  icon: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: fonts.bodyMed },
  card: { padding: 16, marginTop: 12, gap: 12 },
  name: { fontFamily: fonts.bodySemi, fontSize: 16 },
  muted: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  skills: { fontFamily: fonts.mono, fontSize: 11, marginTop: 4 },
  body: { fontFamily: fonts.body, fontSize: 14 },
  apply: { minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fonts.bodySemi },
});
