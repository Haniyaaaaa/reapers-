import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { getCyberAvatarSource } from '../../data/cyberAvatars';
import { fonts, useTheme } from '../../theme';

interface CyberCommunityFeaturedCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: string;
  avatarSource?: ImageSourcePropType;
  imageUri?: string;
  joined?: boolean;
  onPress?: () => void;
  onToggleJoin?: () => void;
  onAction?: () => void;
}

export function CyberCommunityFeaturedCard({
  name,
  description,
  memberCount,
  avatarSource,
  imageUri,
  joined = false,
  onPress,
  onToggleJoin,
  onAction,
}: CyberCommunityFeaturedCardProps) {
  const { colors, gradients, isLight } = useTheme();
  const resolvedSource = imageUri ? { uri: imageUri } : avatarSource || getCyberAvatarSource('male_4');

  return (
    <Pressable onPress={onPress} style={styles.container} accessibilityRole="button">
      <CyberCutBox
        cutSize={14}
        radius={6}
        fill="rgba(14, 20, 35, 0.88)"
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Top Row: Pill Badge + Joined Status */}
          <View style={styles.topRow}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>FEATURED THIS WEEK</Text>
            </View>

            <Pressable
              onPress={onToggleJoin}
              style={styles.statusBtn}
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
                style={styles.statusCutBox}
              >
                <View style={styles.statusInner}>
                  <Ionicons
                    name={joined ? 'checkmark' : 'add'}
                    size={12}
                    color={
                      joined
                        ? (isLight ? '#059669' : '#00E699')
                        : (isLight ? colors.electricAccent : '#00E5FF')
                    }
                  />
                  <Text
                    style={[
                      styles.statusText,
                      joined
                        ? (isLight ? { color: '#059669', fontWeight: '700' } : { color: '#00E699' })
                        : (isLight ? { color: colors.electricAccent, fontWeight: '700' } : styles.statusTextActive),
                    ]}
                  >
                    {joined ? 'Joined' : 'Join'}
                  </Text>
                </View>
              </CyberCutBox>
            </Pressable>
          </View>

          {/* Middle Row: Community Avatar + Info */}
          <View style={styles.midRow}>
            <View style={styles.avatarCutWrap}>
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={isLight ? colors.surfaceElevated : '#161B2E'}
                borderColor="rgba(216, 60, 255, 0.5)"
                borderWidth={1}
                style={styles.avatarCutBox}
              >
                <Image source={resolvedSource} style={styles.avatarImg} />
              </CyberCutBox>
            </View>

            <View style={styles.infoWrap}>
              <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.descText, { color: colors.muted }]} numberOfLines={2}>
                {description}
              </Text>
            </View>
          </View>

          {/* Bottom Row: Overlapping Member Avatars + Action Button */}
          <View style={[styles.bottomRow, isLight && { borderTopColor: colors.cardBorder }]}>
            <View style={styles.membersStackWrap}>
              <Ionicons
                name="people-outline"
                size={16}
                color={isLight ? colors.electricAccent : '#00E5FF'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.membersCountText, { color: colors.muted }]}>{memberCount} MEMBERS</Text>
            </View>

            <Pressable onPress={onAction || onPress} style={styles.actionBtnWrap} accessibilityRole="button">
              <CyberCutBox cutSize={8} radius={4} style={styles.actionCutBox}>
                <LinearGradient
                  colors={gradients.cyber}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  <Text style={styles.actionBtnText}>
                    {joined ? 'BROADCAST' : 'OPEN CHAT'}
                  </Text>
                </LinearGradient>
              </CyberCutBox>
            </Pressable>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  cutCard: {
    width: '100%',
    padding: 14,
  },
  cardInner: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredBadge: {
    backgroundColor: 'rgba(216, 60, 255, 0.16)',
    borderColor: 'rgba(216, 60, 255, 0.45)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#D83CFF',
  },
  statusBtn: {
    alignSelf: 'flex-start',
  },
  statusCutBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: '#E2E8F0',
  },
  statusTextActive: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarCutWrap: {
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
  infoWrap: {
    flex: 1,
  },
  titleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  descText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: '#8E9BB5',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  membersStackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatarBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#090F1C',
    overflow: 'hidden',
  },
  miniAvatarImg: {
    width: '100%',
    height: '100%',
  },
  membersCountText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#8E9BB5',
  },
  actionBtnWrap: {
    alignSelf: 'center',
  },
  actionCutBox: {
    overflow: 'hidden',
  },
  actionGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
});
