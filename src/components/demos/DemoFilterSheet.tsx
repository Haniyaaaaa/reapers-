import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CyberChip } from '../cyber/CyberChip';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { DEMO_ENGINES, DEMO_GENRES, DEMO_PLATFORMS, DEMO_TAGS } from '../../data/demoOptions';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { listDemoFacets } from '../../services/supabase/demos';
import { GlassBackground } from '../glass/GlassSurface';
import { SheetCloseButton } from '../glass/SheetCloseButton';
import { fonts, useTheme } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/layout/KeyboardAwareScrollView';

export type DemoFilterSelection = { genres: string[]; engines: string[]; platforms: string[]; tags: string[] };
export const EMPTY_DEMO_FILTERS: DemoFilterSelection = { genres: [], engines: [], platforms: [], tags: [] };

/** Presets first (same order as the upload form), then anything else actually in use. */
function merge(presets: string[], seen: string[] = []): string[] {
  return [...presets, ...seen.filter((v) => !presets.includes(v))];
}

/** Filter sheet for the demo feed — one section per thing you pick at upload (Genre, Engine,
 * Platforms, Tags), including custom values other developers have added. Picks apply as OR
 * within a section and AND across sections. */
export function DemoFilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: DemoFilterSelection;
  onApply: (next: DemoFilterSelection) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  // Sheet height is capped to the screen; the chip list scrolls in the room left after the header and
  // the Clear / Show buttons (~200pt).
  const { height: winH } = useWindowDimensions();
  const maxSheet = winH * 0.88;
  const bodyMax = Math.max(180, maxSheet - 200);
  const [draft, setDraft] = useState<DemoFilterSelection>(value);
  const [facets, setFacets] = useState<Partial<DemoFilterSelection>>({});
  const { panHandlers, sheetStyle } = useSwipeToDismiss(visible, onClose);
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    setCustomTag('');
    listDemoFacets().then(setFacets).catch(() => undefined);
  }, [visible, value]);

  const toggle = (key: keyof DemoFilterSelection, v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }));

  // Any tag typed here is selected as a filter even if no demo (or preset) has it yet, and stays
  // visible as a chip so it can be toggled off again.
  const addCustomTag = () => {
    const t = customTag.trim().toUpperCase();
    if (!t) return;
    setDraft((d) => (d.tags.includes(t) ? d : { ...d, tags: [...d.tags, t] }));
    setCustomTag('');
  };

  const sections: { key: keyof DemoFilterSelection; title: string; options: string[] }[] = [
    { key: 'genres', title: 'GENRE', options: merge(DEMO_GENRES, facets.genres) },
    { key: 'engines', title: 'ENGINE', options: merge(DEMO_ENGINES, facets.engines) },
    { key: 'platforms', title: 'PLATFORMS', options: merge(DEMO_PLATFORMS, facets.platforms) },
    { key: 'tags', title: 'TAGS', options: merge(merge(DEMO_TAGS, facets.tags), draft.tags) },
  ];
  const count = draft.genres.length + draft.engines.length + draft.platforms.length + draft.tags.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          // Swallows taps on the sheet's empty areas so they don't fall through to the backdrop and close it.
          onStartShouldSetResponder={() => true}
          style={[styles.sheet, { maxHeight: maxSheet }, sheetStyle]}
        >
          <GlassBackground topRadius={20} sheet />
          {/* Drag this top area down to close — kept off the scrolling chips so it can't fight the scroll. */}
          <View {...panHandlers}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>Filter demos</Text>
              <View style={styles.headerActions}>
                <Text style={[styles.count, { color: colors.muted2 }]}>{count} selected</Text>
                <SheetCloseButton onPress={onClose} />
              </View>
            </View>
          </View>

          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={[styles.body, { maxHeight: bodyMax }]} showsVerticalScrollIndicator={false}>
            {sections.map((s) => (
              <View key={s.key} style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.muted }]}>{s.title}</Text>
                  <Text style={[styles.count, { color: colors.muted2 }]}>{draft[s.key].length > 0 ? `${draft[s.key].length} selected` : ''}</Text>
                </View>
                <View style={styles.chips}>
                  {s.options.map((o) => (
                    <CyberChip key={o} label={o} selected={draft[s.key].includes(o)} onPress={() => toggle(s.key, o)} />
                  ))}
                </View>
                {s.key === 'tags' ? (
                  <View style={styles.customRow}>
                    <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.customInputCut}>
                      <TextInput
                        value={customTag}
                        onChangeText={setCustomTag}
                        placeholder="Filter by your own tag"
                        placeholderTextColor={colors.muted2}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        onSubmitEditing={addCustomTag}
                        style={[styles.customInput, { color: colors.text }]}
                      />
                    </CyberCutBox>
                    <Pressable onPress={addCustomTag} style={styles.customAddTouch} accessibilityRole="button" accessibilityLabel="Add tag filter">
                      <CyberCutBox gradient cutSize={6} radius={4} style={styles.btnCut}>
                        <Text style={styles.applyText}>ADD</Text>
                      </CyberCutBox>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </KeyboardAwareScrollView>

          <View style={styles.footer}>
            <Pressable onPress={() => setDraft(EMPTY_DEMO_FILTERS)} style={styles.clearTouch} accessibilityRole="button">
              <CyberCutBox cutSize={8} radius={4} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.btnCut}>
                <Text style={[styles.clearText, { color: colors.muted }]}>Clear</Text>
              </CyberCutBox>
            </Pressable>
            <Pressable onPress={() => { onApply(draft); onClose(); }} style={styles.applyTouch} accessibilityRole="button">
              <CyberCutBox gradient cutSize={8} radius={4} style={styles.btnCut}>
                <Text style={styles.applyText}>{count > 0 ? `Show demos (${count})` : 'Show all demos'}</Text>
              </CyberCutBox>
            </Pressable>
          </View>
        </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingHorizontal: 16, paddingBottom: 24 },
  grabberRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 14 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 20, fontWeight: '800' },
  body: { flexGrow: 0 },
  section: { marginTop: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  count: { fontFamily: fonts.mono, fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  customInputCut: { flex: 1, height: 40 },
  customInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 12, paddingVertical: 0 },
  customAddTouch: { width: 64, height: 40 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  clearTouch: { width: 96, height: 46 },
  applyTouch: { flex: 1, height: 46 },
  btnCut: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 14 },
  applyText: { fontFamily: fonts.bodySemi, fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});
