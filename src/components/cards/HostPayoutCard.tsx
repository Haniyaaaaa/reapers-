import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';
import type { GameEvent } from '../../types/event';

export function HostPayoutCard({ event }: { event: GameEvent }) {
  const { colors } = useTheme();
  if (!event.hostAccountName && !event.hostAccountNumber) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text style={[styles.kicker, { color: colors.cyan }]}>Pay the host</Text>
      <Text style={[styles.h, { color: colors.text }]}>Account details</Text>
      <Row label="Account name" value={event.hostAccountName} />
      <Row label="Bank" value={event.hostBankName} />
      <Row label="Account number" value={event.hostAccountNumber} />
      <Row label="IBAN" value={event.hostIban} />
    </View>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, padding: 16, gap: 10, marginVertical: 8 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  h: { fontFamily: fonts.display, fontSize: 18 },
  row: { gap: 2 },
  label: { fontFamily: fonts.body, fontSize: 12 },
  value: { fontFamily: fonts.bodySemi, fontSize: 15 },
});
