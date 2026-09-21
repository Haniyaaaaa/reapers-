import { StyleSheet, Text, View } from 'react-native';
import { CutAvatar } from './CutAvatar';
import { fonts, useTheme } from '../../theme';
import type { AvatarLook } from '../../data/gamerAvatars';
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
  // Every profile avatar is now one of the cyber presets (or an uploaded photo). Resolving the
  // preset the same way the Profile screen does keeps an avatar identical everywhere — the old
  // name-seeded DiceBear fallback showed a different face for ids it didn't recognise.
  const imageSource = uri ? { uri } : getCyberAvatarById(avatarId).source;
  const showOnline = online ?? live;
  const caption = shortName ?? name;
  return (
    <View style={{ width: Math.max(size, showName ? 72 : size), alignItems: 'center' }}>
      <CutAvatar
        source={imageSource}
        size={size}
        cut={Math.max(6, Math.round(size * 0.22))}
        borderWidth={Math.max(1.5, size / 30)}
        gradientBorder={[gradients.liveRing[0], gradients.liveRing[1], gradients.liveRing[gradients.liveRing.length - 1]] as [string, string, string]}
        fill={colors.surfaceElevated}
      />
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
