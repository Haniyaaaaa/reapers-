import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../../theme';
import { bgColors, gamerAvatars, hairColors, skinColors, avatarUriFor, type AvatarLook } from '../../data/gamerAvatars';
import * as ImagePicker from 'expo-image-picker';

export function AvatarPicker({
  selectedId,
  customUri,
  look,
  onSelectId,
  onCustomUri,
  onLookChange,
}: {
  selectedId?: string;
  customUri?: string;
  look?: AvatarLook;
  onSelectId: (id: string) => void;
  onCustomUri: (uri: string) => void;
  onLookChange?: (look: AvatarLook) => void;
}) {
  const { colors } = useTheme();

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]?.uri) onCustomUri(res.assets[0].uri);
  };

  const chip = (active: boolean) => ({
    borderColor: active ? colors.magenta : colors.border,
    backgroundColor: active ? colors.magentaDeep : colors.surface,
  });

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.grid}>
        {gamerAvatars.map((a) => {
          const on = selectedId === a.id && !customUri;
          return (
            <Pressable
              key={a.id}
              onPress={() => onSelectId(a.id)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={a.name}
            >
              <View style={[styles.ring, { borderColor: on ? colors.magenta : colors.border }]}>
                <Image source={{ uri: avatarUriFor(a.id, a.name, on ? look : undefined) }} style={styles.img} />
              </View>
              <Text style={[styles.name, { color: on ? colors.magenta : colors.text }]} numberOfLines={1}>
                {a.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {onLookChange && !customUri ? (
        <View style={{ gap: 8 }}>
          <Text style={[styles.section, { color: colors.muted }]}>Customize character</Text>
          <Text style={[styles.hint, { color: colors.muted2 }]}>Hair</Text>
          <View style={styles.row}>
            {hairColors.map((c) => (
              <Pressable key={c.id} onPress={() => onLookChange({ ...look, hairColor: c.id })} style={[styles.swatch, chip(look?.hairColor === c.id)]}>
                <Text style={[styles.swatchText, { color: colors.text }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.muted2 }]}>Skin</Text>
          <View style={styles.row}>
            {skinColors.map((c) => (
              <Pressable key={c.id} onPress={() => onLookChange({ ...look, skinColor: c.id })} style={[styles.swatch, chip(look?.skinColor === c.id)]}>
                <Text style={[styles.swatchText, { color: colors.text }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.muted2 }]}>Background</Text>
          <View style={styles.row}>
            {bgColors.map((c) => (
              <Pressable key={c.id} onPress={() => onLookChange({ ...look, backgroundColor: c.id })} style={[styles.swatch, chip(look?.backgroundColor === c.id)]}>
                <Text style={[styles.swatchText, { color: colors.text }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable onPress={pick} style={[styles.upload, { borderColor: colors.cyan }]} accessibilityRole="button">
        <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi }}>Upload your photo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '25%', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: 48, height: 48, borderRadius: 24 },
  name: { fontFamily: fonts.bodyMed, fontSize: 10, textAlign: 'center' },
  section: { fontFamily: fonts.bodySemi, fontSize: 13 },
  hint: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  swatch: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  swatchText: { fontFamily: fonts.body, fontSize: 12 },
  upload: { minHeight: 44, borderWidth: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
