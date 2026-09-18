import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';

const DEFAULT_COMMUNITY_AVATAR = require('../../../assets/avatars/extracted/male_4.jpg');

interface CyberCommunityCardProps {
  id: string;
  name: string;
  memberCount: string;
  description: string;
  avatarSource?: ImageSourcePropType;
  imageUri?: string;
  joined?: boolean;
  onPress?: () => void;
  onJoin?: () => void;
}

export function CyberCommunityCard({
  name,
  memberCount,
  description,
  avatarSource,
  imageUri,
  joined = false,
  onPress,
  onJoin,
}: CyberCommunityCardProps) {
  const { colors, isLight } = useTheme();
  const resolvedSource = imageUri ? { uri: imageUri } : avatarSource || DEFAULT_COMMUNITY_AVATAR;
  return (
    <Pressable onPress={onPress} style={styles.cardContainer} accessibilityRole="button">
      <CyberCutBox
        cutSize={12}
        radius={5}
        fill="rgba(14, 20, 35, 0.85)"
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Top Identity Row */}
          <View style={styles.headerRow}>
            <View style={[styles.avatarBox, isLight && { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder }]}>
              <Image source={resolvedSource} style={styles.avatarImg} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.onlineStatusText, isLight && { color: colors.electricAccent }]}>
                {memberCount} MEMBERS
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.descText, { color: colors.muted }]} numberOfLines={2}>
            {description}
          </Text>

          {/* Footer Row: Member count & Join button */}
          <View style={[styles.footerRow, isLight && { borderTopColor: colors.cardBorder }]}>
            <View style={styles.statsRow}>
              <Text style={[styles.statsText, { color: colors.muted }]}>👥 {memberCount} members</Text>
            </View>

            <Pressable
              onPress={onJoin}
              style={styles.joinBtn}
              accessibilityRole="button"
            >
              <CyberCutBox
                cutSize={6}
                radius={3}
                gradient={!joined}
                fill={joined ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 230, 153, 0.15)') : undefined}
                borderColor={joined ? (isLight ? 'rgba(16, 185, 129, 0.40)' : 'rgba(0, 230, 153, 0.40)') : undefined}
                borderWidth={joined ? 1 : 0}
                style={styles.joinCutBox}
              >
                <Text
                  style={[
                    styles.joinText,
                    joined && (isLight ? { color: '#059669' } : { color: '#00E699' }),
                  ]}
                >
                  {joined ? '✓ JOINED' : 'JOIN'}
                </Text>
              </CyberCutBox>
            </Pressable>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 236,
    marginRight: 12,
  },
  cutCard: {
    width: '100%',
    padding: 12,
  },
  cardInner: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#161B2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  nameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineStatusText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#00E5FF',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  descText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#8E9BB5',
    minHeight: 32,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statsRow: {
    flex: 1,
  },
  statsText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
  },
  joinBtn: {
    height: 28,
  },
  joinCutBox: {
    paddingHorizontal: 14,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
