import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { DemoThumb } from '../media/DemoThumb';
import { fonts, useTheme } from '../../theme';
import type { Demo } from '../../types/demo';

interface CyberDemoFeedCardProps {
  demo: Demo;
  rankBadge?: string;
  onPress?: () => void;
  onPlayPress?: () => void;
}

export function CyberDemoFeedCard({
  demo,
  rankBadge,
  onPress,
  onPlayPress,
}: CyberDemoFeedCardProps) {
  const { colors, gradients, isLight } = useTheme();
  // Compute average score from rubric (gameplay, art, concept, polish)
  const scores = demo.scores;
  const avgRating = scores
    ? (scores.gameplay + scores.art + scores.concept + scores.polish) / 4
    : 0;
  const hasReviews = demo.reviewCount > 0 && avgRating > 0;
  const ratingDisplay = avgRating.toFixed(1);
  const starsCount = Math.min(5, Math.max(1, Math.round(avgRating)));

  const sliceBadge = demo.isJamEntry ? 'JAM ENTRY' : 'VERTICAL SLICE';
  const displayGenre = (demo.genre || 'ACTION RPG').toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.cardWrapper} accessibilityRole="button">
      <CyberCutBox
        cutSize={16}
        radius={8}
        fill="rgba(14, 20, 35, 0.9)"
        style={styles.cutBox}
      >
        {/* Banner Area */}
        <View style={styles.bannerContainer}>
          <DemoThumb uri={demo.thumbnail} style={styles.bannerImage} />

          {/* Scrim gradient overlay */}
          <LinearGradient
            colors={['rgba(9, 15, 28, 0.3)', 'rgba(9, 15, 28, 0.5)', '#090F1C']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Badges */}
          <View style={styles.topBadgesRow}>
            <View style={styles.sliceBadge}>
              <Text style={styles.sliceBadgeText}>{sliceBadge}</Text>
            </View>
            {rankBadge ? (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{rankBadge}</Text>
              </View>
            ) : (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#1 THIS WEEK</Text>
              </View>
            )}
          </View>

          {/* Play Button Overlay (Chamfered gradient button) */}
          <Pressable
            onPress={onPlayPress ?? onPress}
            style={styles.playButtonTouch}
            accessibilityRole="button"
            accessibilityLabel="Play demo"
          >
            <LinearGradient
              colors={gradients.cyber}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playButtonGradient}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </LinearGradient>
          </Pressable>

          {/* Title & Studio Header on Banner bottom */}
          <View style={styles.bannerBottomInfo}>
            <Text style={styles.titleText} numberOfLines={1}>
              {demo.title}
            </Text>
            <View style={styles.studioRow}>
              <Ionicons name="game-controller-outline" size={13} color="#8E9BB5" />
              <Text style={styles.studioText} numberOfLines={1}>
                {demo.developerName || 'Independent Studio'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.bodyContainer}>
          {/* Description */}
          <Text style={[styles.descriptionText, { color: colors.text }]} numberOfLines={2}>
            {demo.description || 'A next-generation playable experience built with cutting-edge real-time physics.'}
          </Text>

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            <View style={[styles.tagPill, isLight && { backgroundColor: 'rgba(109, 53, 255, 0.08)' }]}>
              <Text style={[styles.tagText, isLight && { color: colors.electricAccent }]}>{displayGenre}</Text>
            </View>
          </View>

          {/* Footer: Rating & Platforms */}
          <View style={[styles.footerRow, isLight && { borderTopColor: colors.cardBorder }]}>
            <View style={styles.ratingWrap}>
              {hasReviews ? (
                <>
                  <Text style={styles.starsText}>{'★'.repeat(starsCount)}</Text>
                  <Text style={[styles.ratingNumber, { color: colors.text }]}>{ratingDisplay}</Text>
                  <Text style={[styles.dotSeparator, { color: colors.muted2 }]}>·</Text>
                  <Text style={[styles.reviewsText, { color: colors.muted }]}>{demo.reviewCount} REVIEWS</Text>
                </>
              ) : (
                <Text style={[styles.reviewsText, { color: colors.muted }]}>NO REVIEWS YET</Text>
              )}
            </View>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  cutBox: {
    width: '100%',
    overflow: 'hidden',
  },
  bannerContainer: {
    width: '100%',
    height: 190,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  sliceBadge: {
    backgroundColor: 'rgba(216, 60, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sliceBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.6,
  },
  rankBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.55)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.6,
  },
  playButtonTouch: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    zIndex: 3,
  },
  playButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerBottomInfo: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    right: 68,
    zIndex: 2,
  },
  titleText: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studioText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
  },
  bodyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    lineHeight: 19,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: 'rgba(109, 53, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(109, 53, 255, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  starsText: {
    color: '#FFB800',
    fontSize: 13,
    letterSpacing: 1,
  },
  ratingNumber: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dotSeparator: {
    color: '#8E9BB5',
    fontSize: 12,
  },
  reviewsText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#8E9BB5',
  },
  platformWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  platformText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    color: '#8E9BB5',
    letterSpacing: 0.4,
  },
});
