import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarRing } from '../avatars/AvatarRing';
import { useProfilePreviewStore } from '../../store/profilePreviewStore';
import { fonts, radius, useTheme } from '../../theme';
import { formatTime } from '../../utils/format';
import type { ChatMessage } from '../../types/chat';

export function MessageInfoSheet({
  message,
  onClose,
}: {
  message: ChatMessage | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!message) return null;

  const read = (message.receipts ?? []).filter((r) => r.readAt);
  const deliveredOnly = (message.receipts ?? []).filter((r) => !r.readAt);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.top}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.hit}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Message info</Text>
          <View style={styles.hit} />
        </View>

        <View style={[styles.preview, { backgroundColor: message.mine ? colors.magentaDeep : colors.surface }]}>
          <Text style={{ color: colors.text, fontFamily: fonts.body }}>{message.kind === 'gif' ? 'GIF' : message.content}</Text>
          <Text style={{ color: colors.muted2, fontFamily: fonts.mono, fontSize: 10, marginTop: 4 }}>{formatTime(message.createdAt)}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 16 }}>
          <View>
            <View style={styles.sectionHead}>
              <Ionicons name="checkmark-done" size={18} color={colors.cyan} />
              <Text style={[styles.h, { color: colors.text }]}>Read</Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{read.length}</Text>
            </View>
            {read.length === 0 ? (
              <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 8 }}>No one has seen this yet.</Text>
            ) : (
              read.map((r) => (
                <Pressable key={r.userId} onPress={() => useProfilePreviewStore.getState().open(r.userId)} style={styles.row} accessibilityRole="button">
                  <AvatarRing name={r.name} size={44} avatarId={r.avatarId} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{r.name}</Text>
                    <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Seen {formatTime(r.readAt!)}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View>
            <View style={styles.sectionHead}>
              <Ionicons name="checkmark-done" size={18} color={colors.muted} />
              <Text style={[styles.h, { color: colors.text }]}>Delivered</Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.body }}>{deliveredOnly.length}</Text>
            </View>
            {deliveredOnly.length === 0 ? (
              <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 8 }}>Everyone who got it has also seen it.</Text>
            ) : (
              deliveredOnly.map((r) => (
                <Pressable key={r.userId} onPress={() => useProfilePreviewStore.getState().open(r.userId)} style={styles.row} accessibilityRole="button">
                  <AvatarRing name={r.name} size={44} avatarId={r.avatarId} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{r.name}</Text>
                    <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Delivered {formatTime(r.deliveredAt)}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 18 },
  preview: { margin: 16, borderRadius: radius.md, padding: 12, alignSelf: 'flex-end', maxWidth: '82%' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  h: { fontFamily: fonts.display, fontSize: 18, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
});
