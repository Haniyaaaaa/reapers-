import { useEffect, useRef } from 'react';
import { Animated, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { fonts, useTheme } from '../../theme';

export type ListPickerOption = { key: string; label: string; hint?: string; disabled?: boolean };

const ROW_HEIGHT = 56;

/** Bottom-sheet list picker: one tap on a row picks it and closes. Drag the header down (or tap
 * the backdrop / X) to dismiss without choosing. */
export function ListPickerSheet({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: ListPickerOption[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { panHandlers, sheetStyle } = useSwipeToDismiss(visible, onClose);
  const listRef = useRef<FlatList<ListPickerOption>>(null);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.key === selectedKey));

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false, viewPosition: 0.3 });
    }, 50);
    return () => clearTimeout(t);
  }, [visible, selectedIndex]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          onStartShouldSetResponder={() => true}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }, sheetStyle]}
        >
          <View {...panHandlers}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            </View>
            <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={options}
            keyExtractor={(o) => o.key}
            getItemLayout={(_, i) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * i, index: i })}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => undefined}
            renderItem={({ item }) => {
              const on = item.key === selectedKey;
              return (
                <Pressable
                  disabled={item.disabled}
                  onPress={() => {
                    onSelect(item.key);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: item.disabled }}
                  style={[
                    styles.row,
                    { backgroundColor: on ? 'rgba(109, 53, 255, 0.22)' : colors.cardFill, borderColor: on ? '#8B5CF6' : colors.cardBorder },
                    item.disabled && { opacity: 0.35 },
                  ]}
                >
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                  {item.hint ? <Text style={[styles.rowHint, { color: colors.muted }]}>{item.hint}</Text> : null}
                </Pressable>
              );
            }}
          />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: { height: '72%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1 },
  grabberRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '800' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  row: {
    height: ROW_HEIGHT - 8,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontFamily: fonts.bodySemi, fontSize: 16, fontWeight: '700' },
  rowHint: { fontFamily: fonts.mono, fontSize: 12 },
});
