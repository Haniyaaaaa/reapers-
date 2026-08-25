import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useCommunityStore } from '../../../store/communityStore';
import { colors, fonts, radius } from '../../../theme';

export function CommunityDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'CommunityDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const community = useCommunityStore((s) => s.communities.find((c) => c.id === params.id));
  const room = useCommunityStore((s) => s.rooms.find((r) => r.communityId === params.id));
  const joinCommunity = useCommunityStore((s) => s.joinCommunity);

  if (!community) {
    return (
      <Screen>
        <ScreenHeader title="Community" onBack={() => nav.goBack()} />
        <Text style={styles.muted}>Community not found.</Text>
      </Screen>
    );
  }

  const openRoom = () => {
    if (!community.joined) joinCommunity(community.id);
    if (room) nav.navigate('ChatDetail', { id: room.id });
  };

  return (
    <Screen>
      <ScreenHeader title={community.shortName} onBack={() => nav.goBack()} />
      <View style={styles.hero}>
        <Image source={community.logo} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.short}>{community.shortName}</Text>
        <Text style={styles.name}>{community.name}</Text>
        <Text style={styles.meta}>
          {community.memberCount.toLocaleString()} members
          {community.location ? ` · ${community.location}` : ''}
        </Text>
      </View>
      <Text style={styles.body}>{community.description}</Text>
      <PrimaryButton
        label={community.joined ? 'Open chatroom' : 'Join community'}
        onPress={openRoom}
        style={styles.cta}
      />
      {!community.joined ? (
        <Text style={styles.hint}>Joining adds you to the official {community.shortName} chatroom.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, marginBottom: 16 },
  logo: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.plumDeep, marginBottom: 8 },
  short: { color: colors.cyan, fontFamily: fonts.monoBold, fontSize: 13 },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center', marginBottom: 20 },
  cta: { marginTop: 4 },
  hint: { color: colors.muted2, fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 12 },
  muted: { color: colors.muted, fontFamily: fonts.body },
});
