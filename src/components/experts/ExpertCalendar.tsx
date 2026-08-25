import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, useTheme } from '../../theme';
import { buildDaySlots, dayKey, monthGrid } from '../../utils/expertSlots';
import type { ExpertSlot } from '../../types/extra';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function ExpertCalendar({
  booked,
  pick,
  onPick,
}: {
  booked: ExpertSlot[];
  pick: { day: string; time: string } | null;
  onPick: (day: string, time: string) => void;
}) {
  const { colors } = useTheme();
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(dayKey(now));
  const [open, setOpen] = useState(false);

  const cells = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const today = dayKey(now);
  const slots = useMemo(() => buildDaySlots(selected, now, booked), [selected, now, booked]);
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
          const on = key === selected;
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              disabled={past}
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
              accessibilityState={{ selected: on, disabled: past }}
              accessibilityLabel={key}
            >
              <Text style={{ color: past ? colors.muted2 : on ? colors.onPrimary : colors.text, fontFamily: fonts.bodyMed }}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.h2, { color: colors.text }]}>Time</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 8 }}>{dayLabel} · 15 min slots</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Choose time"
      >
        <Text style={{ color: pick?.day === selected && pick.time ? colors.text : colors.muted2, fontFamily: fonts.body, flex: 1 }}>
          {pick?.day === selected && pick.time ? pick.time : 'Select time'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.sheetBack, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Select time</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {slots.map((s) => {
                const on = pick?.day === s.day && pick.time === s.time;
                return (
                  <Pressable
                    key={s.time}
                    disabled={!s.available}
                    onPress={() => {
                      onPick(s.day, s.time);
                      setOpen(false);
                    }}
                    style={[styles.option, on && { backgroundColor: colors.magentaDeep }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: s.available ? colors.text : colors.muted2, fontFamily: fonts.body }}>
                      {s.available ? s.time : `${s.time} · Taken`}
                    </Text>
                    {on ? <Ionicons name="checkmark" size={18} color={colors.magenta} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setOpen(false)} style={styles.cancel} accessibilityRole="button">
              <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed }}>Cancel</Text>
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
  sheetTitle: { fontFamily: fonts.display, fontSize: 20, marginBottom: 8 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
