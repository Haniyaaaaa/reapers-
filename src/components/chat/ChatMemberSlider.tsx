import { useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarRing } from '../avatars/AvatarRing';
import { fonts, useTheme } from '../../theme';
import { useChatStore } from '../../store/chatStore';
import { EMPTY_ARRAY } from '../../utils/emptyArray';

export function ChatMemberSlider({
  roomId,
  onUserPress,
  onManagePress,
}: {
  roomId: string;
  onUserPress: (profileId?: string) => void;
  onManagePress?: () => void;
}) {
  const { colors } = useTheme();
  const members = useChatStore((s) => s.members[roomId] ?? EMPTY_ARRAY);
  const fetchMembers = useChatStore((s) => s.fetchMembers);

  useEffect(() => {
    fetchMembers(roomId);
  }, [roomId, fetchMembers]);

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.kicker, { color: colors.muted }]}>IN THIS ROOM</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {members.map((m) => (
          <Pressable
            key={m.userId}
            onPress={() => onUserPress(m.userId)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={m.name}
          >
            <AvatarRing name={m.name} size={44} avatarId={m.avatarId} uri={m.avatarUri} />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {m.role === 'owner' ? '👑 ' : ''}
              {m.name}
            </Text>
          </Pressable>
        ))}
        {onManagePress ? (
          <Pressable onPress={onManagePress} style={styles.cell} accessibilityRole="button" accessibilityLabel="Manage members">
            <View style={[styles.manageIcon, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="people-outline" size={20} color={colors.cyan} />
            </View>
            <Text style={[styles.name, { color: colors.cyan }]} numberOfLines={1}>
              Members
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  row: { gap: 12, paddingRight: 8 },
  cell: { width: 56, alignItems: 'center', gap: 2 },
  name: { fontFamily: fonts.bodyMed, fontSize: 11, textAlign: 'center' },
  manageIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
