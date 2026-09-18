import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarRing } from '../avatars/AvatarRing';
import { BladeCard } from '../cards/BladeCard';
import { InlineErrorText } from '../feedback/InlineErrorText';
import { getPaymentProofSignedUrl } from '../../services/supabase/storage';
import { useProfilePreviewStore } from '../../store/profilePreviewStore';
import { fonts, radius, useTheme } from '../../theme';
import type { EventPaymentApplication } from '../../types/event';

/** One pending payment-application row for a host to review — shared by EventApplicationsScreen
 * (one event) and MyEventApplicationsScreen (aggregated across every event the viewer hosts). */
export function ApplicationCard({
  application,
  accountLabel,
  onApprove,
  onReject,
}: {
  application: EventPaymentApplication;
  accountLabel?: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { colors } = useTheme();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    getPaymentProofSignedUrl(application.proofScreenshotPath)
      .then(setSignedUrl)
      .catch((e) => setLoadErr(e instanceof Error ? e.message : 'Could not load screenshot'));
  }, [application.proofScreenshotPath]);

  return (
    <BladeCard style={styles.card}>
      <View style={styles.header}>
        <Pressable
          onPress={() => useProfilePreviewStore.getState().open(application.applicantId)}
          accessibilityRole="button"
          accessibilityLabel={application.applicantName}
        >
          <AvatarRing name={application.applicantName} size={40} uri={application.applicantAvatarUri} avatarId={application.applicantAvatarId} />
        </Pressable>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{application.applicantName}</Text>
          {application.eventTitle ? <Text style={[styles.meta, { color: colors.cyan }]}>{application.eventTitle}</Text> : null}
          {accountLabel ? <Text style={[styles.meta, { color: colors.muted }]}>{accountLabel}</Text> : null}
        </View>
      </View>
      {loadErr ? <InlineErrorText message={loadErr} /> : null}
      {signedUrl ? (
        <Pressable onPress={() => setViewing(true)} accessibilityRole="button" accessibilityLabel="View payment screenshot">
          <Image source={{ uri: signedUrl }} style={styles.proofThumb} />
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={onApprove} style={[styles.btn, { backgroundColor: colors.magenta }]} accessibilityRole="button">
          <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemi, fontSize: 13 }}>Approve</Text>
        </Pressable>
        <Pressable onPress={onReject} style={[styles.btn, { borderColor: colors.danger, borderWidth: 1 }]} accessibilityRole="button">
          <Text style={{ color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 13 }}>Reject</Text>
        </Pressable>
      </View>
      <Modal visible={viewing} transparent animationType="fade" onRequestClose={() => setViewing(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setViewing(false)}>
          {signedUrl ? <Image source={{ uri: signedUrl }} style={styles.proofFull} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </BladeCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  proofThumb: { width: '100%', height: 160, borderRadius: radius.md, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, minHeight: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  proofFull: { width: '92%', height: '80%' },
});
