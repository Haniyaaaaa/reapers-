import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { GlassSurface } from '../glass/GlassSurface';
import { SheetCloseButton } from '../glass/SheetCloseButton';
import { fonts, useTheme } from '../../theme';
import {
  EMPTY_TEAM_FILTERS,
  ENGINE_OPTIONS,
  ROLE_OPTIONS,
  TEAM_DATE_OPTIONS,
  WORK_MODE_OPTIONS,
  titleCase,
  type TeamFilterSelection,
} from '../../utils/teamRequest';

const CUSTOM_DAYS_AHEAD = 60;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(d: Date, today: Date): string {
  if (d.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
}

/** Filter sheet for Find Teammates: when the role is needed, where (onsite / remote / hybrid or a
 * typed city), the role itself (presets or typed), and the engine. Same look as the events filter. */
export function TeamFilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: TeamFilterSelection;
  onApply: (next: TeamFilterSelection) => void;
  onClose: () => void;
}) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const { panHandlers, sheetStyle } = useSwipeToDismiss(visible, onClose);
  // The sheet never grows taller than the screen; the filter list scrolls in the room left after the
  // header and the Apply buttons (~230pt).
  const { height: winH } = useWindowDimensions();
  const maxSheet = winH * 0.88;
  const bodyMax = Math.max(180, maxSheet - 230);
  const [draft, setDraft] = useState<TeamFilterSelection>(value);
  const [customRole, setCustomRole] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setCustomRole('');
    }
  }, [visible, value]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: CUSTOM_DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const customDate = draft.customDate ? new Date(draft.customDate) : today;

  const toggle = <K extends 'workModes' | 'roles' | 'engines'>(key: K, v: TeamFilterSelection[K][number]) =>
    setDraft((d) => {
      const list = d[key] as string[];
      return { ...d, [key]: list.includes(v as string) ? list.filter((x) => x !== v) : [...list, v as string] };
    });

  const addCustomRole = () => {
    const r = titleCase(customRole);
    if (!r) return;
    setDraft((d) => (d.roles.includes(r) ? d : { ...d, roles: [...d.roles, r] }));
    setCustomRole('');
  };

  const idleFill = isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)';
  const idleBorder = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)';
  const idleText = isLight ? colors.text : '#8E9BB5';

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={styles.chipBtn} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <CyberCutBox
        gradient={active}
        cutSize={8}
        radius={4}
        fill={active ? undefined : idleFill}
        borderColor={active ? undefined : idleBorder}
        borderWidth={active ? 0 : 0.88}
        style={styles.chipCut}
      >
        <View style={styles.chipInner}>
          <Text style={[styles.chipText, { color: active ? '#FFFFFF' : idleText }, active && styles.chipTextActive]}>{label.toUpperCase()}</Text>
        </View>
      </CyberCutBox>
    </Pressable>
  );

  const roleOptions = [...ROLE_OPTIONS, ...draft.roles.filter((r) => !ROLE_OPTIONS.includes(r))];

  const inputBox = (children: React.ReactNode) => (
    <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.inputCut}>
      {children}
    </CyberCutBox>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.45)' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View onStartShouldSetResponder={() => true} style={[{ maxHeight: maxSheet }, sheetStyle]}>
            <GlassSurface sheet radius={26} style={styles.modalBox}>
              <View style={[styles.modalInner, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
                <View {...panHandlers}>
                  <View style={styles.handleWrap}>
                    <View style={[styles.handleBar, { backgroundColor: isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.25)' }]} />
                  </View>
                  <View style={styles.headerRow}>
                    <View style={styles.titleWrap}>
                      <Text style={[styles.titleText, { color: colors.text }]}>Filter</Text>
                      <LinearGradient colors={['#00E5FF', '#D83CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accentLine} />
                    </View>
                    <SheetCloseButton onPress={onClose} />
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: bodyMax }} contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
                  {/* DATE — when is this role needed */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATE · WHEN IS THE ROLE NEEDED</Text>
                    <View style={styles.chipGrid}>
                      {TEAM_DATE_OPTIONS.map((opt) => (
                        <Chip
                          key={opt}
                          label={opt}
                          active={draft.date === opt}
                          onPress={() => setDraft((d) => ({ ...d, date: d.date === opt ? null : opt, customDate: opt === 'CUSTOM' ? d.customDate ?? today.toISOString() : d.customDate }))}
                        />
                      ))}
                    </View>
                    {draft.date === 'CUSTOM' ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                        {days.map((d) => {
                          const active = d.toDateString() === customDate.toDateString();
                          return (
                            <Pressable key={d.toISOString()} onPress={() => setDraft((x) => ({ ...x, customDate: d.toISOString() }))} accessibilityRole="button">
                              <CyberCutBox
                                gradient={active}
                                cutSize={6}
                                radius={4}
                                fill={active ? undefined : idleFill}
                                borderColor={active ? undefined : idleBorder}
                                borderWidth={active ? 0 : 0.88}
                                style={styles.dayCut}
                              >
                                <Text style={[styles.dayText, { color: active ? '#FFFFFF' : idleText }, active && styles.chipTextActive]}>{dayLabel(d, today)}</Text>
                              </CyberCutBox>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : null}
                  </View>

                  {/* LOCATION — onsite / remote / hybrid, or a city */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>LOCATION</Text>
                    <View style={styles.chipGrid}>
                      {WORK_MODE_OPTIONS.map((o) => (
                        <Chip key={o.value} label={o.label} active={draft.workModes.includes(o.value)} onPress={() => toggle('workModes', o.value)} />
                      ))}
                    </View>
                    {inputBox(
                      <TextInput
                        value={draft.city}
                        onChangeText={(v) => setDraft((d) => ({ ...d, city: v.slice(0, 60) }))}
                        placeholder="Or type a city, e.g. Karachi"
                        placeholderTextColor={colors.muted2}
                        style={[styles.input, { color: colors.text }]}
                      />,
                    )}
                  </View>

                  {/* CATEGORY → ROLE NEEDED */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>CATEGORY · ROLE NEEDED</Text>
                    <View style={styles.chipGrid}>
                      {roleOptions.map((r) => (
                        <Chip key={r} label={r} active={draft.roles.includes(r)} onPress={() => toggle('roles', r)} />
                      ))}
                    </View>
                    <View style={styles.customRow}>
                      <View style={{ flex: 1 }}>
                        {inputBox(
                          <TextInput
                            value={customRole}
                            onChangeText={setCustomRole}
                            placeholder="Type another role"
                            placeholderTextColor={colors.muted2}
                            onSubmitEditing={addCustomRole}
                            style={[styles.input, { color: colors.text }]}
                          />,
                        )}
                      </View>
                      <Pressable onPress={addCustomRole} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add role">
                        <CyberCutBox gradient cutSize={6} radius={4} style={styles.addCut}>
                          <Text style={styles.addText}>ADD</Text>
                        </CyberCutBox>
                      </Pressable>
                    </View>
                  </View>

                  {/* ENGINE */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>ENGINE</Text>
                    <View style={styles.chipGrid}>
                      {ENGINE_OPTIONS.map((e) => (
                        <Chip key={e} label={e} active={draft.engines.includes(e)} onPress={() => toggle('engines', e)} />
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <View style={[styles.divider, { backgroundColor: isLight ? colors.border : 'rgba(255, 255, 255, 0.08)' }]} />
                <View style={styles.footerRow}>
                  <Pressable onPress={() => setDraft(EMPTY_TEAM_FILTERS)} style={styles.resetBtn} accessibilityRole="button">
                    <CyberCutBox cutSize={8} radius={4} fill={idleFill} borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)'} borderWidth={1} style={styles.footerCut}>
                      <Text style={[styles.resetText, { color: colors.text }]}>Reset</Text>
                    </CyberCutBox>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onApply(draft);
                      onClose();
                    }}
                    style={styles.applyBtn}
                    accessibilityRole="button"
                  >
                    <CyberCutBox gradient cutSize={8} radius={4} style={styles.footerCut}>
                      <Text style={styles.applyText}>Show Results</Text>
                    </CyberCutBox>
                  </Pressable>
                </View>
              </View>
            </GlassSurface>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalBox: { width: '100%' },
  modalInner: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  handleWrap: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  titleWrap: { alignItems: 'flex-start', gap: 4 },
  titleText: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  accentLine: { width: 32, height: 2, borderRadius: 1 },
  section: { gap: 8 },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipBtn: { height: 38, flexBasis: '30%', flexGrow: 1 },
  chipCut: { width: '100%', height: 38 },
  chipInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  chipText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.4 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  dayCut: { height: 36, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontFamily: fonts.mono, fontSize: 11 },
  inputCut: { height: 42 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 12, paddingVertical: 0 },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { width: 64, height: 42 },
  addCut: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8, color: '#FFFFFF' },
  divider: { height: 1, marginVertical: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resetBtn: { width: 100, height: 44 },
  applyBtn: { flex: 1, height: 44 },
  footerCut: { width: '100%', height: 44, justifyContent: 'center', alignItems: 'center' },
  resetText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  applyText: { fontFamily: fonts.bodySemi, fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
});
