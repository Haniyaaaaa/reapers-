import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';
import { useSingleFlight } from '../../hooks/useSingleFlight';

const DANGER_GRADIENT: [string, string, string] = ['#FF6B81', '#FF4D6D', '#B91C4C'];

/** App-wide confirm/action sheet, restyled to match the cyber chamfered-cut design used
 * throughout the rest of the app (CyberCutBox gradient CTAs) instead of the older rounded-pill
 * PrimaryButton — every screen that mounts this (post/comment/review/event/community/demo
 * delete, report flows) picks this up automatically since it's one shared component. */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
  extraActions,
  danger = true,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  /** If this returns a promise the sheet shows "Working…" and ignores every tap until it settles. */
  onConfirm: () => unknown;
  onClose: () => void;
  extraActions?: { label: string; onPress: () => void }[];
  /** Most call sites are destructive (delete) or a report/flag action — red reads correctly
   * for both, so it's the default. Pass false for a neutral confirm. */
  danger?: boolean;
}) {
  const { colors, light } = useTheme();
  const insets = useSafeAreaInsets();
  const { run, pending } = useSingleFlight(onConfirm);
  // A label that already reads as a status ("Booking…") is kept; otherwise show a generic one.
  const workingLabel = confirmLabel.endsWith('…') ? confirmLabel : 'Working…';
  const guardedClose = () => {
    if (!pending) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={guardedClose}>
      <Pressable style={styles.backdrop} onPress={guardedClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(28, insets.bottom + 16) },
          ]}
          onPress={() => undefined}
        >
          <View style={styles.grabberRow}>
            <View
              style={[
                styles.grabber,
                { backgroundColor: light ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.2)' },
              ]}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>

          <Pressable onPress={run} disabled={pending} style={[styles.confirmBtnWrap, pending && { opacity: 0.75 }]} accessibilityRole="button" accessibilityState={{ busy: pending }}>
            <CyberCutBox
              gradient
              gradientColors={danger ? DANGER_GRADIENT : undefined}
              cutSize={10}
              radius={6}
              style={styles.confirmCutBox}
            >
              <View style={styles.confirmInner}>
                {pending ? (
                  <View style={styles.workingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmText}>{workingLabel}</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                )}
              </View>
            </CyberCutBox>
          </Pressable>

          {extraActions?.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} disabled={pending} style={[styles.secondaryBtn, pending && { opacity: 0.4 }]} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.electricAccent }]}>{a.label}</Text>
            </Pressable>
          ))}

          <Pressable onPress={guardedClose} disabled={pending} style={[styles.secondaryBtn, pending && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={[styles.cancelText, { color: colors.muted }]}>{cancelText(confirmLabel)}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function cancelText(_label?: string) {
  return 'Cancel';
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    // paddingBottom set inline — needs the device's safe-area inset (gesture bar / home
    // indicator), which isn't known until render.
  },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  confirmBtnWrap: { width: '100%', height: 50 },
  confirmCutBox: { width: '100%', height: '100%' },
  confirmInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  workingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  secondaryBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  cancelText: { fontFamily: fonts.bodyMed, fontSize: 14 },
});
