import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameEvent } from '../../types/event';
import { fonts, radius, useTheme } from '../../theme';
import { formatDateBlock } from '../../utils/format';

export function EventRow({
  event,
  onPress,
}: {
  event: GameEvent;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const { day, month } = formatDateBlock(event.startsAt);
  const price = event.paid && event.price ? `${event.currency === 'USD' ? '$' : ''}${event.price}` : 'Free';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={event.title} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.date, { backgroundColor: colors.plumDeep }]}>
        <Text style={[styles.day, { color: colors.text }]}>{day}</Text>
        <Text style={[styles.month, { color: colors.cyan }]}>{month}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {event.category ? `${event.category} · ` : ''}
          {event.type} · {event.location}
        </Text>
      </View>
      <View style={[styles.rsvp, event.rsvp === 'going' && { backgroundColor: colors.magenta }, { borderColor: colors.magenta }]}>
        <Text style={[styles.rsvpText, { color: event.rsvp === 'going' ? colors.onPrimary : colors.magenta }]}>
          {event.rsvp === 'going' ? 'Going' : 'RSVP'}
        </Text>
        <Text style={[styles.price, { color: colors.muted }]}>{price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderTopRightRadius: 4,
    padding: 16,
    borderWidth: 1,
  },
  date: {
    width: 48,
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { fontFamily: fonts.monoBold, fontSize: 16 },
  month: { fontFamily: fonts.mono, fontSize: 10 },
  body: { flex: 1 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  rsvp: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rsvpText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  price: { fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
});
