import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { emojiCategories, searchEmojis } from '../../data/emojiCatalog';
import { fonts, radius, useTheme } from '../../theme';

export function EmojiPickerTray({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(emojiCategories[0].id);

  const results = useMemo(() => (q.trim() ? searchEmojis(q) : emojiCategories.find((c) => c.id === cat)?.items ?? []), [q, cat]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search emoji"
        placeholderTextColor={colors.muted2}
        style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        autoCorrect={false}
      />
      {!q.trim() ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {emojiCategories.map((c) => {
            const on = c.id === cat;
            return (
              <Pressable key={c.id} onPress={() => setCat(c.id)} style={[styles.chip, { backgroundColor: on ? colors.magentaDeep : colors.surfaceElevated }]}>
                <Text style={{ color: on ? colors.text : colors.muted, fontFamily: fonts.bodyMed, fontSize: 11 }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
        {results.map((item, i) => (
          <Pressable key={`${item.e}-${i}`} onPress={() => onPick(item.e)} style={styles.cell} accessibilityRole="button" accessibilityLabel={item.k}>
            <Text style={styles.glyph}>{item.e}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radius.md, padding: 10, marginBottom: 8, maxHeight: 280 },
  search: { borderWidth: 1, borderRadius: radius.pill, minHeight: 40, paddingHorizontal: 12, fontFamily: fonts.body, marginBottom: 8 },
  cats: { gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  gridScroll: { maxHeight: 180 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 22 },
});
