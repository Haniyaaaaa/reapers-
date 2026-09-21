import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { GlassBackground } from '../../../components/glass/GlassSurface';
import { SheetCloseButton } from '../../../components/glass/SheetCloseButton';
import { useSwipeToDismiss } from '../../../hooks/useSwipeToDismiss';
import { fonts, useTheme } from '../../../theme';

export type CommunitySort = 'default' | 'members' | 'name';

export type CommunityFilters = {
  sort: CommunitySort;
  /** Minimum member count; 0 = any size. */
  minMembers: number;
  location: string | null;
};

export const EMPTY_COMMUNITY_FILTERS: CommunityFilters = { sort: 'default', minMembers: 0, location: null };

export function communityFilterCount(f: CommunityFilters): number {
  return (f.sort !== 'default' ? 1 : 0) + (f.minMembers > 0 ? 1 : 0) + (f.location ? 1 : 0);
}

/** Cities offered up front; anything else can be typed. */
export const PRESET_CITIES = ['Lahore', 'Islamabad', 'Karachi'];

/** Case-insensitive "contains", so "Lahore" matches a community listed as "Lahore, PK". */
export function matchesCommunityLocation(communityLocation: string | undefined, filterLocation: string | null): boolean {
  if (!filterLocation) return true;
  return (communityLocation ?? '').toLowerCase().includes(filterLocation.trim().toLowerCase());
}

const SORTS: { value: CommunitySort; label: string }[] = [
  { value: 'default', label: 'DEFAULT' },
  { value: 'members', label: 'MOST MEMBERS' },
  { value: 'name', label: 'A–Z' },
];
const SIZES: { value: number; label: string }[] = [
  { value: 0, label: 'ANY' },
  { value: 10, label: '10+' },
  { value: 50, label: '50+' },
  { value: 100, label: '100+' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <CyberCutBox
        cutSize={6}
        radius={4}
        gradient={active}
        fill={active ? undefined : colors.cardFill}
        borderColor={active ? undefined : colors.cardBorder}
        borderWidth={active ? 0 : 1}
        style={styles.chipCut}
      >
        <View style={styles.chipInner}>
          <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.muted }]}>{label}</Text>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

/** Bottom sheet behind the Communities filter button. Edits a draft; nothing changes on the list
 * until "Apply", and "Reset" clears the draft. `locations` are the places communities actually list. */
export function CommunityFilterSheet({
  visible,
  filters,
  locations,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: CommunityFilters;
  locations: string[];
  onClose: () => void;
  onApply: (next: CommunityFilters) => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<CommunityFilters>(filters);
  const [city, setCity] = useState('');
  // The sheet never grows taller than the screen; its body scrolls inside whatever room is left
  // after the header and Apply button (~210pt).
  const { height: winH } = useWindowDimensions();
  const maxSheet = winH * 0.88;
  const bodyMax = Math.max(180, maxSheet - 210);
  const { panHandlers, sheetStyle } = useSwipeToDismiss(visible, onClose);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      // A typed city (not one of the chips) has to show up in the box again when the sheet
      // reopens — otherwise it looks like the filter was lost even though it's still applied.
      const loc = filters.location;
      const isChip = !!loc && [...PRESET_CITIES, ...locations].some((l) => l.toLowerCase() === loc.toLowerCase());
      setCity(loc && !isChip ? loc : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, filters]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View onStartShouldSetResponder={() => true} style={[styles.sheet, { maxHeight: maxSheet }, sheetStyle]}>
          <GlassBackground topRadius={20} sheet />
          <View {...panHandlers}>
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>Filter communities</Text>
              <View style={styles.headerActions}>
                <Pressable onPress={() => { setDraft(EMPTY_COMMUNITY_FILTERS); setCity(''); }} hitSlop={10} accessibilityRole="button">
                  <Text style={[styles.reset, { color: colors.electricAccent }]}>Reset</Text>
                </Pressable>
                <SheetCloseButton onPress={onClose} />
              </View>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: bodyMax }}>
            <Text style={[styles.label, { color: colors.muted }]}>SORT BY</Text>
            <View style={styles.chipRow}>
              {SORTS.map((s) => (
                <Chip key={s.value} label={s.label} active={draft.sort === s.value} onPress={() => setDraft((d) => ({ ...d, sort: s.value }))} />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>MEMBERS</Text>
            <View style={styles.chipRow}>
              {SIZES.map((s) => (
                <Chip key={s.value} label={s.label} active={draft.minMembers === s.value} onPress={() => setDraft((d) => ({ ...d, minMembers: s.value }))} />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>LOCATION</Text>
            <View style={styles.chipRow}>
              <Chip label="ANYWHERE" active={draft.location === null} onPress={() => { setDraft((d) => ({ ...d, location: null })); setCity(''); }} />
              {[...PRESET_CITIES, ...locations.filter((l) => !PRESET_CITIES.some((c) => c.toLowerCase() === l.toLowerCase()))].map((l) => (
                <Chip
                  key={l}
                  label={l.toUpperCase()}
                  active={draft.location?.toLowerCase() === l.toLowerCase()}
                  onPress={() => {
                    setDraft((d) => ({ ...d, location: d.location?.toLowerCase() === l.toLowerCase() ? null : l }));
                    setCity('');
                  }}
                />
              ))}
            </View>
            {/* Any other city: type it and the list narrows to communities in that place. */}
            <View style={[styles.cityBox, { backgroundColor: colors.inputFill, borderColor: colors.inputBorder }]}>
              <TextInput
                value={city}
                onChangeText={(v) => {
                  const next = v.slice(0, 40);
                  setCity(next);
                  setDraft((d) => ({ ...d, location: next.trim() ? next.trim() : null }));
                }}
                placeholder="Or type any city"
                placeholderTextColor={colors.muted2}
                autoCorrect={false}
                style={[styles.cityInput, { color: colors.text }]}
              />
            </View>
          </ScrollView>

          <Pressable onPress={() => { onApply(draft); onClose(); }} style={styles.applyWrap} accessibilityRole="button">
            <CyberCutBox gradient cutSize={10} radius={6} style={styles.applyCut}>
              <View style={styles.applyInner}>
                <Text style={styles.applyText}>APPLY FILTERS</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', paddingHorizontal: 20, paddingBottom: 28 },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reset: { fontFamily: fonts.bodySemi, fontSize: 13 },
  label: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipCut: { height: 34 },
  chipInner: { height: '100%', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.mono, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },
  cityBox: { height: 44, borderRadius: 10, borderWidth: 1, marginTop: 10, justifyContent: 'center' },
  cityInput: { fontFamily: fonts.body, fontSize: 14, paddingHorizontal: 14, paddingVertical: 0 },
  applyWrap: { height: 48, marginTop: 20 },
  applyCut: { width: '100%', height: '100%' },
  applyInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.6 },
});
