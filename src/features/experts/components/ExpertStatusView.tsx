import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { EXPERT_GOLD, VerifiedSeal } from '../../../components/experts/ExpertBadge';
import { fonts, useTheme } from '../../../theme';
import type { Database } from '../../../services/supabase/types';

type ExpertRow = Database['public']['Tables']['experts']['Row'];

type Props = {
  application: ExpertRow;
  onEdit: () => void;
  onAvailability: () => void;
  onViewPublic: () => void;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** The expert's own "status" page: a hero card (state + role), live stats, specialties and the
 * actions available in that state. Verified → gold; in review → amber; rejected → red. */
export function ExpertStatusView({ application, onEdit, onAvailability, onViewPublic }: Props) {
  const { colors } = useTheme();
  const rejected = !application.verified && !!application.rejection_reason;
  const tone = application.verified ? EXPERT_GOLD : rejected ? colors.danger : colors.warning;
  const label = application.verified ? 'VERIFIED EXPERT' : rejected ? 'NOT APPROVED' : 'IN REVIEW';
  const message = application.verified
    ? 'Your profile is live in the expert directory. Members can book 15-minute sessions with you.'
    : rejected
      ? 'Your application was not approved. Update your details and resubmit for another review.'
      : 'Your application is with the Reapers team. Reviews can take a few days — we’ll notify you.';
  const headline = [application.role, application.company].filter(Boolean).join(' · ');

  return (
    <View style={styles.wrap}>
      <CyberCutBox cutSize={16} radius={10} fill={colors.cardFill} borderColor={tone} borderWidth={1} style={styles.heroCut}>
        <View style={styles.hero}>
          <View style={[styles.badgeCircle, { borderColor: tone, backgroundColor: `${tone}22` }]}>
            {application.verified ? (
              <VerifiedSeal size={44} />
            ) : (
              <Ionicons name={rejected ? 'close-circle-outline' : 'hourglass-outline'} size={38} color={tone} />
            )}
          </View>
          <View style={[styles.pill, { borderColor: tone, backgroundColor: `${tone}1F` }]}>
            <Text style={[styles.pillText, { color: tone }]}>{label}</Text>
          </View>
          {headline ? <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text> : null}
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
        </View>
      </CyberCutBox>

      {rejected ? (
        <CyberCutBox cutSize={10} radius={8} fill="rgba(255, 77, 109, 0.10)" borderColor={colors.danger} borderWidth={0.88} style={styles.block}>
          <View style={styles.reason}>
            <Text style={[styles.sectionLabel, { color: colors.danger }]}>REVIEWER NOTE</Text>
            <Text style={[styles.reasonText, { color: colors.text }]}>{application.rejection_reason}</Text>
          </View>
        </CyberCutBox>
      ) : null}

      {application.verified ? (
        <View style={[styles.statsRow, styles.block]}>
          <Stat label="RATING" value={application.review_count > 0 ? application.rating.toFixed(1) : '—'} icon="star" tint={EXPERT_GOLD} />
          <Stat label="REVIEWS" value={String(application.review_count)} />
          <Stat label="EXPERIENCE" value={application.years_experience != null ? `${application.years_experience} yrs` : '—'} />
        </View>
      ) : null}

      {application.specialties.length > 0 ? (
        <View style={styles.block}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SPECIALTIES</Text>
          <View style={styles.chips}>
            {application.specialties.map((tag) => (
              <View key={tag} style={[styles.chip, { borderColor: colors.cardBorder, backgroundColor: colors.cardFill }]}>
                <Text style={[styles.chipText, { color: colors.text }]}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>MANAGE</Text>
        <ActionRow icon="create-outline" title={rejected ? 'Edit & resubmit' : 'Edit profile'} subtitle="Role, bio, links and specialties" onPress={onEdit} />
        {application.verified ? (
          <>
            <ActionRow icon="calendar-outline" title="Set availability" subtitle="Choose when people can book you" onPress={onAvailability} />
            <ActionRow icon="eye-outline" title="View public profile" subtitle="See what members see" onPress={onViewPublic} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value, icon, tint }: { label: string; value: string; icon?: IconName; tint?: string }) {
  const { colors } = useTheme();
  return (
    <CyberCutBox cutSize={8} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.statCut}>
      <View style={styles.stat}>
        <View style={styles.statValueRow}>
          {icon ? <Ionicons name={icon} size={15} color={tint} /> : null}
          <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        </View>
        <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      </View>
    </CyberCutBox>
  );
}

function ActionRow({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.rowPress, pressed && { opacity: 0.8 }]}>
      <CyberCutBox cutSize={10} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.cyan}1A`, borderColor: `${colors.cyan}55` }]}>
            <Ionicons name={icon} size={20} color={colors.cyan} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.rowSub, { color: colors.muted }]}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  block: { marginTop: 20 },
  heroCut: { alignSelf: 'stretch' },
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  badgeCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pill: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, borderWidth: 1 },
  pillText: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 2 },
  headline: { marginTop: 14, fontFamily: fonts.display, fontSize: 18, textAlign: 'center' },
  message: { marginTop: 8, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  reason: { padding: 14 },
  reasonText: { marginTop: 6, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCut: { flex: 1 },
  stat: { alignItems: 'center', paddingVertical: 14 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontFamily: fonts.display, fontSize: 20 },
  statLabel: { marginTop: 4, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  chipText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  rowPress: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodyMed, fontSize: 16 },
  rowSub: { marginTop: 2, fontFamily: fonts.body, fontSize: 12 },
});
