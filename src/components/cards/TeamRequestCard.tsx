import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CutAvatar } from '../avatars/CutAvatar';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { resolveAvatarSource } from '../../data/cyberAvatars';
import { fonts, useTheme } from '../../theme';
import type { TeamRequest } from '../../types/extra';
import { formatCommitment, formatStudioLine, stageLabel, workModeLabel } from '../../utils/teamRequest';

/** One open team request, shared by the Find teammates slider and the "See all" list. Only the
 * details the poster actually filled in are rendered. */
export function TeamRequestCard({
  team,
  score,
  applied,
  onApply,
  onPosterPress,
  onPress,
  owner,
}: {
  team: TeamRequest;
  score: number;
  applied: boolean;
  onApply: () => void;
  onPosterPress: () => void;
  /** Open the full request. */
  onPress?: () => void;
  /** The poster's own view of the card (My team requests): applicant count + edit/delete
   * instead of the match score and "Request to join". */
  owner?: { applicantCount: number; onApplicants: () => void; onEdit: () => void; onDelete: () => void };
}) {
  const { colors } = useTheme();
  const studioLine = formatStudioLine(team);
  const commitment = formatCommitment(team);

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.teamCardTouch} accessibilityRole="button" accessibilityLabel={`View details of ${team.project}`}>
      <CyberCutBox
        cutSize={14}
        radius={8}
        fill={colors.cardFill}
        borderColor={colors.cardBorder}
        borderWidth={1}
        style={styles.teamCardCut}
      >
        <View style={styles.teamCardInner}>
          {/* Top Badges + Match Score */}
          <View style={styles.teamTopBadgesRow}>
            <View style={styles.roleBadgesRow}>
              {team.roles[0] ? (
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{team.roles[0].toUpperCase()}</Text>
                </View>
              ) : null}
              {team.stage ? (
                <View style={[styles.slicePill, { backgroundColor: colors.cardBorder }]}>
                  <Text style={[styles.slicePillText, { color: colors.muted }]}>{(stageLabel(team.stage) ?? '').toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
            {owner ? null : <Text style={[styles.matchScoreText, { color: colors.text }]}>{`${score}% match`}</Text>}
          </View>

          {/* Title & Studio info */}
          <Pressable
            onPress={onPosterPress}
            style={styles.teamTitleRow}
            accessibilityRole="button"
            accessibilityLabel={`View ${team.project} poster's profile`}
          >
            <CutAvatar source={resolveAvatarSource(team.posterAvatarUri, team.posterAvatarId)} size={44} cut={11} borderWidth={1} />
            <View style={styles.teamTitleWrap}>
              <Text style={[styles.teamProjectTitle, { color: colors.text }]}>{team.project}</Text>
              {studioLine ? <Text style={[styles.teamStudioSubtext, { color: colors.muted }]}>{studioLine}</Text> : null}
            </View>
          </Pressable>

          {team.excerpt ? (
            <Text style={[styles.teamExcerptText, { color: colors.text }]} numberOfLines={2}>
              {team.excerpt}
            </Text>
          ) : null}

          {/* Engine & Location Grid — only the columns the poster filled in */}
          {team.engine || team.location || team.workMode || team.neededBy ? (
            <View style={[styles.teamDetailGrid, { backgroundColor: colors.inputFill }]}>
              {team.engine ? (
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: colors.muted2 }]}>ENGINE</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>{team.engine}</Text>
                </View>
              ) : null}
              {team.workMode || team.location ? (
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: colors.muted2 }]}>LOCATION</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>
                    {[workModeLabel(team.workMode), team.location].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}
              {team.neededBy ? (
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: colors.muted2 }]}>NEEDED BY</Text>
                  <Text style={[styles.gridValue, { color: colors.text }]}>
                    {new Date(`${team.neededBy}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Skill Tags */}
          {team.roles.length > 0 ? (
            <View style={styles.tagsRow}>
              {team.roles.map((r) => (
                <View key={r} style={styles.tagPill}>
                  <Text style={styles.tagText}>{r.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Footer Row */}
          <View style={[styles.teamFooterRow, { borderTopColor: colors.cardBorder }]}>
            {commitment && !owner ? <Text style={[styles.hoursRevText, { color: colors.muted }]}>{commitment}</Text> : null}

            {owner ? (
              <View style={styles.ownerRow}>
                <Pressable
                  onPress={owner.onApplicants}
                  style={[styles.applicantsPill, { backgroundColor: owner.applicantCount > 0 ? 'rgba(61, 220, 132, 0.14)' : colors.cardBorder }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${owner.applicantCount} applicants`}
                >
                  <Ionicons name="person-add-outline" size={15} color={owner.applicantCount > 0 ? '#3DDC84' : colors.muted} />
                  <Text style={[styles.applicantsText, { color: owner.applicantCount > 0 ? '#3DDC84' : colors.muted }]}>
                    {owner.applicantCount} {owner.applicantCount === 1 ? 'APPLICANT' : 'APPLICANTS'}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={owner.applicantCount > 0 ? '#3DDC84' : colors.muted} />
                </Pressable>

                <View style={styles.ownerActions}>
                  {onPress ? (
                    <Pressable onPress={onPress} style={[styles.roundBtn, { backgroundColor: 'rgba(168, 85, 247, 0.16)' }]} accessibilityRole="button" accessibilityLabel={`View details of ${team.project}`}>
                      <Ionicons name="eye-outline" size={18} color="#C084FC" />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={owner.onEdit} style={[styles.roundBtn, { backgroundColor: 'rgba(0, 229, 255, 0.14)' }]} accessibilityRole="button" accessibilityLabel="Edit request">
                    <Ionicons name="create-outline" size={18} color="#00E5FF" />
                  </Pressable>
                  <Pressable onPress={owner.onDelete} style={[styles.roundBtn, { backgroundColor: 'rgba(255, 77, 109, 0.14)' }]} accessibilityRole="button" accessibilityLabel="Delete request">
                    <Ionicons name="trash-outline" size={18} color="#FF4D6D" />
                  </Pressable>
                </View>
              </View>
            ) : (
            <View style={styles.actionBtnsRow}>
              {onPress ? (
                <Pressable onPress={onPress} style={styles.requestJoinTouch} accessibilityRole="button" accessibilityLabel={`View details of ${team.project}`}>
                  <CyberCutBox cutSize={6} radius={4} fill="transparent" borderColor="rgba(0, 229, 255, 0.6)" borderWidth={1} style={styles.requestJoinCutBox}>
                    <View style={styles.requestJoinInner}>
                      <Text style={[styles.requestJoinText, { color: '#00E5FF' }]}>VIEW DETAILS</Text>
                    </View>
                  </CyberCutBox>
                </Pressable>
              ) : null}
              <Pressable onPress={onApply} disabled={applied} style={styles.requestJoinTouch} accessibilityRole="button">
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  gradient={!applied}
                  fill={applied ? 'rgba(255, 255, 255, 0.1)' : undefined}
                  borderColor={applied ? 'rgba(255, 255, 255, 0.2)' : undefined}
                  borderWidth={applied ? 1 : 0}
                  style={styles.requestJoinCutBox}
                >
                  <View style={styles.requestJoinInner}>
                    <Text style={styles.requestJoinText}>{applied ? 'REQUESTED' : 'REQUEST TO JOIN'}</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            </View>
            )}
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ownerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ownerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  applicantsPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 19 },
  applicantsText: { fontFamily: fonts.monoBold, fontSize: 10.5, letterSpacing: 0.6 },
  teamCardTouch: {
    marginBottom: 16,
  },
  teamCardCut: {
    width: '100%',
  },
  teamCardInner: {
    padding: 16,
    gap: 12,
  },
  teamTopBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    backgroundColor: 'rgba(216, 60, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rolePillText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.5,
  },
  slicePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slicePillText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: '#8E9BB5',
    letterSpacing: 0.5,
  },
  matchScoreText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamTitleWrap: {
    flex: 1,
    gap: 2,
  },
  teamProjectTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamStudioSubtext: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: '#8E9BB5',
    letterSpacing: 0.4,
  },
  teamExcerptText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    lineHeight: 19,
  },
  teamDetailGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(9, 15, 28, 0.6)',
    borderRadius: 6,
  },
  gridCol: {
    flex: 1,
    gap: 2,
  },
  gridLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#60718F',
    letterSpacing: 0.6,
  },
  gridValue: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#A6B4CE',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(109, 53, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(109, 53, 255, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.5,
  },
  teamFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  hoursRevText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: '#8E9BB5',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  actionBtnsRow: {
    marginLeft: 'auto',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestJoinTouch: {
    height: 30,
  },
  requestJoinCutBox: {
    height: 30,
  },
  requestJoinInner: {
    height: '100%',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestJoinText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
