import React from 'react';
import { ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';

/** Compact approval row: who it is + what they applied as. Everything else (bio, tags, links…)
 * lives on the detail screen behind "View details" so the queue stays scannable. */
export function ApprovalCard({
  avatar,
  title,
  subtitle,
  badge,
  busy,
  approveLabel = 'Approve',
  onViewDetails,
  onApprove,
  onReject,
}: {
  avatar: ImageSourcePropType;
  title: string;
  subtitle: string;
  badge: string;
  busy?: boolean;
  approveLabel?: string;
  onViewDetails: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { colors } = useTheme();
  return (
    <CyberCutBox cutSize={16} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.identityRow}>
          <CutAvatar source={avatar} size={52} cut={12} />
          <View style={styles.identityText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={1}>{subtitle}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onViewDetails} style={styles.detailsBtn} accessibilityRole="button">
            <Text style={[styles.detailsText, { color: colors.primary }]}>View details</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>

          <Pressable onPress={onReject} disabled={busy} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Reject">
            <CyberCutBox cutSize={6} radius={4} fill="rgba(40, 15, 25, 0.6)" borderColor="rgba(255, 77, 109, 0.6)" borderWidth={1} style={styles.btnBox}>
              <View style={styles.btnInner}>
                <Ionicons name="close" size={16} color="#FF4D6D" />
                <Text style={styles.rejectText}>Reject</Text>
              </View>
            </CyberCutBox>
          </Pressable>

          <Pressable onPress={onApprove} disabled={busy} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={approveLabel}>
            <CyberCutBox gradient cutSize={6} radius={4} style={styles.btnBox}>
              <View style={styles.btnInner}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.approveText}>{busy ? 'Working…' : approveLabel}</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        </View>
      </View>
    </CyberCutBox>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', marginBottom: 12 },
  inner: { padding: 14, gap: 14 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.display, fontSize: 16.5, fontWeight: '700' },
  sub: { fontFamily: fonts.body, fontSize: 13 },
  badge: {
    backgroundColor: 'rgba(216, 60, 255, 0.16)',
    borderColor: 'rgba(216, 60, 255, 0.45)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.8, color: '#D83CFF' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 38 },
  detailsText: { fontFamily: fonts.bodySemi, fontSize: 13.5 },
  iconBtn: { width: 100, height: 38 },
  btnBox: { width: '100%', height: 38 },
  btnInner: { width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  approveText: { fontFamily: fonts.bodySemi, fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  rejectText: { fontFamily: fonts.bodySemi, fontSize: 13, fontWeight: '700', color: '#FF4D6D' },
});
