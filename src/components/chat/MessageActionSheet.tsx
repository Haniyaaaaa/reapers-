import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmojiPickerTray } from './EmojiPickerTray';
import { quickReactions } from '../../data/emojiCatalog';
import { fonts, radius, useTheme } from '../../theme';
import type { ChatMessage } from '../../types/chat';

type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; danger?: boolean; hide?: boolean };

export function MessageActionSheet({
  message,
  moreEmoji,
  onClose,
  onReact,
  onReply,
  onForward,
  onCopy,
  onInfo,
  onStar,
  onPin,
  onDelete,
  onEdit,
  onOpenEmoji,
}: {
  message: ChatMessage | null;
  moreEmoji: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onInfo: () => void;
  onStar: () => void;
  onPin: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpenEmoji: () => void;
}) {
  const { colors } = useTheme();
  if (!message) return null;

  const rows: Action[] = [
    { key: 'reply', label: 'Reply', icon: 'arrow-undo-outline' },
    { key: 'forward', label: 'Forward', icon: 'arrow-redo-outline' },
    { key: 'copy', label: 'Copy', icon: 'copy-outline' },
    { key: 'info', label: 'Info', icon: 'information-circle-outline' },
    { key: 'star', label: message.starred ? 'Unstar' : 'Star', icon: message.starred ? 'star' : 'star-outline' },
    { key: 'pin', label: message.pinned ? 'Unpin' : 'Pin', icon: 'pin-outline' },
    { key: 'edit', label: 'Edit', icon: 'create-outline', hide: !message.mine || message.deleted || message.kind === 'gif' },
    { key: 'delete', label: 'Delete', icon: 'trash-outline', danger: true, hide: !message.mine || message.deleted },
  ];

  const run = (key: string) => {
    if (key === 'reply') onReply();
    if (key === 'forward') onForward();
    if (key === 'copy') onCopy();
    if (key === 'info') onInfo();
    if (key === 'star') onStar();
    if (key === 'pin') onPin();
    if (key === 'edit') onEdit();
    if (key === 'delete') onDelete();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => undefined}
        >
          {moreEmoji ? (
            <View style={{ width: 280, maxHeight: 320 }}>
              <EmojiPickerTray
                onPick={(e) => {
                  onReact(e);
                }}
              />
            </View>
          ) : (
            <>
              <View style={[styles.reactBar, { backgroundColor: colors.surface }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactRow} style={{ flex: 1 }}>
                  {quickReactions.map((e) => (
                    <Pressable key={e} onPress={() => onReact(e)} style={styles.reactBtn} accessibilityRole="button">
                      <Text style={{ fontSize: 22 }}>{e}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={onOpenEmoji}
                  style={[styles.plus, { backgroundColor: '#3A3A3C' }]}
                  accessibilityRole="button"
                  accessibilityLabel="More emoji"
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </Pressable>
              </View>
              {rows
                .filter((r) => !r.hide)
                .map((r) => (
                  <Pressable key={r.key} onPress={() => run(r.key)} style={styles.row} accessibilityRole="button">
                    <Text style={[styles.label, { color: r.danger ? colors.danger : colors.text }]}>{r.label}</Text>
                    <Ionicons name={r.icon} size={18} color={r.danger ? colors.danger : colors.text} />
                  </Pressable>
                ))}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  card: {
    width: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  reactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    margin: 10,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 44,
  },
  reactRow: { alignItems: 'center', paddingRight: 4 },
  reactBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontFamily: fonts.body, fontSize: 16 },
});
