import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

type Props = {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  allowCustom?: boolean;
};

export function ChipPicker({ options, selected, onToggle, searchable, allowCustom }: Props) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState('');
  const list = useMemo(() => {
    const extra = selected.filter((s) => !options.includes(s));
    const all = [...options, ...extra];
    const n = q.trim().toLowerCase();
    if (!n) return all;
    return all.filter((o) => o.toLowerCase().includes(n));
  }, [options, q, selected]);

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    if (!selected.includes(v)) onToggle(v);
    setCustom('');
  };

  return (
    <View>
      {searchable ? (
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search tags"
          placeholderTextColor={colors.muted2}
          accessibilityLabel="Search tags"
          style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
        />
      ) : null}
      <View style={styles.wrap}>
        {list.map((opt) => {
          const on = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onToggle(opt)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.chip,
                { borderColor: colors.border },
                on && { backgroundColor: colors.magentaDeep, borderColor: colors.magenta },
              ]}
            >
              <Text style={{ color: on ? colors.text : colors.muted, fontFamily: fonts.bodyMed, fontSize: 13 }}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {allowCustom ? (
        <View style={styles.customRow}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder="Add your own tag"
            placeholderTextColor={colors.muted2}
            onSubmitEditing={addCustom}
            style={[styles.search, { flex: 1, marginBottom: 0, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          />
          <Pressable onPress={addCustom} style={[styles.add, { backgroundColor: colors.magenta }]} accessibilityRole="button">
            <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemi }}>Add</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    fontFamily: fonts.body,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  add: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center' },
});
