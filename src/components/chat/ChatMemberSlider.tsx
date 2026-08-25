import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarRing } from '../avatars/AvatarRing';
import { fonts, useTheme } from '../../theme';
import { onlineUsers } from '../../data/mock';
import { useAuth } from '../../hooks/useAuth';

export function ChatMemberSlider({
  onUserPress,
}: {
  onUserPress: (profileId?: string) => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const people = [
    { id: 'me', name: user?.displayName ?? 'You', online: true, avatarId: user?.avatarId, uri: user?.avatarUri, profileId: user?.id },
    ...onlineUsers,
  ];

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.kicker, { color: colors.muted }]}>IN THIS ROOM</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {people.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onUserPress('profileId' in p ? p.profileId : undefined)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={p.name}
          >
            <AvatarRing
              name={p.name}
              size={44}
              online={p.online}
              avatarId={p.avatarId}
              uri={'uri' in p ? p.uri : undefined}
              look={p.id === 'me' ? user?.avatarLook : undefined}
            />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {p.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  row: { gap: 12, paddingRight: 8 },
  cell: { width: 56, alignItems: 'center', gap: 2 },
  name: { fontFamily: fonts.bodyMed, fontSize: 11, textAlign: 'center' },
});
