import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { fonts, useTheme } from '../../theme';
import type { TicketPlan } from '../../types/event';
import { formatMoney } from '../../utils/money';

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { panHandlers, sheetStyle } = useSwipeToDismiss(visible, onClose);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          onStartShouldSetResponder={() => true}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) + 8 }, sheetStyle]}
        >
          <View {...panHandlers} style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>
          {children}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Step 1 when an event has more than one plan: pick which ticket to buy. */
export function TicketPlanSheet({
  visible,
  plans,
  currency,
  onSelect,
  onClose,
}: {
  visible: boolean;
  plans: TicketPlan[];
  currency: string;
  onSelect: (plan: TicketPlan) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>Choose a ticket</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>Pick the ticket you want. You'll choose how many next.</Text>
      {plans.map((p) => (
        <Pressable
          key={p.id ?? p.name}
          onPress={() => onSelect(p)}
          style={[styles.planRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${formatMoney(p.price, currency)}`}
        >
          <Text style={[styles.planName, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
          <Text style={[styles.planPrice, { color: colors.text }]}>{formatMoney(p.price, currency)}</Text>
        </Pressable>
      ))}
      <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.cardBorder }]} accessibilityRole="button">
        <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
      </Pressable>
    </Sheet>
  );
}

/** Step 2: how many tickets, with the running total. */
export function TicketQuantitySheet({
  visible,
  plan,
  currency,
  quantity,
  maxQuantity,
  onChange,
  onContinue,
  onClose,
}: {
  visible: boolean;
  plan: TicketPlan | null;
  currency: string;
  quantity: number;
  maxQuantity: number;
  onChange: (q: number) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const total = (plan?.price ?? 0) * quantity;
  const atMax = quantity >= maxQuantity;
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.text }]}>How many people are you buying for?</Text>
      <Text style={[styles.sub, { color: colors.muted }]}>Choose the number now. Your payment total updates automatically.</Text>

      <View style={[styles.qtyCard, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
        <View style={styles.qtyHeader}>
          <Text style={[styles.planName, { color: colors.text }]} numberOfLines={1}>{plan?.name ?? 'Ticket'}</Text>
          <Text style={[styles.planPrice, { color: colors.text }]}>{formatMoney(plan?.price ?? 0, currency)} each</Text>
        </View>

        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => onChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            style={[styles.stepBtn, { borderColor: colors.cardBorder, opacity: quantity <= 1 ? 0.4 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Fewer tickets"
          >
            <Ionicons name="remove" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.qtyCenter}>
            <Text style={[styles.qtyNumber, { color: colors.text }]}>{quantity}</Text>
            <Text style={[styles.qtyLabel, { color: colors.muted }]}>{quantity === 1 ? 'person' : 'people'}</Text>
          </View>
          <Pressable
            onPress={() => onChange(Math.min(maxQuantity, quantity + 1))}
            disabled={atMax}
            style={[styles.stepBtn, { borderColor: colors.cardBorder, opacity: atMax ? 0.4 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="More tickets"
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.totalRow, { borderTopColor: colors.cardBorder }]}>
          <Text style={[styles.totalLabel, { color: colors.muted }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{formatMoney(total, currency)}</Text>
        </View>
      </View>
      {atMax ? <Text style={[styles.limitNote, { color: colors.muted2 }]}>{maxQuantity === 1 ? 'Only 1 ticket left.' : `Up to ${maxQuantity} tickets per order.`}</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={onClose} style={[styles.actionBtn, styles.actionCancel, { borderColor: colors.cardBorder }]} accessibilityRole="button">
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onContinue} style={[styles.actionBtn, styles.actionPrimary]} accessibilityRole="button">
          <Text style={styles.primaryText}>Continue · {formatMoney(total, currency)}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 20 },
  grabberRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 14 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  sub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 64, borderRadius: 32, borderWidth: 1, paddingHorizontal: 22, marginBottom: 12 },
  planName: { fontFamily: fonts.bodySemi, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  planPrice: { fontFamily: fonts.bodySemi, fontSize: 16, fontWeight: '700' },
  cancelBtn: { minHeight: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cancelText: { fontFamily: fonts.bodyMed, fontSize: 16 },
  qtyCard: { borderRadius: 28, borderWidth: 1, padding: 20 },
  qtyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginVertical: 18 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyCenter: { alignItems: 'center' },
  qtyNumber: { fontFamily: fonts.display, fontSize: 40, fontWeight: '800', lineHeight: 46 },
  qtyLabel: { fontFamily: fonts.bodySemi, fontSize: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontFamily: fonts.bodySemi, fontSize: 17, fontWeight: '700' },
  totalValue: { fontFamily: fonts.display, fontSize: 24, fontWeight: '800' },
  limitNote: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 10, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  actionBtn: { height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  actionCancel: { flex: 1, borderWidth: 1 },
  actionPrimary: { flex: 1.5, backgroundColor: '#7C5CF0' },
  primaryText: { fontFamily: fonts.bodySemi, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
