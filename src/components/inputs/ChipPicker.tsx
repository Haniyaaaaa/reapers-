import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CyberChip } from '../cyber/CyberChip';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';

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
        <CyberCutBox
          cutSize={10}
          radius={6}
          fill={colors.inputFill}
          borderColor={colors.inputBorder}
          borderWidth={0.88}
          style={styles.inputBox}
        >
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search tags"
            placeholderTextColor={colors.muted2}
            accessibilityLabel="Search tags"
            style={[styles.input, { color: colors.text }]}
          />
        </CyberCutBox>
      ) : null}
      <View style={styles.wrap}>
        {list.map((opt) => (
          <CyberChip key={opt} label={opt} selected={selected.includes(opt)} onPress={() => onToggle(opt)} />
        ))}
      </View>
      {allowCustom ? (
        <View style={styles.customRow}>
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.inputFill}
            borderColor={colors.inputBorder}
            borderWidth={0.88}
            style={[styles.inputBox, styles.customInputBox]}
          >
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder="Add your own tag"
              placeholderTextColor={colors.muted2}
              onSubmitEditing={addCustom}
              style={[styles.input, { color: colors.text }]}
            />
          </CyberCutBox>
          <Pressable onPress={addCustom} accessibilityRole="button" accessibilityLabel="Add tag" style={styles.addBtn}>
            <CyberCutBox gradient cutSize={8} radius={4} style={styles.addCut}>
              <View style={styles.addInner}>
                <Text style={styles.addText}>ADD</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputBox: { height: 44, marginBottom: 10 },
  customInputBox: { flex: 1, marginBottom: 0 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, paddingHorizontal: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
  addBtn: { width: 76, height: 44 },
  addCut: { width: '100%', height: '100%' },
  addInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 0.8, color: '#FFFFFF' },
});
