import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarRing } from '../avatars/AvatarRing';
import { fonts, radius, useTheme } from '../../theme';
import type { Chatroom } from '../../types/chat';

type Target = { id: string; name: string; subtitle: string; avatarId?: string; logo?: Chatroom['logo'] };

export function ForwardSendTo({
  visible,
  rooms,
  frequent,
  excludeRoomId,
  onClose,
  onSend,
}: {
  visible: boolean;
  rooms: Chatroom[];
  frequent: Target[];
  excludeRoomId?: string;
  onClose: () => void;
  onSend: (roomIds: string[]) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const recent = useMemo(
    () =>
      rooms
        .filter((r) => r.joined && r.id !== excludeRoomId)
        .map((r) => ({
          id: r.id,
          name: r.name,
          subtitle: r.lastMessage || r.description,
          avatarId: r.kind === 'dm' ? r.peerId : undefined,
          logo: r.logo,
        })),
    [rooms, excludeRoomId],
  );

  const needle = q.trim().toLowerCase();
  const filter = (list: Target[]) => list.filter((t) => !needle || t.name.toLowerCase().includes(needle) || t.subtitle.toLowerCase().includes(needle));

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const close = () => {
    setPicked([]);
    setQ('');
    onClose();
  };

  const Row = ({ item }: { item: Target }) => {
    const on = picked.includes(item.id);
    return (
      <Pressable onPress={() => toggle(item.id)} style={styles.row} accessibilityRole="button" accessibilityState={{ selected: on }}>
        <AvatarRing name={item.name} size={48} avatarId={item.avatarId} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{item.name}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        <View style={[styles.circle, { borderColor: on ? colors.magenta : colors.muted2, backgroundColor: on ? colors.magenta : 'transparent' }]}>
          {on ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.nav}>
          <Pressable onPress={close} style={styles.navBtn} accessibilityRole="button">
            <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi }}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Send to</Text>
          <Pressable
            onPress={() => {
              if (!picked.length) return;
              onSend(picked);
              close();
            }}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <Ionicons name="send" size={18} color={picked.length ? colors.cyan : colors.muted2} />
          </Pressable>
        </View>

        <View style={[styles.search, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search"
            placeholderTextColor={colors.muted2}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 88, gap: 16 }}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.kicker, { color: colors.muted }]}>Frequently contacted</Text>
            {filter(frequent).map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.kicker, { color: colors.muted }]}>Recent chats</Text>
            {filter(recent).map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>

        {picked.length > 0 ? (
          <View style={[styles.bottom, { backgroundColor: colors.charcoal, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Ionicons name="arrow-redo" size={22} color={colors.cyan} />
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, flex: 1, textAlign: 'center' }}>
              {picked.length} Selected
            </Text>
            <Pressable
              onPress={() => {
                onSend(picked);
                close();
              }}
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={22} color={colors.cyan} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: { minWidth: 72, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { fontFamily: fonts.display, fontSize: 18 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.md,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, minHeight: 40 },
  card: { borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, marginBottom: 4, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 56,
  },
});
