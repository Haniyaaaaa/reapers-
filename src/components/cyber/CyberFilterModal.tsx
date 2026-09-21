import React, { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { GlassSurface } from '../glass/GlassSurface';
import { SheetCloseButton } from '../glass/SheetCloseButton';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

/** Nothing is pre-selected: a null section means "don't filter on this". */
export interface FilterState {
  date: string | null;
  location: string | null;
  category: string | null;
}

interface CyberFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

const DATE_OPTIONS = ['THIS WEEK', 'TODAY', 'THIS MONTH'];
const LOCATION_OPTIONS = ['ONLINE', 'ONSITE', 'HYBRID'];
const PRESET_CATEGORIES = ['MEETUP', 'TOURNAMENT', 'GAMEJAM'];
const CUSTOM = 'CUSTOM';

export function CyberFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: CyberFilterModalProps) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const { panHandlers, sheetStyle } = useSwipeToDismiss(visible, onClose);
  // The sheet never grows taller than the screen; the filter list scrolls in the room left after the
  // header and the Apply buttons (~230pt).
  const { height: winH } = useWindowDimensions();
  const maxSheet = winH * 0.88;
  const bodyMax = Math.max(180, maxSheet - 230);
  const [selectedDate, setSelectedDate] = useState<string | null>(initialFilters?.date ?? null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(initialFilters?.location ?? null);
  // Category is one of the presets, or CUSTOM with the person's own typed category.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSelectedDate(initialFilters?.date ?? null);
    setSelectedLocation(initialFilters?.location ?? null);
    const cat = initialFilters?.category ?? null;
    if (cat && !PRESET_CATEGORIES.includes(cat)) {
      setSelectedCategory(CUSTOM);
      setCustomCategory(cat);
    } else {
      setSelectedCategory(cat);
      setCustomCategory('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleReset = () => {
    setSelectedDate(null);
    setSelectedLocation(null);
    setSelectedCategory(null);
    setCustomCategory('');
  };

  const handleApply = () => {
    const category = selectedCategory === CUSTOM ? customCategory.trim() || null : selectedCategory;
    onApply({ date: selectedDate, location: selectedLocation, category });
    onClose();
  };

  const idleFill = isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)';
  const idleBorder = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  // Tap a selected option again to clear that section.
  const renderChips = (options: string[], selected: string | null, onSelect: (v: string | null) => void) => (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <Pressable key={opt} onPress={() => onSelect(active ? null : opt)} style={styles.chipBtn} accessibilityRole="button" accessibilityState={{ selected: active }}>
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
                <Text style={[styles.chipText, { color: active ? '#FFFFFF' : isLight ? colors.text : '#8E9BB5' }, active && styles.chipTextActive]}>{opt}</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.45)' }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
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

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: bodyMax }} contentContainerStyle={{ gap: 14 }}>
                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATE</Text>
                    {renderChips(DATE_OPTIONS, selectedDate, setSelectedDate)}
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>LOCATION</Text>
                    {renderChips(LOCATION_OPTIONS, selectedLocation, setSelectedLocation)}
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>CATEGORY</Text>
                    {renderChips([...PRESET_CATEGORIES, CUSTOM], selectedCategory, setSelectedCategory)}
                    {selectedCategory === CUSTOM ? (
                      <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.customInputCut}>
                        <TextInput
                          value={customCategory}
                          onChangeText={(v) => setCustomCategory(v.slice(0, 24))}
                          placeholder="Type your own category"
                          placeholderTextColor={colors.muted2}
                          autoFocus
                          autoCorrect={false}
                          style={[styles.customInput, { color: colors.text }]}
                        />
                      </CyberCutBox>
                    ) : null}
                  </View>
                </ScrollView>

                <View style={[styles.divider, { backgroundColor: isLight ? colors.border : 'rgba(255, 255, 255, 0.08)' }]} />

                <View style={styles.footerRow}>
                  <Pressable onPress={handleReset} style={styles.resetBtn} accessibilityRole="button">
                    <CyberCutBox
                      cutSize={8}
                      radius={4}
                      fill={idleFill}
                      borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)'}
                      borderWidth={1}
                      style={styles.resetCut}
                    >
                      <View style={styles.resetInner}>
                        <Text style={[styles.resetText, { color: colors.text }]}>Reset</Text>
                      </View>
                    </CyberCutBox>
                  </Pressable>

                  <Pressable onPress={handleApply} style={styles.applyBtn} accessibilityRole="button">
                    <CyberCutBox gradient cutSize={8} radius={4} style={styles.applyCut}>
                      <View style={styles.applyInner}>
                        <Text style={styles.applyText}>Show Results</Text>
                      </View>
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
  customInputCut: { height: 42 },
  customInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 12, paddingVertical: 0 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalBox: {
    width: '100%',
  },
  modalInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleWrap: {
    alignItems: 'flex-start',
    gap: 4,
  },
  titleText: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  accentLine: {
    width: 32,
    height: 2,
    borderRadius: 1,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    height: 38,
    flexBasis: '47%',
    flexGrow: 1,
  },
  chipCut: {
    width: '100%',
    height: 38,
  },
  chipInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: '#8E9BB5',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customDateScroll: {
    marginTop: 10,
  },
  customDayCut: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customDayText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#8E9BB5',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    width: 100,
    height: 44,
  },
  resetCut: {
    width: 100,
    height: 44,
  },
  resetInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
  applyBtn: {
    flex: 1,
    height: 44,
  },
  applyCut: {
    width: '100%',
    height: 44,
  },
  applyInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

