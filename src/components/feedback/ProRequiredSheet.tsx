import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts, useTheme } from '../../theme';

/** Centered "this is a paid feature" popup shown when the server rejects an action for lack of
 * an active plan — replaces a small inline error line that was easy to miss. */
export function ProRequiredSheet({
  visible,
  title = 'Pro feature',
  body,
  onUpgrade,
  onClose,
}: {
  visible: boolean;
  title?: string;
  body: string;
  onUpgrade: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.cardWrap} onPress={() => undefined}>
          <CyberCutBox
            cutSize={18}
            radius={8}
            fill={colors.surface}
            borderColor="rgba(168, 85, 247, 0.45)"
            borderWidth={1}
            style={styles.card}
          >
            <View style={styles.inner}>
              <CyberCutBox gradient gradientDiagonal cutSize={12} radius={6} style={styles.iconBox}>
                <View style={styles.iconInner}>
                  <Ionicons name="diamond" size={28} color="#FFFFFF" />
                </View>
              </CyberCutBox>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>PAID</Text>
              </View>

              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>

              <Pressable onPress={onUpgrade} style={styles.ctaWrap} accessibilityRole="button">
                <CyberCutBox gradient cutSize={10} radius={6} style={styles.ctaCut}>
                  <View style={styles.ctaInner}>
                    <Text style={styles.ctaText}>Upgrade to Pro</Text>
                  </View>
                </CyberCutBox>
              </Pressable>

              <Pressable onPress={onClose} style={styles.laterBtn} accessibilityRole="button">
                <Text style={[styles.laterText, { color: colors.muted }]}>Maybe later</Text>
              </Pressable>
            </View>
          </CyberCutBox>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  cardWrap: { width: '100%', maxWidth: 380 },
  card: { width: '100%' },
  inner: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12 },
  iconBox: { width: 64, height: 64, marginBottom: 14 },
  iconInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.6)',
    backgroundColor: 'rgba(216, 60, 255, 0.12)',
    marginBottom: 12,
  },
  badgeText: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.4, color: '#D83CFF' },
  title: { fontFamily: fonts.display, fontSize: 21, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  ctaWrap: { width: '100%', height: 50 },
  ctaCut: { width: '100%', height: '100%' },
  ctaInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bodySemi, fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.4 },
  laterBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontFamily: fonts.bodyMed, fontSize: 14 },
});
