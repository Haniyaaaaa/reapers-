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

const DEFAULT_EVENT_THUMB = require('../../../assets/avatars/extracted/male_1.jpg');

interface CyberEventRowCardProps {
  id: string;
  title: string;
  category: string;
  type: 'Online' | 'Physical' | 'Hybrid' | string;
  dateStr: string;
  attendeesCount: number;
  imageUri?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
}

export function CyberEventRowCard({
  title,
  category,
  type,
  dateStr,
  attendeesCount,
  imageUri,
  imageSource,
  onPress,
}: CyberEventRowCardProps) {
  const { colors, isLight } = useTheme();
  const resolvedSource = imageUri ? { uri: imageUri } : imageSource || DEFAULT_EVENT_THUMB;

  const isOnline = type.toLowerCase() === 'online';
  const isHybrid = type.toLowerCase() === 'hybrid';

  return (
    <Pressable onPress={onPress} style={styles.container} accessibilityRole="button">
      <CyberCutBox
        cutSize={12}
        radius={6}
        fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.88)'}
        borderColor={isLight ? colors.cardBorder : 'rgba(109, 53, 255, 0.3)'}
        borderWidth={1}
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Left: Event Thumbnail */}
          <View style={styles.thumbWrap}>
            <Image source={resolvedSource} style={styles.thumbImg} resizeMode="cover" />
          </View>

          {/* Right: Info */}
          <View style={styles.contentCol}>
            {/* Top Badges Row */}
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.categoryBadge,
                  isLight && { backgroundColor: 'rgba(15, 23, 42, 0.06)', borderColor: 'rgba(15, 23, 42, 0.12)' },
                ]}
              >
                <Text style={[styles.categoryText, isLight && { color: colors.text }]}>{category.toUpperCase()}</Text>
              </View>

              <View
                style={[
                  styles.typeBadge,
                  isOnline && styles.typeBadgeOnline,
                  isHybrid && styles.typeBadgeHybrid,
                  !isOnline && !isHybrid && (isLight ? { backgroundColor: 'rgba(0, 180, 216, 0.12)', borderColor: 'rgba(0, 180, 216, 0.35)' } : styles.typeBadgePhysical),
                ]}
              >
                <View
                  style={[
                    styles.typeDot,
                    isOnline && styles.typeDotOnline,
                    isHybrid && styles.typeDotHybrid,
                    !isOnline && !isHybrid && (isLight ? { backgroundColor: colors.electricAccent } : styles.typeDotPhysical),
                  ]}
                />
                <Text
                  style={[
                    styles.typeText,
                    isOnline && styles.typeTextOnline,
                    isHybrid && styles.typeTextHybrid,
                    !isOnline && !isHybrid && (isLight ? { color: colors.electricAccent } : styles.typeTextPhysical),
                  ]}
                >
                  {type.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Event Title */}
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>

            {/* Meta Row: Date & Attendees */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>📅 {dateStr.toUpperCase()}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.muted }]}>👥 {attendeesCount}</Text>
              </View>
            </View>
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
    padding: 12,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#161B2E',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  contentCol: {
    flex: 1,
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: '#CBD5E1',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeOnline: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    borderColor: 'rgba(0, 230, 153, 0.35)',
  },
  typeBadgeHybrid: {
    backgroundColor: 'rgba(216, 60, 255, 0.12)',
    borderColor: 'rgba(216, 60, 255, 0.35)',
  },
  typeBadgePhysical: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  typeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typeDotOnline: {
    backgroundColor: '#00E699',
  },
  typeDotHybrid: {
    backgroundColor: '#D83CFF',
  },
  typeDotPhysical: {
    backgroundColor: '#00E5FF',
  },
  typeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  typeTextOnline: {
    color: '#00E699',
  },
  typeTextHybrid: {
    color: '#D83CFF',
  },
  typeTextPhysical: {
    color: '#00E5FF',
  },
  titleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#8E9BB5',
  },
});
