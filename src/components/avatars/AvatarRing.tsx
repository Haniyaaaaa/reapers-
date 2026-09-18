import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, useTheme } from '../../theme';
import { avatarUriFor, type AvatarLook } from '../../data/gamerAvatars';
import { getCyberAvatarById } from '../../data/cyberAvatars';
import { streakGlyph } from '../../data/streaks';
import { useUiStore } from '../../store/uiStore';

export function AvatarRing({
  name,
  shortName,
  online,
  live,
  size = 64,
  uri,
  avatarId,
  look,
  streak,
  showName,
}: {
  name: string;
  shortName?: string;
  online?: boolean;
  live?: boolean;
  size?: number;
  uri?: string;
  avatarId?: string;
  look?: AvatarLook;
  streak?: number;
  showName?: boolean;
}) {
  const { colors, gradients } = useTheme();
  const streakEmoji = useUiStore((s) => s.streakEmoji);
  const isCyber = avatarId?.startsWith('male_') || avatarId?.startsWith('female_');
  const cyberAvatar = isCyber ? getCyberAvatarById(avatarId) : null;
  const imageSource = uri
    ? { uri }
    : cyberAvatar
    ? cyberAvatar.source
    : { uri: avatarUriFor(avatarId, name, look) };
  const showOnline = online ?? live;
  const caption = shortName ?? name;
  return (
    <View style={{ width: Math.max(size, showName ? 72 : size), alignItems: 'center' }}>
      <LinearGradient colors={gradients.liveRing} style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={imageSource}
          style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2, backgroundColor: colors.surfaceElevated }}
        />
      </LinearGradient>
      {showOnline ? (
        <View style={[styles.live, { backgroundColor: colors.online }]}>
          <Text style={[styles.liveText, { color: colors.onPrimary }]}>ONLINE</Text>
        </View>
      ) : null}
      {streak && streak > 0 ? (
        <View style={[styles.streak, { backgroundColor: colors.surface, borderColor: colors.magenta }]}>
          <Text style={{ color: colors.magenta, fontFamily: fonts.monoBold, fontSize: 10 }}>
            {streakGlyph(streakEmoji)} {streak}
          </Text>
        </View>
      ) : null}
      {showName ? (
        <View style={styles.caption}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {shortName ? (
            <Text style={[styles.short, { color: colors.muted }]} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  live: {
    marginTop: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.4 },
  streak: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  caption: { marginTop: 6, alignItems: 'center', width: '100%' },
  name: { fontFamily: fonts.bodySemi, fontSize: 11, textAlign: 'center' },
  short: { fontFamily: fonts.mono, fontSize: 10, textAlign: 'center', marginTop: 1 },
});
