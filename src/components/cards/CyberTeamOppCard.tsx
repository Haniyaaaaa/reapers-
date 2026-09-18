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

const DEFAULT_TEAM_AVATAR = require('../../../assets/avatars/extracted/female_6.jpg');

interface CyberTeamOppCardProps {
  id: string;
  title: string;
  matchScore: string;
  tags: string[];
  description: string;
  hoursRev?: string;
  avatarSource?: ImageSourcePropType;
  avatarUri?: string;
  requested?: boolean;
  onPress?: () => void;
  onPortfolio?: () => void;
  onRequestToJoin?: () => void;
}

export function CyberTeamOppCard({
  title,
  matchScore,
  tags,
  description,
  hoursRev = '~10 HRS/WEEK · REV',
  avatarSource,
  avatarUri,
  requested = false,
  onPress,
  onPortfolio,
  onRequestToJoin,
}: CyberTeamOppCardProps) {
  const { colors, isLight } = useTheme();
  const resolvedSource = avatarUri ? { uri: avatarUri } : avatarSource || DEFAULT_TEAM_AVATAR;

  // Render "Needs [Role Name] · Engine · Phase" with role highlighted in bold
  const renderDescription = () => {
    if (description.startsWith('Needs ')) {
      const afterNeeds = description.slice(6);
      const parts = afterNeeds.split('·');
      const roleName = parts[0]?.trim();
      const rest = parts.slice(1).join(' · ');
      return (
        <Text style={styles.descText} numberOfLines={1}>
          <Text style={[styles.descNeeds, { color: colors.muted }]}>Needs </Text>
          <Text style={[styles.descRole, { color: colors.text }]}>{roleName}</Text>
          {rest ? <Text style={[styles.descRest, { color: colors.muted }]}> · {rest.trim()}</Text> : null}
        </Text>
      );
    }
    return (
      <Text style={[styles.descText, { color: colors.text }]} numberOfLines={1}>
        {description}
      </Text>
    );
  };

  const formattedMatch = matchScore.includes('match')
    ? matchScore
    : `${matchScore.replace(/%/g, '')}% match`;

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
          {/* Top Header: Chamfer Avatar Box + Title + Right Match Score */}
          <View style={styles.headerRow}>
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={isLight ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.2)'}
              borderColor={isLight ? 'rgba(168, 85, 247, 0.3)' : 'rgba(192, 132, 252, 0.35)'}
              borderWidth={1}
              style={styles.avatarBox}
            >
              <Image source={resolvedSource} style={styles.avatarImg} />
            </CyberCutBox>

            <View style={styles.titleInfo}>
              <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <Text style={[styles.matchText, { color: colors.text }]}>{formattedMatch}</Text>
          </View>

          {/* Skill Tag Capsule Pills */}
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tagPill,
                  isLight && {
                    backgroundColor: 'rgba(109, 53, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(109, 53, 255, 0.22)',
                  },
                ]}
              >
                <Text style={[styles.tagText, isLight && { color: '#6D35FF' }]}>
                  {tag.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* Description line */}
          {renderDescription()}

          {/* Footer Row: Commitment Info & Chamfer Action Buttons */}
          <View style={styles.footerRow}>
            <Text style={[styles.hoursText, { color: colors.muted }]}>{hoursRev.toUpperCase()}</Text>

            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={onPortfolio}
                style={styles.portfolioBtn}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={isLight ? 'rgba(0, 180, 216, 0.08)' : 'rgba(255, 255, 255, 0.04)'}
                  borderColor={isLight ? 'rgba(0, 180, 216, 0.40)' : 'rgba(255, 255, 255, 0.15)'}
                  borderWidth={1}
                  style={styles.portfolioCutBox}
                >
                  <Text style={[styles.portfolioText, isLight && { color: colors.electricAccent }]}>PORTFOLIO</Text>
                </CyberCutBox>
              </Pressable>

              <Pressable
                onPress={onRequestToJoin}
                style={styles.requestBtn}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  gradient={!requested}
                  fill={requested ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 230, 153, 0.15)') : undefined}
                  borderColor={requested ? (isLight ? 'rgba(16, 185, 129, 0.40)' : 'rgba(0, 230, 153, 0.40)') : undefined}
                  borderWidth={requested ? 1 : 0}
                  style={styles.requestCutBox}
                >
                  <Text
                    style={[
                      styles.requestText,
                      requested && (isLight ? { color: '#059669' } : { color: '#00E699' }),
                    ]}
                  >
                    {requested ? '✓ REQUESTED' : 'REQUEST TO JOIN'}
                  </Text>
                </CyberCutBox>
              </Pressable>
            </View>
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
    paddingVertical: 16,
  },
  cardInner: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
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
  titleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  matchText: {
    fontFamily: fonts.display,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tagPill: {
    backgroundColor: 'rgba(38, 48, 70, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#D1D5DB',
    letterSpacing: 0.6,
  },
  descText: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 16,
  },
  descNeeds: {
    color: '#9CA3AF',
    fontFamily: fonts.body,
  },
  descRole: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemi,
    fontWeight: '600',
  },
  descRest: {
    color: '#9CA3AF',
    fontFamily: fonts.body,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioBtn: {
    height: 34,
  },
  portfolioCutBox: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },
  requestBtn: {
    height: 34,
  },
  requestCutBox: {
    paddingHorizontal: 16,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestText: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
});
