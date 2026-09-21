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
import { fonts, useTheme } from '../../theme';
import { CutAvatar } from '../avatars/CutAvatar';
import { getCyberAvatarSource } from '../../data/cyberAvatars';

const DEFAULT_TEAM_AVATAR = getCyberAvatarSource(undefined); // the app-wide default avatar, so a user without one looks the same everywhere

interface CyberTeamOppCardProps {
  id: string;
  title: string;
  matchScore: string;
  tags: string[];
  description?: string;
  hoursRev?: string;
  avatarSource?: ImageSourcePropType;
  avatarUri?: string;
  requested?: boolean;
  onPress?: () => void;
  /** Tapping the avatar or title (e.g. to open the poster's profile). */
  onHeaderPress?: () => void;
  onRequestToJoin?: () => void;
}

export function CyberTeamOppCard({
  title,
  matchScore,
  tags,
  description,
  hoursRev,
  avatarSource,
  avatarUri,
  requested = false,
  onPress,
  onHeaderPress,
  onRequestToJoin,
}: CyberTeamOppCardProps) {
  const { colors, isLight } = useTheme();
  const resolvedSource = avatarUri ? { uri: avatarUri } : avatarSource || DEFAULT_TEAM_AVATAR;

  // Render "Needs [Role Name] · Engine · Phase" with role highlighted in bold
  const renderDescription = () => {
    if (!description) return null;
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

  const matchPct = parseInt(matchScore.replace(/[^0-9]/g, ''), 10) || 0;
  const matchTone = matchPct >= 80 ? '#3DDC84' : matchPct >= 60 ? colors.cyan : isLight ? '#6D35FF' : '#C084FC';
  // "~44 hrs/week · Rev share" → one chip per part, so nothing has to share a line with the button.
  const metaParts = (hoursRev ?? '').split('·').map((part) => part.trim()).filter(Boolean);

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
          <Pressable onPress={onHeaderPress ?? onPress} style={styles.headerRow} accessibilityRole="button">
            <CutAvatar
              source={resolvedSource}
              size={52}
              cut={13}
              fill={isLight ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.2)'}
              borderColor={isLight ? 'rgba(168, 85, 247, 0.3)' : 'rgba(192, 132, 252, 0.35)'}
              borderWidth={1}
            />

            <View style={styles.titleInfo}>
              <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <View style={[styles.matchPill, { borderColor: `${matchTone}66`, backgroundColor: `${matchTone}1A` }]}>
              <Text style={[styles.matchText, { color: matchTone }]}>{matchPct}%</Text>
              <Text style={[styles.matchCaption, { color: matchTone }]}>MATCH</Text>
            </View>
          </Pressable>

          {/* Skill Tag Capsule Pills */}
          {tags.length > 0 ? (
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
          ) : null}

          {/* Description line */}
          {renderDescription()}

          {/* Footer: commitment chips on their own line, then a full-width call to action */}
          <View style={[styles.footerDivider, { backgroundColor: colors.cardBorder }]} />
          {metaParts.length > 0 ? (
            <View style={styles.metaRow}>
              {metaParts.map((part, i) => (
                <View key={part} style={styles.metaChip}>
                  <Ionicons name={i === 0 ? 'time-outline' : 'cash-outline'} size={13} color={colors.cyan} />
                  <Text style={[styles.hoursText, { color: colors.muted }]} numberOfLines={1}>
                    {part.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable onPress={onRequestToJoin} disabled={requested} style={styles.requestBtn} accessibilityRole="button">
            <CyberCutBox
              cutSize={8}
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
  matchPill: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  matchText: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
  },
  matchCaption: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: -1,
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
    marginBottom: 14,
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
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hoursText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },
  requestBtn: {
    alignSelf: 'stretch',
  },
  requestCutBox: {
    height: 42,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestText: {
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
