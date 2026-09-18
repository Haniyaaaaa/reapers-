import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CYBER_AVATARS } from '../../data/cyberAvatars';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from '../cyber/CyberCutBox';
import type { AvatarLook } from '../../data/gamerAvatars';

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
  onCustomUri: (uri: string | undefined) => void;
  onLookChange?: (look: AvatarLook) => void;
}) {
  const { colors, isLight } = useTheme();
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]?.uri) onCustomUri(res.assets[0].uri);
  };

  return (
    <View style={styles.container}>
      {customUri ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: customUri }} style={styles.previewImg} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo Selected</Text>
            <Pressable onPress={() => onCustomUri(undefined)} accessibilityRole="button">
              <Text style={[styles.removeText, { color: colors.primary }]}>Remove photo</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Cyber Avatars Grid */}
      <View style={styles.grid}>
        {CYBER_AVATARS.map((a) => {
          const on = (selectedId === a.id || (!selectedId && a.id === 'male_1')) && !customUri;
          return (
            <Pressable
              key={a.id}
              onPress={() => onSelectId(a.id)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={a.name}
            >
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: on ? '#D83CFF' : colors.cardBorder,
                    backgroundColor: on
                      ? (isLight ? 'rgba(216, 60, 255, 0.12)' : 'rgba(216, 60, 255, 0.2)')
                      : (isLight ? colors.cardFill : '#161B2E'),
                  },
                  on && styles.avatarRingActive,
                ]}
              >
                <Image source={a.source} style={styles.avatarImg} />
              </View>
              <Text
                style={[
                  styles.avatarName,
                  { color: on ? '#D83CFF' : colors.muted },
                  on && styles.avatarNameActive,
                ]}
                numberOfLines={1}
              >
                {a.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom Photo Button */}
      <Pressable onPress={pick} style={styles.uploadBtnTouch} accessibilityRole="button">
        <CyberCutBox
          cutSize={8}
          radius={6}
          fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
          borderColor={isLight ? colors.cardBorder : 'rgba(0, 229, 255, 0.4)'}
          borderWidth={0.88}
          style={styles.uploadCutBox}
        >
          <View style={styles.uploadInner}>
            <Text style={[styles.uploadText, { color: colors.primary }]}>Upload Custom Photo</Text>
          </View>
        </CyberCutBox>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  previewImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  sectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  removeText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12.5,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cell: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingActive: {
    borderWidth: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarName: {
    fontFamily: fonts.bodyMed,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  avatarNameActive: {
    fontFamily: fonts.bodySemi,
    fontWeight: '700',
  },
  uploadBtnTouch: {
    width: '100%',
    height: 44,
    marginTop: 6,
  },
  uploadCutBox: {
    width: '100%',
    height: '100%',
  },
  uploadInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
  },
});

