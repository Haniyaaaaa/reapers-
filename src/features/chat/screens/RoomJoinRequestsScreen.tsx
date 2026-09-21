import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import type { MainStackParamList } from '../../../navigation/types';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { BladeCard } from '../../../components/cards/BladeCard';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useChatStore } from '../../../store/chatStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, radius, useTheme } from '../../../theme';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';

export function RoomJoinRequestsScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'RoomJoinRequests'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const requests = useChatStore((s) => s.joinRequests[params.roomId] ?? EMPTY_ARRAY);
  const fetchJoinRequests = useChatStore((s) => s.fetchJoinRequests);
  const respondJoinRequest = useChatStore((s) => s.respondJoinRequest);

  useEffect(() => {
    fetchJoinRequests(params.roomId);
  }, [params.roomId, fetchJoinRequests]);

  const refreshControl = useRefreshControl(async () => {
    await fetchJoinRequests(params.roomId);
  });

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title="Join requests" onBack={() => nav.goBack()} />
      {requests.length === 0 ? <EmptyState title="No pending join requests." /> : null}

      <View style={{ gap: 10 }}>
        {requests.map((req) => (
          <BladeCard key={req.id} style={styles.row}>
            <Pressable
              onPress={() => useProfilePreviewStore.getState().open(req.requesterId)}
              accessibilityRole="button"
              accessibilityLabel={req.requesterName}
            >
              <AvatarRing name={req.requesterName} size={40} uri={req.requesterAvatarUri} avatarId={req.requesterAvatarId} />
            </Pressable>
            <Text style={[styles.name, { color: colors.text, flex: 1, marginLeft: 10 }]}>{req.requesterName}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => respondJoinRequest(params.roomId, req.id, true)}
                style={[styles.accept, { backgroundColor: colors.magenta }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemi, fontSize: 13 }}>Approve</Text>
              </Pressable>
              <Pressable
                onPress={() => respondJoinRequest(params.roomId, req.id, false)}
                style={[styles.decline, { borderColor: colors.border }]}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 13 }}>Reject</Text>
              </Pressable>
            </View>
          </BladeCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 8 },
  accept: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  decline: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
