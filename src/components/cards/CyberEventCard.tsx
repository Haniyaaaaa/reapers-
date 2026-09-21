import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { ClipPath, Defs, G, Image as SvgImage, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
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
  showAvatars?: boolean;
  imageUri?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
}

const CUT_SIZE = 24;
const BANNER_HEIGHT = 140;

export function CyberEventCard({
  title = 'Karachi Game Dev Meetup',
  dateStr = 'FRI, 12 SEP · 19:00',
  badge = 'LIVE IN 2 DAYS',
  tags = ['MEETUP', 'FREE'],
  membersCount = '180+ MEMBERS',
  showAvatars = true,
  imageUri,
  imageSource,
  onPress,
}: CyberEventCardProps) {
  const { colors, isLight } = useTheme();
  const [bannerWidth, setBannerWidth] = useState(0);
  // Overlapping avatar head thumbnails
  const stackAvatars = [
    require('../../../assets/avatars/extracted/male_4.jpg'),
    require('../../../assets/avatars/extracted/female_1.jpg'),
    require('../../../assets/avatars/extracted/female_4.jpg'),
  ];

  return (
    <Pressable onPress={onPress} style={styles.cardPressable} accessibilityRole="button">
      <CyberCutBox
        cutSize={CUT_SIZE}
        radius={6}
        fill={isLight ? colors.cardFill : 'rgba(18, 14, 36, 0.6)'}
        borderColor={isLight ? colors.cardBorder : 'rgba(168, 85, 247, 0.2)'}
        borderWidth={1}
        glass
        style={styles.cutCard}
      >
        <View style={styles.cardContent}>
          {/* Banner Graphic with Dark Overlay */}
          <View style={styles.imageWrap} onLayout={(e) => setBannerWidth(e.nativeEvent.layout.width)}>
            {bannerWidth > 0 && (
              // Drawn through SVG so the banner is clipped to the card's top-left chamfer
              // instead of a plain rectangle covering the cut corner.
              <Svg width={bannerWidth} height={BANNER_HEIGHT} style={StyleSheet.absoluteFill}>
                <Defs>
                  <ClipPath id="bannerClip">
                    <Path d={`M ${CUT_SIZE} 0 L ${bannerWidth} 0 L ${bannerWidth} ${BANNER_HEIGHT} L 0 ${BANNER_HEIGHT} L 0 ${CUT_SIZE} Z`} />
                  </ClipPath>
                  <SvgGradient id="bannerShade" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={isLight ? '#0F172A' : '#090F1C'} stopOpacity={isLight ? 0.1 : 0.2} />
                    <Stop offset="0.65" stopColor={isLight ? '#0F172A' : '#090F1C'} stopOpacity={isLight ? 0.6 : 0.88} />
                    <Stop offset="1" stopColor={isLight ? colors.cardFill : '#090F1C'} stopOpacity={1} />
                  </SvgGradient>
                </Defs>
                <G clipPath="url(#bannerClip)">
                  <SvgImage
                    href={imageSource || (imageUri ? { uri: imageUri } : stackAvatars[0])}
                    width={bannerWidth}
                    height={BANNER_HEIGHT}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <Rect width={bannerWidth} height={BANNER_HEIGHT} fill="url(#bannerShade)" />
                </G>
              </Svg>
            )}

            {/* Floating Top-Right "LIVE IN 2 DAYS" Badge */}
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{badge}</Text>
            </View>

            {/* Badges on Image (MEETUP, FREE) */}
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
                {(showAvatars ? stackAvatars : []).map((src, idx) => (
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
    height: BANNER_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
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
