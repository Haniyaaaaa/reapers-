import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Community } from '../../types/community';
import { fonts, radius, useTheme } from '../../theme';

export function CommunityRow({
  community,
  onPress,
  onJoin,
}: {
  community: Community;
  onPress?: () => void;
  onJoin?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={community.shortName}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Image source={community.logo} style={[styles.logo, { backgroundColor: colors.plumDeep }]} accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>{community.shortName}</Text>
        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
          {community.memberCount.toLocaleString()} members{community.location ? ` · ${community.location}` : ''}
        </Text>
      </View>
      {onJoin ? (
        <Pressable
          onPress={onJoin}
          style={[styles.join, { borderColor: colors.magenta }, community.joined && { backgroundColor: colors.magenta }]}
          accessibilityRole="button"
          accessibilityLabel={community.joined ? 'Open' : `Join ${community.shortName}`}
        >
          <Text style={[styles.joinText, { color: colors.text }]}>{community.joined ? 'Joined' : 'Join'}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.md,
    borderTopRightRadius: 6,
    padding: 14,
    borderWidth: 1,
  },
  logo: { width: 52, height: 52, borderRadius: radius.sm },
  body: { flex: 1 },
  name: { fontFamily: fonts.bodySemi, fontSize: 16 },
  meta: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  join: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  joinText: { fontFamily: fonts.bodyMed, fontSize: 13 },
});
