import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MainStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { useExpertStore } from '../../../store/expertStore';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { WeeklyAvailability } from '../../../utils/expertSlots';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function ExpertAvailabilityScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isLight } = useTheme();
  const { user } = useAuth();
  const availability = useExpertStore((s) => (user ? s.availability[user.id] : undefined));
  const fetchAvailability = useExpertStore((s) => s.fetchAvailability);
  const updateAvailability = useExpertStore((s) => s.updateAvailability);

  const [pattern, setPattern] = useState<WeeklyAvailability>([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user) fetchAvailability(user.id);
  }, [user, fetchAvailability]);

  useEffect(() => {
    if (availability && !loaded) {
      setPattern(availability);
      setLoaded(true);
    }
  }, [availability, loaded]);

  const isActive = (weekday: number) => pattern.some((p) => p.weekday === weekday);

  const toggleWeekday = (weekday: number) => {
    setPattern((cur) =>
      isActive(weekday)
        ? cur.filter((p) => p.weekday !== weekday)
        : [...cur, { weekday, slots: [{ start: '09:00', end: '17:00' }] }],
    );
  };

  const addSlot = (weekday: number) => {
    setPattern((cur) =>
      cur.map((p) => (p.weekday === weekday ? { ...p, slots: [...p.slots, { start: '09:00', end: '17:00' }] } : p)),
    );
  };

  const removeSlot = (weekday: number, idx: number) => {
    setPattern((cur) =>
      cur.map((p) => (p.weekday === weekday ? { ...p, slots: p.slots.filter((_, i) => i !== idx) } : p)),
    );
  };

  const updateSlot = (weekday: number, idx: number, field: 'start' | 'end', value: string) => {
    setPattern((cur) =>
      cur.map((p) =>
        p.weekday === weekday ? { ...p, slots: p.slots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) } : p,
      ),
    );
  };

  const save = async () => {
    for (const p of pattern) {
      for (const s of p.slots) {
        if (!TIME_RE.test(s.start) || !TIME_RE.test(s.end) || s.start >= s.end) {
          setErr('Enter valid times as HH:MM, with each slot ending after it starts.');
          return;
        }
      }
      if (p.slots.length === 0) {
        setErr('Every active day needs at least one time range, or turn the day off.');
        return;
      }
    }
    setErr('');
    setSaving(true);
    try {
      if (user) await updateAvailability(user.id, pattern);
      nav.goBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} />
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.headerBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.headerCutBox}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Set availability</Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={[styles.subtitleText, { color: colors.muted }]}>
          Pick the weekdays you're bookable on. Selecting a weekday makes every date on that weekday bookable during the time ranges you add.
        </Text>

        {/* Weekday selector chips */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((label, weekday) => {
            const on = isActive(weekday);
            return (
              <Pressable
                key={weekday}
                onPress={() => toggleWeekday(weekday)}
                style={styles.weekChipTouch}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <CyberCutBox
                  gradient={on}
                  cutSize={6}
                  radius={6}
                  fill={on ? undefined : colors.cardFill}
                  borderColor={on ? undefined : colors.cardBorder}
                  borderWidth={on ? 0 : 0.88}
                  style={styles.weekCut}
                >
                  <View style={styles.weekInner}>
                    <Text style={[styles.weekLabelText, { color: on ? '#FFFFFF' : colors.muted }, on && styles.weekLabelTextActive]}>
                      {label}
                    </Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            );
          })}
        </View>

        {/* Active Weekdays Time Range Blocks */}
        {pattern
          .slice()
          .sort((a, b) => a.weekday - b.weekday)
          .map((p) => (
            <View key={p.weekday} style={{ marginBottom: 14 }}>
              <CyberCutBox
                cutSize={12}
                radius={8}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={0.88}
                style={{ width: '100%' }}
              >
                <View style={styles.dayBlockInner}>
                  <Text style={[styles.dayTitleText, { color: colors.text }]}>{WEEKDAYS[p.weekday].toUpperCase()}</Text>

                  {p.slots.map((s, idx) => (
                    <View key={idx} style={styles.slotRow}>
                      <View style={{ flex: 1 }}>
                        <AuthTextField
                          label="Start"
                          value={s.start}
                          onChangeText={(v) => updateSlot(p.weekday, idx, 'start', v)}
                          placeholder="09:00"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <AuthTextField
                          label="End"
                          value={s.end}
                          onChangeText={(v) => updateSlot(p.weekday, idx, 'end', v)}
                          placeholder="17:00"
                        />
                      </View>

                      <Pressable
                        onPress={() => removeSlot(p.weekday, idx)}
                        style={styles.removeBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Remove time range"
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF4D6D" />
                      </Pressable>
                    </View>
                  ))}

                  <Pressable onPress={() => addSlot(p.weekday)} style={styles.addSlotBtn} accessibilityRole="button">
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={[styles.addSlotText, { color: colors.primary }]}>Add time range</Text>
                  </Pressable>
                </View>
              </CyberCutBox>
            </View>
          ))}

        {err ? <InlineErrorText message={err} /> : null}

        {/* Save Availability Button */}
        <Pressable onPress={save} disabled={saving} style={styles.saveBtnTouch} accessibilityRole="button">
          <CyberCutBox gradient cutSize={8} radius={6} style={styles.saveCutBox}>
            <View style={styles.saveInner}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save availability'}</Text>
            </View>
          </CyberCutBox>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
  },
  headerCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  subtitleText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: '#8E9BB5',
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  weekChipTouch: {
    width: 46,
    height: 44,
  },
  weekCut: {
    width: '100%',
    height: '100%',
  },
  weekInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabelText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  weekLabelTextActive: {
    fontWeight: '700',
  },
  dayBlockInner: {
    padding: 14,
    gap: 10,
  },
  dayTitleText: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  removeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 4,
  },
  addSlotText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#00E5FF',
  },
  saveBtnTouch: {
    width: '100%',
    height: 48,
    marginTop: 16,
    marginBottom: 20,
  },
  saveCutBox: {
    width: '100%',
    height: '100%',
  },
  saveInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

