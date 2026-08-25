import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';
import { PrimaryButton } from '../buttons/PrimaryButton';

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
  extraActions,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  extraActions?: { label: string; onPress: () => void }[];
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>
          <PrimaryButton label={confirmLabel} onPress={onConfirm} />
          {extraActions?.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} style={styles.cancel} accessibilityRole="button">
              <Text style={[styles.extra, { color: colors.cyan }]}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
            <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 24,
    gap: 14,
  },
  title: { fontFamily: fonts.display, fontSize: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  extra: { fontFamily: fonts.bodyMed },
  cancelText: { fontFamily: fonts.bodyMed },
});
