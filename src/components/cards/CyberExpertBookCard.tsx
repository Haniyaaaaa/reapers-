import React from 'react';
import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EXPERT_GOLD, ExpertTick } from '../experts/ExpertBadge';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';
import { CutAvatar } from '../avatars/CutAvatar';
import { getCyberAvatarSource } from '../../data/cyberAvatars';

const DEFAULT_EXPERT_AVATAR = getCyberAvatarSource(undefined); // the app-wide default avatar, so a user without one looks the same everywhere

interface CyberExpertBookCardProps {
  id: string;
  name: string;
  title: string;
  rating: number;
  reviewsCount: number;
  availableSlot: string;
  avatarSource?: ImageSourcePropType;
  verified?: boolean;
  avatarUri?: string;
  booked?: boolean;
  onPress?: () => void;
  onBook?: () => void;
}

export function CyberExpertBookCard({
  name,
  title,
  rating,
  reviewsCount,
  availableSlot,
  avatarSource,
  verified = false,
  avatarUri,
  booked = false,
  onPress,
  onBook,
}: CyberExpertBookCardProps) {
  const { colors, isLight } = useTheme();
  const resolvedSource = avatarUri ? { uri: avatarUri } : avatarSource || DEFAULT_EXPERT_AVATAR;

  return (
    <Pressable onPress={onPress} style={styles.cardContainer} accessibilityRole="button">
      {/* Outer Obsidian Glass Chamfer Card matching Figma spec */}
      <CyberCutBox
        cutSize={16}
        radius={6}
        fill="rgba(18, 14, 36, 0.85)"
        borderColor="rgba(168, 85, 247, 0.38)"
        borderWidth={1}
        glass
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Chamfer Cut Avatar Container */}
          <CutAvatar
            source={resolvedSource}
            size={52}
            cut={13}
            fill={isLight ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.2)'}
            borderColor={verified ? EXPERT_GOLD : isLight ? 'rgba(168, 85, 247, 0.3)' : 'rgba(192, 132, 252, 0.35)'}
            borderWidth={verified ? 2 : 1}
          />

          {/* Expert Info Details */}
          <View style={styles.expertInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[styles.nameText, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                {name}
              </Text>
              {verified ? <ExpertTick size={15} /> : null}
            </View>
            <Text style={[styles.titleText, { color: colors.muted }]} numberOfLines={1}>
              {title}
            </Text>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color="#FF9500" />
              <Text style={[styles.ratingNum, { color: colors.text }]}>
                {rating > 0 ? rating.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.dot, { color: colors.muted2 }]}>·</Text>
              <Text style={[styles.reviewsText, { color: colors.muted }]}>
                {reviewsCount} {reviewsCount === 1 ? 'REVIEW' : 'REVIEWS'}
              </Text>
            </View>
          </View>

          {/* Slot Info & Chamfer Book Button */}
          <View style={styles.actionColumn}>
            <Text style={[styles.slotText, isLight && { color: colors.primary }]}>{availableSlot}</Text>

            <Pressable
              onPress={onBook}
              style={styles.bookBtn}
              accessibilityRole="button"
            >
              <CyberCutBox
                cutSize={8}
                radius={4}
                gradient={!booked}
                fill={booked ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 230, 153, 0.15)') : undefined}
                borderColor={booked ? (isLight ? 'rgba(16, 185, 129, 0.40)' : 'rgba(0, 230, 153, 0.40)') : undefined}
                borderWidth={booked ? 1 : 0}
                style={styles.bookCutBox}
              >
                <Text
                  style={[
                    styles.bookText,
                    booked && (isLight ? { color: '#059669' } : { color: '#00E699' }),
                  ]}
                >
                  {booked ? '✓ Booked' : 'Book'}
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
    width: '100%',
    marginBottom: 12,
  },
  cutCard: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 52,
    height: 52,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  expertInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  titleText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontFamily: fonts.monoBold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  dot: {
    color: '#64748B',
    fontSize: 11,
    marginHorizontal: 1,
  },
  reviewsText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  slotText: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    color: '#D83CFF',
    letterSpacing: 0.8,
    textAlign: 'right',
  },
  bookBtn: {
    height: 36,
    width: 104,
    alignSelf: 'flex-end',
  },
  bookCutBox: {
    width: '100%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookText: {
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
