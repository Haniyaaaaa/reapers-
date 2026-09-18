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
import { CyberCutBox } from '../cyber/CyberCutBox';
import { DemoThumb } from '../media/DemoThumb';
import { fonts, useTheme } from '../../theme';


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
        cutSize={12}
        radius={5}
        fill="rgba(14, 20, 35, 0.85)"
        style={styles.cutCard}
      >
        <View style={styles.cardInner}>
          {/* Banner Graphic */}
          <View style={styles.imageWrap}>
            {imageUri || imageSource ? (
              <Image source={imageUri ? { uri: imageUri } : (imageSource as ImageSourcePropType)} style={styles.bannerImg} resizeMode="cover" />
            ) : (
              <DemoThumb style={styles.bannerImg} />
            )}
            <LinearGradient
              colors={['rgba(9, 15, 28, 0.1)', 'rgba(9, 15, 28, 0.75)', '#090F1C']}
              locations={[0, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />

            {badge ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{badge}</Text>
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
    width: 200,
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
    height: 105,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  badgeWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(216, 60, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.5,
  },
  infoWrap: {
    padding: 10,
  },
  titleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  studioText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
    marginBottom: 6,
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
