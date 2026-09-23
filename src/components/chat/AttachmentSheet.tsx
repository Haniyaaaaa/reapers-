import { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts } from '../../theme';

type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };

const ACTIONS: Action[] = [
  { key: 'media', label: 'Photo & Video', icon: 'image-outline', color: '#00E5FF' },
  { key: 'camera', label: 'Camera', icon: 'camera-outline', color: '#D83CFF' },
  { key: 'sticker', label: 'Sticker', icon: 'happy-outline', color: '#F5C542' },
  { key: 'gif', label: 'GIF', icon: 'planet-outline', color: '#6D35FF' },
];

/** The chat dock's "+" button opens this — was previously wired to state (`attaching`) with
 * nothing rendering it, so the button did nothing. Same bottom-sheet convention as
 * ConfirmSheet/PostCommentsSheet (dark cyber palette, grabber, backdrop-to-close). */
export function AttachmentSheet({
  visible,
  onClose,
  onPickMedia,
  onCapture,
  onPickSticker,
  onOpenGif,
}: {
  visible: boolean;
  onClose: () => void;
  onPickMedia: () => void;
  onCapture: () => void;
  /** Sends a picture straight from the person's own photo library as a sticker — no bubble
   * chrome, transparency preserved — rather than only offering the built-in GIF catalog. */
  onPickSticker: () => void;
  onOpenGif: () => void;
}) {
  // iOS can't present a native screen (photo picker, camera, permission alert) while this Modal is
  // still animating away — the picker silently never appears. So picking an action closes the sheet
  // first and the action runs once the dismissal has finished (Modal `onDismiss`, iOS-only; other
  // platforms have no such restriction and run it right away).
  const insets = useSafeAreaInsets();
  const pending = useRef<string | null>(null);

  const run = (key: string) => {
    if (key === 'media') onPickMedia();
    else if (key === 'camera') onCapture();
    else if (key === 'sticker') onPickSticker();
    else if (key === 'gif') onOpenGif();
  };

  const flush = () => {
    const key = pending.current;
    pending.current = null;
    if (key) run(key);
  };

  const choose = (key: string) => {
    pending.current = key;
    onClose();
    if (Platform.OS !== 'ios') flush();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onDismiss={flush}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(28, insets.bottom + 16) }]} onPress={() => undefined}>
          <View style={styles.grabberRow}>
            <View style={styles.grabber} />
          </View>
          {ACTIONS.map((a) => (
            <Pressable key={a.key} onPress={() => choose(a.key)} style={styles.row} accessibilityRole="button">
              <View style={[styles.iconBox, { backgroundColor: `${a.color}20` }]}>
                <Ionicons name={a.icon} size={19} color={a.color} />
              </View>
              <Text style={styles.rowText}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancelBtn} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: '#0E1423',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
  },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontFamily: fonts.bodySemi, fontSize: 14.5, color: '#FFFFFF' },
  cancelBtn: { marginTop: 8, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  cancelText: { fontFamily: fonts.bodyMed, fontSize: 14, color: '#8E9BB5' },
});
