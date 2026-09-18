import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';
import type { GameEvent } from '../../types/event';

export function HostPayoutCard({ event }: { event: GameEvent }) {
  const { colors } = useTheme();
  if (!event.payoutContactNote) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text style={[styles.kicker, { color: colors.cyan }]}>Pay the host</Text>
      <Text style={[styles.h, { color: colors.text }]}>How to pay</Text>
      <Text style={[styles.note, { color: colors.text }]} selectable>
        {event.payoutContactNote}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, padding: 16, gap: 10, marginVertical: 8 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  h: { fontFamily: fonts.display, fontSize: 18 },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});
