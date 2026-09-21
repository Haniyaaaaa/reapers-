import React from 'react';
import {
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

const CARD_W = 230;
const BANNER_H = 124;
const CUT = 18;

interface CyberDemoCardProps {
  id: string;
  title: string;
  studio: string;
  badge?: string;
  rating?: number;
  reviewsCount?: number;
  imageSource?: ImageSourcePropType;
  imageUri?: string;
  onPress?: () => void;
}

export function CyberDemoCard({
  title,
  studio,
  badge = 'VERTICAL SLICE',
  rating,
  reviewsCount = 0,
  imageSource,
  imageUri,
  onPress,
}: CyberDemoCardProps) {
  const { colors, isLight } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.cardContainer} accessibilityRole="button">
      <CyberCutBox
        cutSize={CUT}
        radius={6}
        fill={isLight ? colors.cardFill : 'rgba(18, 14, 36, 0.6)'}
        borderColor={isLight ? colors.cardBorder : 'rgba(168, 85, 247, 0.2)'}
        borderWidth={1}
        glass
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Banner — drawn in SVG so the image itself is clipped to the card's chamfer */}
          <View style={styles.imageWrap}>
            <Svg width={CARD_W} height={BANNER_H} style={StyleSheet.absoluteFill}>
              <Defs>
                <ClipPath id="demoBannerClip">
                  <Path d={`M ${CUT} 0 L ${CARD_W} 0 L ${CARD_W} ${BANNER_H} L 0 ${BANNER_H} L 0 ${CUT} Z`} />
                </ClipPath>
                <SvgGradient id="demoBannerShade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#090F1C" stopOpacity={0.1} />
                  <Stop offset="0.7" stopColor="#0C1222" stopOpacity={0.7} />
                  <Stop offset="1" stopColor="#0C1222" stopOpacity={0.95} />
                </SvgGradient>
                <SvgGradient id="demoBannerFallback" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#1B2A5C" />
                  <Stop offset="1" stopColor="#3A1466" />
                </SvgGradient>
              </Defs>
              <G clipPath="url(#demoBannerClip)">
                {imageUri || imageSource ? (
                  <SvgImage
                    href={imageUri ? { uri: imageUri } : (imageSource as ImageSourcePropType)}
                    width={CARD_W}
                    height={BANNER_H}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <Rect width={CARD_W} height={BANNER_H} fill="url(#demoBannerFallback)" />
                )}
                <Rect width={CARD_W} height={BANNER_H} fill="url(#demoBannerShade)" />
              </G>
            </Svg>

            {badge ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
              </View>
            ) : null}
          </View>

          {/* Info Details */}
          <View style={styles.infoWrap}>
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.studioText, { color: colors.muted }]} numberOfLines={1}>
              {studio}
            </Text>

            {/* Rating Stars & Count */}
            <View style={styles.ratingRow}>
              {rating != null && reviewsCount > 0 ? (
                <>
                  <Text style={styles.starsText}>{'★'.repeat(Math.max(1, Math.round(rating)))}</Text>
                  <Text style={[styles.ratingScore, { color: colors.text }]}>{rating.toFixed(1)}</Text>
                  <Text style={[styles.dotSeparator, { color: colors.muted2 }]}>·</Text>
                  <Text style={[styles.reviewsCount, { color: colors.muted }]}>{reviewsCount}</Text>
                </>
              ) : (
                <Text style={[styles.reviewsCount, { color: colors.muted }]}>No reviews yet</Text>
              )}
            </View>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_W,
    marginRight: 12,
  },
  cutCard: {
    width: '100%',
    overflow: 'hidden',
  },
  cardInner: {
    width: '100%',
  },
  imageWrap: {
    width: '100%',
    height: BANNER_H,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    maxWidth: CARD_W - 36,
    backgroundColor: 'rgba(90, 40, 170, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(190, 150, 255, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E4D2FF',
    letterSpacing: 0.9,
  },
  infoWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  titleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  studioText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsText: {
    fontSize: 11,
    color: '#FFB800',
    letterSpacing: 1,
  },
  ratingScore: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  dotSeparator: {
    color: '#64748B',
    fontSize: 10,
  },
  reviewsCount: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
  },
});
