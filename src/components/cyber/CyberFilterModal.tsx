import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

export interface FilterState {
  date: string;
  location: string;
  category: string;
  /** ISO date string, only meaningful when date === 'CUSTOM'. */
  customDate?: string;
}

const CUSTOM_DAYS_AHEAD = 21;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function customDayLabel(d: Date, today: Date): string {
  if (d.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
}

interface CyberFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

const DATE_OPTIONS = ['THIS WEEK', 'TODAY', 'THIS MONTH', 'CUSTOM'];
const LOCATION_OPTIONS = ['ANYWHERE', 'WITHIN 50KM', 'BERLIN', 'ONLINE'];
const CATEGORY_OPTIONS = ['WATCH PARTY', 'MEETUP', 'TOURNAMENT', 'GAMEJAM'];

export function CyberFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: CyberFilterModalProps) {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(initialFilters?.date || 'TODAY');
  const [selectedLocation, setSelectedLocation] = useState(initialFilters?.location || 'ANYWHERE');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || 'MEETUP');
  const [selectedCustomDate, setSelectedCustomDate] = useState<Date>(
    initialFilters?.customDate ? new Date(initialFilters.customDate) : new Date(),
  );

  const handleReset = () => {
    setSelectedDate('TODAY');
    setSelectedLocation('ANYWHERE');
    setSelectedCategory('MEETUP');
    setSelectedCustomDate(new Date());
  };

  const handleApply = () => {
    onApply({
      date: selectedDate,
      location: selectedLocation,
      category: selectedCategory,
      customDate: selectedDate === 'CUSTOM' ? selectedCustomDate.toISOString() : undefined,
    });
    onClose();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const customDays = Array.from({ length: CUSTOM_DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.45)' }]}>
        {/* Backdrop press dismiss */}
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        {/* Bottom Sheet Box */}
        <CyberCutBox
          cutSize={18}
          radius={16}
          fill={isLight ? colors.cardFill : 'rgba(9, 15, 28, 0.98)'}
          borderColor={isLight ? colors.cardBorder : 'rgba(0, 229, 255, 0.55)'}
          borderWidth={1}
          glass
          style={styles.modalBox}
        >
          <View style={[styles.modalInner, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
            {/* Handle Bar Indicator */}
            <View style={styles.handleWrap}>
              <View style={[styles.handleBar, { backgroundColor: isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.25)' }]} />
            </View>

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                <Text style={[styles.titleText, { color: colors.text }]}>Filter</Text>
                <LinearGradient
                  colors={['#00E5FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.accentLine}
                />
              </View>

              <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)'}
                  borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)'}
                  borderWidth={0.88}
                  style={styles.closeCut}
                >
                  <Ionicons name="close" size={16} color={colors.text} />
                </CyberCutBox>
              </Pressable>
            </View>

            {/* Section 1: DATE */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATE</Text>
              <View style={styles.chipGrid}>
                {DATE_OPTIONS.map((opt) => {
                  const active = selectedDate === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSelectedDate(opt)}
                      style={styles.chipBtn}
                      accessibilityRole="button"
                    >
                      <CyberCutBox
                        gradient={active}
                        cutSize={8}
                        radius={4}
                        fill={active ? undefined : (isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)')}
                        borderColor={active ? undefined : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)')}
                        borderWidth={active ? 0 : 0.88}
                        style={styles.chipCut}
                      >
                        <View style={styles.chipInner}>
                          <Text
                            style={[
                              styles.chipText,
                              { color: active ? '#FFFFFF' : (isLight ? colors.text : '#8E9BB5') },
                              active && styles.chipTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </View>
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>

              {selectedDate === 'CUSTOM' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customDateScroll} contentContainerStyle={{ gap: 8 }}>
                  {customDays.map((d) => {
                    const active = d.toDateString() === selectedCustomDate.toDateString();
                    return (
                      <Pressable key={d.toISOString()} onPress={() => setSelectedCustomDate(d)} accessibilityRole="button">
                        <CyberCutBox
                          gradient={active}
                          cutSize={6}
                          radius={4}
                          fill={active ? undefined : (isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)')}
                          borderColor={active ? undefined : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)')}
                          borderWidth={active ? 0 : 0.88}
                          style={styles.customDayCut}
                        >
                          <Text
                            style={[
                              styles.customDayText,
                              { color: active ? '#FFFFFF' : (isLight ? colors.text : '#8E9BB5') },
                              active && styles.chipTextActive,
                            ]}
                          >
                            {customDayLabel(d, today)}
                          </Text>
                        </CyberCutBox>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>

            {/* Section 2: LOCATION */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>LOCATION</Text>
              <View style={styles.chipGrid}>
                {LOCATION_OPTIONS.map((opt) => {
                  const active = selectedLocation === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSelectedLocation(opt)}
                      style={styles.chipBtn}
                      accessibilityRole="button"
                    >
                      <CyberCutBox
                        gradient={active}
                        cutSize={8}
                        radius={4}
                        fill={active ? undefined : (isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)')}
                        borderColor={active ? undefined : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)')}
                        borderWidth={active ? 0 : 0.88}
                        style={styles.chipCut}
                      >
                        <View style={styles.chipInner}>
                          <Text
                            style={[
                              styles.chipText,
                              { color: active ? '#FFFFFF' : (isLight ? colors.text : '#8E9BB5') },
                              active && styles.chipTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </View>
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Section 3: CATEGORY */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>CATEGORY</Text>
              <View style={styles.chipGrid}>
                {CATEGORY_OPTIONS.map((opt) => {
                  const active = selectedCategory === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSelectedCategory(opt)}
                      style={styles.chipBtn}
                      accessibilityRole="button"
                    >
                      <CyberCutBox
                        gradient={active}
                        cutSize={8}
                        radius={4}
                        fill={active ? undefined : (isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)')}
                        borderColor={active ? undefined : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)')}
                        borderWidth={active ? 0 : 0.88}
                        style={styles.chipCut}
                      >
                        <View style={styles.chipInner}>
                          <Text
                            style={[
                              styles.chipText,
                              { color: active ? '#FFFFFF' : (isLight ? colors.text : '#8E9BB5') },
                              active && styles.chipTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </View>
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isLight ? colors.border : 'rgba(255, 255, 255, 0.08)' }]} />

            {/* Action Buttons Footer */}
            <View style={styles.footerRow}>
              <Pressable onPress={handleReset} style={styles.resetBtn} accessibilityRole="button">
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={isLight ? '#FFFFFF' : 'rgba(14, 20, 35, 0.85)'}
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
        </CyberCutBox>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  closeBtn: {
    width: 30,
    height: 30,
  },
  closeCut: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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

