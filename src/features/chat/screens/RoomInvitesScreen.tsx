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
import { useAuth } from '../../../hooks/useAuth';
import { useChatStore } from '../../../store/chatStore';
import { fonts, radius, useTheme } from '../../../theme';

export function RoomInvitesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const invites = useChatStore((s) => s.roomInvites);
  const loading = useChatStore((s) => s.roomInvitesLoading);
  const fetchMyRoomInvites = useChatStore((s) => s.fetchMyRoomInvites);
  const respondRoomInvite = useChatStore((s) => s.respondRoomInvite);

  useEffect(() => {
    if (user) fetchMyRoomInvites(user.id);
  }, [user, fetchMyRoomInvites]);

  return (
    <Screen>
      <ScreenHeader title="Room invites" onBack={() => nav.goBack()} />
      {loading ? <Skeleton width="100%" height={72} /> : null}
      {!loading && invites.length === 0 ? <EmptyState title="No pending room invites." /> : null}

      <View style={{ gap: 10 }}>
        {invites.map((invite) => (
          <BladeCard key={invite.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{invite.roomName}</Text>
              <Text style={[styles.muted, { color: colors.muted }]}>{invite.inviterName} invited you</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => respondRoomInvite(invite.id, true)}
                style={[styles.accept, { backgroundColor: colors.magenta }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemi, fontSize: 13 }}>Accept</Text>
              </Pressable>
              <Pressable
                onPress={() => respondRoomInvite(invite.id, false)}
                style={[styles.decline, { borderColor: colors.border }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 13 }}>Decline</Text>
              </Pressable>
            </View>
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
  actions: { flexDirection: 'row', gap: 8 },
  accept: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  decline: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
