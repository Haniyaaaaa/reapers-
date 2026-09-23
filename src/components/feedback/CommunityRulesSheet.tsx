import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';
import { useSingleFlight } from '../../hooks/useSingleFlight';

/** Shown before joining a community that has rules set (CreateCommunityScreen collects them,
 * but nothing used to surface them — joining just happened silently). Cancel leaves you not
 * joined; Agree & Join actually joins. */
export function CommunityRulesSheet({
  visible,
  communityName,
  rules,
  onAgree,
  onClose,
}: {
  visible: boolean;
  communityName: string;
  rules: string;
  onAgree: () => unknown;
  onClose: () => void;
}) {
  const { colors, light } = useTheme();
  const insets = useSafeAreaInsets();
  const { run, pending } = useSingleFlight(onAgree);
  const guardedClose = () => {
    if (!pending) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={guardedClose}>
      <Pressable style={styles.backdrop} onPress={guardedClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(28, insets.bottom + 16) }]} onPress={() => undefined}>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: light ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.2)' }]} />
          </View>

          <View style={styles.headerRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.cyan} />
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {communityName} rules
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Read and agree before joining</Text>

          <ScrollView style={styles.rulesScroll} contentContainerStyle={{ paddingVertical: 4 }}>
            <Text style={[styles.rulesText, { color: colors.text }]}>{rules}</Text>
          </ScrollView>

          <Pressable onPress={run} disabled={pending} style={[styles.confirmBtnWrap, pending && { opacity: 0.75 }]} accessibilityRole="button" accessibilityState={{ busy: pending }}>
            <CyberCutBox gradient cutSize={10} radius={6} style={styles.confirmCutBox}>
              <View style={styles.confirmInner}>
                {pending ? (
                  <View style={styles.workingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmText}>Joining…</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmText}>Agree & Join</Text>
                )}
              </View>
            </CyberCutBox>
          </Pressable>

          <Pressable onPress={guardedClose} disabled={pending} style={[styles.secondaryBtn, pending && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, padding: 20, maxHeight: '78%' },
  grabberRow: { alignItems: 'center', marginBottom: 14 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 17, fontWeight: '700' },
  subtitle: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 4, marginBottom: 14 },
  rulesScroll: { maxHeight: 260, marginBottom: 18 },
  rulesText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  confirmBtnWrap: {},
  confirmCutBox: { height: 48 },
  confirmInner: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  workingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { fontFamily: fonts.bodySemi, fontSize: 15, color: '#FFFFFF' },
  secondaryBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  secondaryText: { fontFamily: fonts.bodyMed, fontSize: 14 },
});
