import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius, useTheme } from '../../theme';
import { buildDaySlots, dayKey, monthGrid, resolveWeeklyAvailability, type WeeklyAvailability } from '../../utils/expertSlots';
import type { ExpertSlot } from '../../types/extra';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ExpertCalendar({
  booked,
  pick,
  onPick,
  availability,
}: {
  booked: ExpertSlot[];
  pick: { day: string; time: string } | null;
  onPick: (day: string, time: string) => void;
  availability: WeeklyAvailability;
}) {
  const { colors, light } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const effectiveAvailability = useMemo(() => resolveWeeklyAvailability(availability), [availability]);
  const activeWeekdays = useMemo(() => new Set(effectiveAvailability.map((a) => a.weekday)), [effectiveAvailability]);

  const cells = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const today = dayKey(now);

  const [selected, setSelected] = useState(() => {
    const todayDate = new Date();
    if (activeWeekdays.has(todayDate.getDay())) return dayKey(todayDate);
    for (let d = 1; d <= 31; d++) {
      const candidate = new Date(todayDate.getFullYear(), todayDate.getMonth(), d);
      if (candidate.getMonth() !== todayDate.getMonth()) break;
      const k = dayKey(candidate);
      if (k >= dayKey(todayDate) && activeWeekdays.has(candidate.getDay())) return k;
    }
    return dayKey(todayDate);
  });

  const [open, setOpen] = useState(false);
  const slots = useMemo(() => buildDaySlots(selected, now, booked, effectiveAvailability), [selected, now, booked, effectiveAvailability]);
  const availableSlots = useMemo(() => slots.filter((s) => s.available), [slots]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dayLabel = (() => {
    const [y, m, d] = selected.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  })();

  return (
    <View>
      <View style={styles.monthNav}>
        <Pressable
          onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.month, { color: colors.text }]}>{monthLabel}</Text>
        <Pressable
          onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEK.map((w, i) => (
          <Text key={`${w}-${i}`} style={[styles.wd, { color: colors.muted2 }]}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e-${i}`} style={styles.cell} />;
          const key = dayKey(d);
          const past = key < today;
          const unavailable = !activeWeekdays.has(d.getDay());
          const on = key === selected;
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              disabled={past || unavailable}
              onPress={() => {
                setSelected(key);
                if (pick) onPick(key, pick.time);
              }}
              style={[
                styles.cell,
                on && { backgroundColor: colors.magenta, borderRadius: 18 },
                isToday && !on && { borderWidth: 1, borderColor: colors.cyan, borderRadius: 18 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: past || unavailable }}
              accessibilityLabel={key}
            >
              <Text style={{ color: past || unavailable ? colors.muted2 : on ? colors.onPrimary : colors.text, fontFamily: fonts.bodyMed }}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Time Section Header */}
      <View style={styles.timeHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.h2, { color: colors.text }]}>Time</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 2 }}>
            {dayLabel} · 15 min slots
          </Text>
        </View>
        {availableSlots.length > 0 && (
          <View style={[styles.availableBadge, { backgroundColor: light ? 'rgba(0, 180, 216, 0.10)' : 'rgba(0, 229, 255, 0.12)' }]}>
            <Text style={[styles.availableBadgeText, { color: light ? colors.primary : '#00E5FF' }]}>
              {availableSlots.length} available
            </Text>
          </View>
        )}
      </View>

      {/* Direct Quick-Pick Available Slots right on the card */}
      {availableSlots.length > 0 ? (
        <View style={styles.quickSlotsContainer}>
          <View style={styles.quickGrid}>
            {availableSlots.slice(0, 8).map((s) => {
              const on = pick?.day === s.day && pick.time === s.time;
              return (
                <Pressable
                  key={s.time}
                  onPress={() => onPick(s.day, s.time)}
                  style={[
                    styles.quickSlot,
                    {
                      backgroundColor: on
                        ? light
                          ? 'rgba(0, 180, 216, 0.18)'
                          : 'rgba(0, 229, 255, 0.22)'
                        : light
                        ? '#FFFFFF'
                        : 'rgba(18, 23, 41, 0.9)',
                      borderColor: on
                        ? light
                          ? colors.primary
                          : '#00E5FF'
                        : light
                        ? 'rgba(15, 23, 42, 0.12)'
                        : 'rgba(255, 255, 255, 0.12)',
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.quickSlotText,
                      {
                        color: on ? (light ? colors.primary : '#00E5FF') : colors.text,
                        fontFamily: on ? fonts.bodySemi : fonts.bodyMed,
                      },
                    ]}
                  >
                    {s.time}
                  </Text>
                  {on ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={light ? colors.primary : '#00E5FF'}
                      style={{ marginLeft: 4 }}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* More times / Full selector button */}
          <Pressable
            onPress={() => setOpen(true)}
            style={[
              styles.moreTimesBtn,
              {
                borderColor: light ? 'rgba(0, 180, 216, 0.35)' : 'rgba(0, 229, 255, 0.35)',
                backgroundColor: light ? 'rgba(0, 180, 216, 0.06)' : 'rgba(0, 229, 255, 0.08)',
              },
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={15} color={light ? colors.primary : '#00E5FF'} />
            <Text style={[styles.moreTimesText, { color: light ? colors.primary : '#00E5FF' }]}>
              {availableSlots.length > 8 ? `See all ${availableSlots.length} available times…` : 'Browse all time slots'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={light ? colors.primary : '#00E5FF'} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.noSlotsBox, { backgroundColor: light ? 'rgba(15, 23, 42, 0.03)' : 'rgba(255, 255, 255, 0.04)', borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.muted} />
          <Text style={[styles.noSlotsText, { color: colors.muted }]}>
            No available time slots on this day. Please select another date above.
          </Text>
        </View>
      )}

      {/* Enhanced Bottom Sheet Modal */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.sheetBack, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: light ? colors.surface : '#0E1423',
                borderColor: light ? colors.cardBorder : 'rgba(255, 255, 255, 0.12)',
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={() => undefined}
          >
            <View style={styles.grabberRow}>
              <View style={[styles.grabber, { backgroundColor: light ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255, 255, 255, 0.2)' }]} />
            </View>

            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Select time</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>{dayLabel}</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityRole="button">
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {slots.length === 0 ? (
                <View style={styles.modalEmptyWrap}>
                  <Ionicons name="calendar-outline" size={32} color={colors.muted} />
                  <Text style={[styles.modalEmptyTitle, { color: colors.text }]}>No slots available</Text>
                  <Text style={[styles.modalEmptySubtitle, { color: colors.muted }]}>
                    There are no bookable hours on this day. Please pick another date.
                  </Text>
                </View>
              ) : (
                slots.map((s) => {
                  const on = pick?.day === s.day && pick.time === s.time;
                  return (
                    <Pressable
                      key={s.time}
                      disabled={!s.available}
                      onPress={() => {
                        onPick(s.day, s.time);
                        setOpen(false);
                      }}
                      style={[
                        styles.option,
                        {
                          backgroundColor: on
                            ? light
                              ? 'rgba(0, 180, 216, 0.12)'
                              : colors.magentaDeep
                            : 'transparent',
                          borderColor: on ? (light ? colors.primary : colors.magenta) : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={s.available ? (on ? (light ? colors.primary : colors.magenta) : colors.text) : colors.muted2}
                        />
                        <Text
                          style={{
                            color: s.available ? (on ? (light ? colors.primary : colors.magenta) : colors.text) : colors.muted2,
                            fontFamily: on ? fonts.bodySemi : fonts.body,
                            fontSize: 14,
                          }}
                        >
                          {s.time}
                        </Text>
                      </View>
                      {on ? (
                        <Ionicons name="checkmark-circle" size={18} color={light ? colors.primary : colors.magenta} />
                      ) : !s.available ? (
                        <Text style={{ color: colors.muted2, fontFamily: fonts.mono, fontSize: 11 }}>Taken</Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              onPress={() => setOpen(false)}
              style={[
                styles.cancel,
                {
                  backgroundColor: light ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: light ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: fonts.display, fontSize: 20 },
  week: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center' },
  h2: { fontFamily: fonts.display, fontSize: 18, marginTop: 16, marginBottom: 4 },
  timeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  availableBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  availableBadgeText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  quickSlotsContainer: { marginTop: 12, gap: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  quickSlotText: { fontSize: 13 },
  moreTimesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 4,
  },
  moreTimesText: { fontFamily: fonts.bodyMed, fontSize: 13, flexShrink: 1, textAlign: 'center' },
  noSlotsBox: { marginTop: 12, padding: 16, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 8 },
  noSlotsText: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  grabberRow: { alignItems: 'center', paddingBottom: 12 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sheetSubtitle: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  modalEmptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  modalEmptyTitle: { fontFamily: fonts.bodySemi, fontSize: 15, fontWeight: '700' },
  modalEmptySubtitle: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  dropdown: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetBack: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 16, maxHeight: '70%' },
  sheetTitle: { fontFamily: fonts.display, fontSize: 20 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
