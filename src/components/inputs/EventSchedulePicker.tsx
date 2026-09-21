import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ListPickerSheet, type ListPickerOption } from './ListPickerSheet';
import { fonts, useTheme } from '../../theme';
import { formatEventRange } from '../../utils/eventSchedule';

const DAYS_AHEAD = 90;
const TIME_STEP_MIN = 15;
const DURATIONS = [30, 60, 90, 120, 180];

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d: Date) => `${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`;
const timeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function timeLabel(h: number, m: number) {
  const period = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${period}`;
}

type Which = 'startDate' | 'startTime' | 'endDate' | 'endTime';

/** Start date / start time / end date / end time as four tappable fields, each opening a list
 * sheet, plus quick-duration chips. Replaces the old date chips + hour chips + minute chips. */
export function EventSchedulePicker({
  start,
  end,
  onChange,
  error,
}: {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
  error?: string;
}) {
  const { colors, isLight } = useTheme();
  const [open, setOpen] = useState<Which | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const dayOptions = (from: Date): ListPickerOption[] =>
    Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      return { key: isoDay(d), label: dayLabel(d), hint: isoDay(d) };
    });
  const startDayOptions = useMemo(() => dayOptions(today), [today]);
  const endDayOptions = useMemo(() => dayOptions(new Date(start.getFullYear(), start.getMonth(), start.getDate())), [start]);
  const timeOptions: ListPickerOption[] = useMemo(() => {
    const out: ListPickerOption[] = [];
    for (let mins = 0; mins < 24 * 60; mins += TIME_STEP_MIN) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      out.push({ key: `${pad(h)}:${pad(m)}`, label: timeLabel(h, m) });
    }
    return out;
  }, []);

  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  const withDate = (base: Date, key: string) => {
    const [y, mo, da] = key.split('-').map(Number);
    const d = new Date(base);
    d.setFullYear(y, mo - 1, da);
    return d;
  };
  const withTime = (base: Date, key: string) => {
    const [h, m] = key.split(':').map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Moving the start keeps the event's length, so picking a new day/time doesn't leave the end
  // stranded before it.
  const shiftStart = (nextStart: Date) => onChange(nextStart, new Date(nextStart.getTime() + Math.max(durationMin, 15) * 60000));

  const onSelect = (which: Which, key: string) => {
    if (which === 'startDate') shiftStart(withDate(start, key));
    else if (which === 'startTime') shiftStart(withTime(start, key));
    else if (which === 'endDate') onChange(start, withDate(end, key));
    else onChange(start, withTime(end, key));
  };

  const fields: { which: Which; label: string; value: string }[] = [
    { which: 'startDate', label: 'Start date', value: isoDay(start) },
    { which: 'startTime', label: 'Start time', value: timeLabel(start.getHours(), start.getMinutes()) },
    { which: 'endDate', label: 'End date', value: isoDay(end) },
    { which: 'endTime', label: 'End time', value: timeLabel(end.getHours(), end.getMinutes()) },
  ];

  const sheet = {
    startDate: { title: 'Start date', options: startDayOptions, selected: isoDay(start) },
    startTime: { title: 'Start time', options: timeOptions, selected: timeKey(start) },
    endDate: { title: 'End date', options: endDayOptions, selected: isoDay(end) },
    endTime: { title: 'End time', options: timeOptions, selected: timeKey(end) },
  } as const;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>WHEN</Text>
      <View style={styles.grid}>
        {fields.map((f) => (
          <Pressable
            key={f.which}
            onPress={() => setOpen(f.which)}
            accessibilityRole="button"
            accessibilityLabel={`${f.label}: ${f.value}`}
            style={[styles.field, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>{f.label.toUpperCase()}</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>{f.value}</Text>
              <Ionicons name="chevron-down" size={16} color={isLight ? colors.primary : '#00E5FF'} />
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.chips}>
        {DURATIONS.map((d) => {
          const on = durationMin === d;
          return (
            <Pressable
              key={d}
              onPress={() => onChange(start, new Date(start.getTime() + d * 60000))}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, { backgroundColor: on ? 'rgba(109, 53, 255, 0.25)' : colors.cardFill, borderColor: on ? '#8B5CF6' : colors.cardBorder }]}
            >
              <Text style={[styles.chipText, { color: on ? colors.text : colors.muted }]}>{d} min</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.summary, { color: error ? '#FF4D6D' : colors.primary }]}>
        {error || formatEventRange(start.toISOString(), end.toISOString(), true)}
      </Text>

      {open ? (
        <ListPickerSheet
          visible
          title={sheet[open].title}
          options={sheet[open].options}
          selectedKey={sheet[open].selected}
          onSelect={(key) => onSelect(open, key)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  sectionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, gap: 6 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8 },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  fieldValue: { fontFamily: fonts.bodySemi, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, fontWeight: '600' },
  summary: { fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 0.3, marginTop: 12 },
});
