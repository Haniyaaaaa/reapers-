import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { fonts, useTheme } from '../../theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_AHEAD = 21;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function dateLabel(d: Date, today: Date): string {
  const isToday = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
}

export function EventDateTimePicker({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
  const { colors, isLight } = useTheme();
  const today = new Date();
  today.setSeconds(0, 0);

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const setDatePart = (d: Date) => {
    const next = new Date(value);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    onChange(next);
  };
  const setHour = (h: number) => {
    const next = new Date(value);
    next.setHours(h);
    onChange(next);
  };
  const setMinute = (m: number) => {
    const next = new Date(value);
    next.setMinutes(m);
    onChange(next);
  };

  const inactiveChipStyle = isLight
    ? { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }
    : styles.chipInactive;

  const activeTextStyle = { color: isLight ? colors.text : '#FFFFFF' };
  const inactiveTextStyle = { color: colors.muted };

  return (
    <View style={styles.container}>
      {/* DATE */}
      <Text style={[styles.label, { color: colors.muted }]}>DATE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {days.map((d) => {
          const on = d.toDateString() === value.toDateString();
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => setDatePart(d)}
              style={[
                styles.chip,
                on ? styles.chipActiveDate : inactiveChipStyle,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on ? [styles.chipTextActive, activeTextStyle] : inactiveTextStyle]}>
                {dateLabel(d, today)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* HOUR */}
      <Text style={[styles.label, { color: colors.muted }]}>HOUR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {HOURS.map((h) => {
          const on = value.getHours() === h;
          return (
            <Pressable
              key={h}
              onPress={() => setHour(h)}
              style={[
                styles.chip,
                on ? styles.chipActiveHour : inactiveChipStyle,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on ? [styles.chipTextActive, activeTextStyle] : inactiveTextStyle]}>
                {formatHour(h)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* MINUTE */}
      <Text style={[styles.label, { color: colors.muted }]}>MINUTE</Text>
      <View style={styles.row}>
        {MINUTES.map((m) => {
          const on = value.getMinutes() === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMinute(m)}
              style={[
                styles.chip,
                on ? styles.chipActiveMinute : inactiveChipStyle,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on ? [styles.chipTextActive, activeTextStyle] : inactiveTextStyle]}>
                :{String(m).padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInactive: {
    backgroundColor: 'rgba(14, 20, 35, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  chipActiveDate: {
    backgroundColor: 'rgba(216, 60, 255, 0.25)',
    borderColor: '#D83CFF',
  },
  chipActiveHour: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: '#00E5FF',
  },
  chipActiveMinute: {
    backgroundColor: 'rgba(109, 53, 255, 0.25)',
    borderColor: '#6D35FF',
  },
  chipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#A6B4CE',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
