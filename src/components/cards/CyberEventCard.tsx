import React from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);

interface CyberEventCardProps {
  id?: string;
  title?: string;
  dateStr?: string;
  badge?: string;
  tags?: string[];
  membersCount?: string;
  imageUri?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
}

const DEFAULT_EVENT_IMAGE = require('../../../assets/avatars/extracted/male_1.jpg');

export function CyberEventCard({
  title = 'Hollow Meridian — Launch Watch Party',
  dateStr = 'FRI, 12 SEP · 19:00',
  badge = 'LIVE IN 2 DAYS',
  tags = ['WATCH PARTY', 'FREE'],
  membersCount = '180+ MEMBERS',
  imageSource,
  onPress,
}: CyberEventCardProps) {
  const { colors, isLight } = useTheme();
  // Overlapping avatar head thumbnails
  const stackAvatars = [
    require('../../../assets/avatars/extracted/male_4.jpg'),
    require('../../../assets/avatars/extracted/female_1.jpg'),
    require('../../../assets/avatars/extracted/female_4.jpg'),
  ];

  return (
    <Pressable onPress={onPress} style={styles.cardPressable} accessibilityRole="button">
      <CyberCutBox
        cutSize={16}
        radius={6}
        fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
        borderColor={isLight ? colors.cardBorder : 'rgba(109, 53, 255, 0.3)'}
        borderWidth={1}
        style={styles.cutCard}
      >
        <View style={styles.cardContent}>
          {/* Banner Graphic with Dark Overlay */}
          <View style={styles.imageWrap}>
            <Image
              source={imageSource || stackAvatars[0]}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={
                isLight
                  ? ['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.6)', colors.cardFill]
                  : ['rgba(9, 15, 28, 0.2)', 'rgba(9, 15, 28, 0.88)', '#090F1C']
              }
              locations={[0, 0.65, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Floating Top-Right "LIVE IN 2 DAYS" Badge */}
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{badge}</Text>
            </View>

            {/* Badges on Image (WATCH PARTY, FREE) */}
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => {
                const isCyan = i === 0;
                return (
                  <View
                    key={tag}
                    style={[
                      styles.tagCapsule,
                      isCyan ? styles.tagCyan : styles.tagPurple,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isCyan ? styles.tagCyanText : styles.tagPurpleText,
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Event Details Footer */}
          <View style={styles.detailsWrap}>
            <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.metaRow}>
              <Text style={[styles.dateText, { color: colors.muted }]}>{dateStr}</Text>

              {/* Overlapping Avatar Stack */}
              <View style={styles.avatarStack}>
                {stackAvatars.map((src, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.stackCircle,
                      { zIndex: 10 - idx, marginLeft: idx > 0 ? -7 : 0 },
                      isLight && { borderColor: '#FFFFFF' },
                    ]}
                  >
                    <Image source={src} style={styles.stackImage} />
                  </View>
                ))}
                <Text style={[styles.membersText, { color: colors.muted }]}>{membersCount}</Text>
              </View>
            </View>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressable: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  cutCard: {
    width: '100%',
    maxWidth: CARD_WIDTH,
    overflow: 'hidden',
  },
  cardContent: {
    width: '100%',
  },
  imageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  liveBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#090F1C',
    fontWeight: '700',
  },
  tagsRow: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  tagCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  tagCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  tagCyanText: {
    color: '#00E5FF',
  },
  tagPurple: {
    backgroundColor: 'rgba(216, 60, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.35)',
  },
  tagPurpleText: {
    color: '#D83CFF',
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  detailsWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  eventTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: '#8E9BB5',
    letterSpacing: 0.4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#090F1C',
    overflow: 'hidden',
  },
  stackImage: {
    width: '100%',
    height: '100%',
  },
  membersText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
    marginLeft: 6,
    letterSpacing: 0.4,
  },
});
