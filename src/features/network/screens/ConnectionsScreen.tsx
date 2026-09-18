import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { BladeCard } from '../../../components/cards/BladeCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useNetworkStore } from '../../../store/networkStore';
import { fonts, radius, useTheme } from '../../../theme';

export function ConnectionsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const connections = useNetworkStore((s) => s.connections);
  const loading = useNetworkStore((s) => s.connectionsLoading);
  const fetchConnections = useNetworkStore((s) => s.fetchConnections);
  const respondConnection = useNetworkStore((s) => s.respondConnection);

  useEffect(() => {
    if (user) fetchConnections(user.id);
  }, [user, fetchConnections]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchConnections(user.id);
  });

  const incoming = connections.filter((c) => c.direction === 'incoming' && c.status === 'pending');
  const outgoing = connections.filter((c) => c.direction === 'outgoing' && c.status === 'pending');
  const accepted = connections.filter((c) => c.status === 'accepted');

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="Connections" onBack={() => nav.goBack()} />
      {loading ? <Skeleton width="100%" height={72} /> : null}
      {!loading && connections.length === 0 ? <EmptyState title="No connections yet — find people in Network." /> : null}

      {!loading && incoming.length > 0 ? (
        <>
          <SectionHeader title="Requests" />
          <View style={{ gap: 10, marginBottom: 16 }}>
            {incoming.map((c) => (
              <BladeCard key={c.otherId} style={styles.row}>
                <Pressable onPress={() => nav.navigate('Profile', { id: c.otherId })} style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{c.otherName}</Text>
                  <Text style={[styles.muted, { color: colors.muted }]}>Wants to connect</Text>
                </Pressable>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => user && respondConnection(user.id, c.otherId, true)}
                    style={[styles.accept, { backgroundColor: colors.magenta }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemi, fontSize: 13 }}>Accept</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => user && respondConnection(user.id, c.otherId, false)}
                    style={[styles.decline, { borderColor: colors.border }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 13 }}>Decline</Text>
                  </Pressable>
                </View>
              </BladeCard>
            ))}
          </View>
        </>
      ) : null}

      {!loading && outgoing.length > 0 ? (
        <>
          <SectionHeader title="Pending" />
          <View style={{ gap: 10, marginBottom: 16 }}>
            {outgoing.map((c) => (
              <BladeCard key={c.otherId} style={styles.row}>
                <Pressable onPress={() => nav.navigate('Profile', { id: c.otherId })} style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{c.otherName}</Text>
                  <Text style={[styles.muted, { color: colors.muted }]}>Request sent</Text>
                </Pressable>
              </BladeCard>
            ))}
          </View>
        </>
      ) : null}

      {!loading && accepted.length > 0 ? (
        <>
          <SectionHeader title="Connected" />
          <View style={{ gap: 10 }}>
            {accepted.map((c) => (
              <BladeCard key={c.otherId} style={styles.row}>
                <Pressable onPress={() => nav.navigate('Profile', { id: c.otherId })} style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{c.otherName}</Text>
                </Pressable>
              </BladeCard>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  muted: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  accept: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  decline: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
