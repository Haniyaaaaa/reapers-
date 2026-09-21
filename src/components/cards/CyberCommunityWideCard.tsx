import React from 'react';
import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { CutAvatar } from '../avatars/CutAvatar';
import { fonts, useTheme } from '../../theme';

const DEFAULT_COMMUNITY_AVATAR = require('../../../assets/avatars/extracted/male_4.jpg');

interface CyberCommunityWideCardProps {
  id: string;
  name: string;
  memberCount: string;
  description: string;
  tags?: string[];
  avatarSource?: ImageSourcePropType;
  imageUri?: string;
  joined?: boolean;
  onPress?: () => void;
  onToggleJoin?: () => void;
}

export function CyberCommunityWideCard({
  name,
  memberCount,
  description,
  tags = ['ENGINES', 'INDIE', 'DEV'],
  avatarSource,
  imageUri,
  joined = true,
  onPress,
  onToggleJoin,
}: CyberCommunityWideCardProps) {
  const { colors, isLight } = useTheme();
  const resolvedSource = imageUri ? { uri: imageUri } : avatarSource || DEFAULT_COMMUNITY_AVATAR;

  return (
    <Pressable onPress={onPress} style={styles.container} accessibilityRole="button">
      <CyberCutBox
        cutSize={18}
        radius={6}
        fill={isLight ? colors.cardFill : 'rgba(18, 14, 36, 0.6)'}
        borderColor={isLight ? colors.cardBorder : 'rgba(168, 85, 247, 0.2)'}
        borderWidth={1}
        glass
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Avatar Box on Left */}
          <CutAvatar
            source={resolvedSource}
            size={48}
            cut={12}
            borderWidth={1}
            borderColor={isLight ? colors.electricAccent : 'rgba(0, 229, 255, 0.4)'}
            fill={isLight ? colors.surfaceElevated : '#161B2E'}
          />

          {/* Right Content Column */}
          <View style={styles.contentCol}>
            {/* Header: Name + Joined Badge */}
            <View style={styles.headerRow}>
              <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>

              <Pressable
                onPress={onToggleJoin}
                style={styles.joinedBadgeWrap}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={
                    joined
                      ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 230, 153, 0.12)')
                      : (isLight ? 'rgba(0, 180, 216, 0.12)' : 'rgba(0, 229, 255, 0.15)')
                  }
                  borderColor={
                    joined
                      ? (isLight ? 'rgba(16, 185, 129, 0.40)' : 'rgba(0, 230, 153, 0.40)')
                      : (isLight ? colors.electricAccent : '#00E5FF')
                  }
                  borderWidth={1}
                  style={styles.joinedCutBox}
                >
                  <View style={styles.joinedInner}>
                    <Ionicons
                      name={joined ? 'checkmark' : 'add'}
                      size={11}
                      color={
                        joined
                          ? (isLight ? '#059669' : '#00E699')
                          : (isLight ? colors.electricAccent : '#00E5FF')
                      }
                    />
                    <Text
                      style={[
                        styles.joinedText,
                        joined
                          ? (isLight ? { color: '#059669', fontWeight: '700' } : { color: '#00E699' })
                          : (isLight ? { color: colors.electricAccent, fontWeight: '700' } : styles.joinedTextActive),
                      ]}
                    >
                      {joined ? 'Joined' : 'Join'}
                    </Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            </View>

            {/* Stats: Member Count */}
            <View style={styles.statsRow}>
              <Text style={[styles.memberCountText, { color: colors.muted }]}>{memberCount} members</Text>
            </View>

            {/* Description */}
            <Text style={[styles.descText, { color: colors.muted }]} numberOfLines={2}>
              {description}
            </Text>

            {/* Tags Row */}
            {tags && tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.slice(0, 4).map((tag, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.tagPill,
                      isLight && {
                        backgroundColor: 'rgba(109, 53, 255, 0.08)',
                        borderWidth: 1,
                        borderColor: 'rgba(109, 53, 255, 0.22)',
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, isLight && { color: '#6D35FF' }]}>{tag.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  cutCard: {
    width: '100%',
    padding: 14,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
  },
  avatarCutBox: {
    width: 48,
    height: 48,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  contentCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  nameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  joinedBadgeWrap: {
    alignSelf: 'flex-start',
  },
  joinedCutBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  joinedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  joinedText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    color: '#E2E8F0',
  },
  joinedTextActive: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  memberCountText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#8E9BB5',
  },
  descText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: '#8E9BB5',
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: '#8E9BB5',
  },
});
