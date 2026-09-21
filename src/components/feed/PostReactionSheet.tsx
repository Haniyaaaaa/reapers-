import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EmojiPickerTray } from '../chat/EmojiPickerTray';
import { quickReactions } from '../../data/emojiCatalog';
import { radius, useTheme } from '../../theme';

/** The reaction-picking half of chat's MessageActionSheet, lifted out on its own — posts have
 * no reply/forward/pin/star/edit actions, so reusing the full message action sheet would mean
 * gating away most of its rows rather than genuinely reusing it. Same quickReactions strip +
 * EmojiPickerTray "+" full picker, just with no message-specific rows attached. */
export function PostReactionSheet({ visible, onReact, onClose }: { visible: boolean; onReact: (emoji: string) => void; onClose: () => void }) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.surfaceElevated }]} onPress={() => undefined}>
          <View style={{ width: 280, maxHeight: 320 }}>
            <EmojiPickerTray
              onPick={(e) => {
                onReact(e);
                onClose();
              }}
              onClose={onClose}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** The always-visible quick-reaction strip attached under a post's footer — tapping an emoji
 * here toggles it directly; the "+" opens the full PostReactionSheet picker above. */
export function QuickReactionBar({ onReact, onOpenFull }: { onReact: (emoji: string) => void; onOpenFull: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.reactBar, { backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactRow} style={{ flex: 1 }}>
        {quickReactions.map((e) => (
          <Pressable key={e} onPress={() => onReact(e)} style={styles.reactBtn} accessibilityRole="button">
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={onOpenFull} style={[styles.plus, { backgroundColor: '#3A3A3C' }]} accessibilityRole="button" accessibilityLabel="More emoji">
        <Ionicons name="add" size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  card: { width: 280, borderRadius: radius.lg, overflow: 'hidden', maxWidth: '100%' },
  reactBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingLeft: 4, paddingRight: 4, paddingVertical: 4, minHeight: 40 },
  reactRow: { alignItems: 'center', paddingRight: 4 },
  reactBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});
