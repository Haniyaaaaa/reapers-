import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { BladeCard } from '../../../components/cards/BladeCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNetworkStore } from '../../../store/networkStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, useTheme } from '../../../theme';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';

export function TeamRequestApplicantsScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'TeamRequestApplicants'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const team = useNetworkStore((s) => s.teams.find((t) => t.id === params.teamRequestId));
  const applicants = useNetworkStore((s) => s.applicantsByTeam[params.teamRequestId] ?? EMPTY_ARRAY);
  const loading = useNetworkStore((s) => s.applicantsLoading[params.teamRequestId] ?? false);
  const fetchApplicants = useNetworkStore((s) => s.fetchApplicants);

  useEffect(() => {
    fetchApplicants(params.teamRequestId);
  }, [params.teamRequestId, fetchApplicants]);

  const refreshControl = useRefreshControl(async () => {
    await fetchApplicants(params.teamRequestId);
  });

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title={team ? `Applicants · ${team.project}` : 'Applicants'} onBack={() => nav.goBack()} />
      {loading ? <Skeleton width="100%" height={72} /> : null}
      {!loading && applicants.length === 0 ? <EmptyState title="No one has applied yet." /> : null}
      <View style={{ gap: 10 }}>
        {applicants.map((a) => (
          <BladeCard key={a.id} style={styles.row}>
            <Pressable onPress={() => useProfilePreviewStore.getState().open(a.id)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', flex: 1 }}>
              <AvatarRing name={a.displayName} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{a.displayName}</Text>
                <Text style={[styles.muted, { color: colors.muted }]}>{a.roles.join(' · ')}</Text>
                {a.skills.length ? <Text style={[styles.skills, { color: colors.cyan }]}>{a.skills.join(' · ')}</Text> : null}
              </View>
            </Pressable>
          </BladeCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  muted: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  skills: { fontFamily: fonts.mono, fontSize: 11, marginTop: 4 },
});
