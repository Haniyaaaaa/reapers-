import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import type { MainStackParamList } from '../../../navigation/types';
import { getTeamRequest } from '../../../services/supabase/network';
import { useNetworkStore } from '../../../store/networkStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, useTheme } from '../../../theme';
import type { TeamRequest } from '../../../types/extra';
import { teamMatchScore } from '../../../utils/matching';
import { COMPENSATION_OPTIONS, formatStudioLine, stageLabel, workModeLabel } from '../../../utils/teamRequest';

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/** The full team request: everything the poster filled in, the whole pitch, and the join action.
 * The cards on Find teammates only fit a summary, so this is where the details live. */
export function TeamRequestDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'TeamRequestDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();

  const cached = useNetworkStore((s) => s.teams.find((t) => t.id === params.id));
  const applied = useNetworkStore((s) => s.appliedTeams.has(params.id));
  const applyTeam = useNetworkStore((s) => s.applyTeam);
  const [fetched, setFetched] = useState<TeamRequest | null>(null);
  const [loading, setLoading] = useState(!cached);
  const team = cached ?? fetched;

  useEffect(() => {
    if (cached) return;
    let alive = true;
    getTeamRequest(params.id)
      .then((t) => alive && setFetched(t))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cached, params.id]);

  if (!team) {
    return (
      <Screen>
        <ScreenHeader title="Team request" onBack={() => nav.goBack()} />
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : <EmptyState title="This request is no longer available." />}
      </Screen>
    );
  }

  const isOwn = !!user && team.posterId === user.id;
  const score = teamMatchScore({ skills: user?.skills ?? [], roles: user?.roles ?? [] }, team);
  const studioLine = formatStudioLine(team);
  const compensation = COMPENSATION_OPTIONS.find((o) => o.value === team.compensation)?.label;
  const location = [workModeLabel(team.workMode), team.location].filter(Boolean).join(' · ');

  const rows: { label: string; value?: string }[] = [
    { label: 'ENGINE', value: team.engine },
    { label: 'LOCATION', value: location || undefined },
    { label: 'ROLE NEEDED BY', value: formatDate(team.neededBy) },
    { label: 'STAGE', value: stageLabel(team.stage) },
    { label: 'TEAM SIZE', value: team.teamSize ? `${team.teamSize} ${team.teamSize === 1 ? 'person' : 'people'}` : undefined },
    { label: 'COMMITMENT', value: team.hoursPerWeek ? `~${team.hoursPerWeek} hours / week` : undefined },
    { label: 'COMPENSATION', value: compensation },
    { label: 'POSTED', value: formatDate(team.createdAt) },
  ].filter((r) => !!r.value);

  return (
    <Screen>
      <ScreenHeader title="Team request" onBack={() => nav.goBack()} />

      {/* Title + poster */}
      <View style={styles.titleBlock}>
        <View style={styles.matchRow}>
          <View style={[styles.matchPill, { borderColor: colors.primary }]}>
            <Text style={[styles.matchText, { color: colors.primary }]}>{score}% MATCH</Text>
          </View>
        </View>
        <Text style={[styles.project, { color: colors.text }]}>{team.project}</Text>
        {studioLine ? <Text style={[styles.studio, { color: colors.muted }]}>{studioLine}</Text> : null}
      </View>

      <Pressable
        onPress={() => useProfilePreviewStore.getState().open(team.posterId)}
        style={[styles.posterRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}
        accessibilityRole="button"
        accessibilityLabel="View the poster's profile"
      >
        <CutAvatar source={resolveAvatarSource(team.posterAvatarUri, team.posterAvatarId)} size={44} cut={11} borderWidth={1} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.posterLabel, { color: colors.muted2 }]}>POSTED BY</Text>
          <Text style={[styles.posterName, { color: colors.text }]} numberOfLines={1}>{team.posterName ?? 'View profile'}</Text>
        </View>
        <Text style={[styles.posterLink, { color: colors.primary }]}>Profile</Text>
      </Pressable>

      {/* Pitch — the whole text, not the 2-line preview from the card */}
      <Text style={[styles.sectionLabel, { color: colors.primary }]}>THE PITCH</Text>
      <Text style={[styles.pitch, { color: team.excerpt ? colors.text : colors.muted2 }]}>{team.excerpt || 'No pitch was written for this request.'}</Text>

      {/* Roles */}
      {team.roles.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>ROLES NEEDED</Text>
          <View style={styles.rolesWrap}>
            {team.roles.map((r) => (
              <View key={r} style={styles.rolePill}>
                <Text style={styles.roleText}>{r.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Details */}
      {rows.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>DETAILS</Text>
          <CyberCutBox cutSize={12} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.detailsCut}>
            <View style={styles.detailsInner}>
              {rows.map((r, i) => (
                <View key={r.label} style={[styles.detailRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder }]}>
                  <Text style={[styles.detailLabel, { color: colors.muted2 }]}>{r.label}</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{r.value}</Text>
                </View>
              ))}
            </View>
          </CyberCutBox>
        </>
      ) : null}

      {/* Action */}
      {isOwn ? (
        <Pressable onPress={() => nav.navigate('TeamRequestApplicants', { teamRequestId: team.id })} style={styles.ctaTouch} accessibilityRole="button">
          <CyberCutBox gradient cutSize={10} radius={4} style={styles.ctaCut}>
            <Text style={styles.ctaText}>VIEW APPLICANTS</Text>
          </CyberCutBox>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            if (user && !applied) applyTeam(user.id, team.id);
          }}
          disabled={applied}
          style={styles.ctaTouch}
          accessibilityRole="button"
        >
          <CyberCutBox
            gradient={!applied}
            cutSize={10}
            radius={4}
            fill={applied ? 'rgba(255, 255, 255, 0.1)' : undefined}
            borderColor={applied ? 'rgba(255, 255, 255, 0.2)' : undefined}
            borderWidth={applied ? 1 : 0}
            style={styles.ctaCut}
          >
            <Text style={styles.ctaText}>{applied ? 'REQUESTED' : 'REQUEST TO JOIN'}</Text>
          </CyberCutBox>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: { marginTop: 8, marginBottom: 16, gap: 6 },
  matchRow: { flexDirection: 'row' },
  matchPill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  matchText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8 },
  project: { fontFamily: fonts.display, fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  studio: { fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 0.6 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  posterLabel: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 0.8 },
  posterName: { fontFamily: fonts.bodySemi, fontSize: 15, fontWeight: '700' },
  posterLink: { fontFamily: fonts.mono, fontSize: 12 },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, marginBottom: 10, marginTop: 6 },
  pitch: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, marginBottom: 18 },
  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  rolePill: { backgroundColor: 'rgba(109, 53, 255, 0.18)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.45)', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  roleText: { fontFamily: fonts.mono, fontSize: 10.5, fontWeight: '700', color: '#D83CFF', letterSpacing: 0.5 },
  detailsCut: { marginBottom: 22 },
  detailsInner: { paddingHorizontal: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 13 },
  detailLabel: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 0.8 },
  detailValue: { fontFamily: fonts.bodySemi, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  ctaTouch: { height: 50, marginBottom: 8 },
  ctaCut: { width: '100%', height: 50, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
});
