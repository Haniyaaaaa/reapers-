import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { EXPERT_GOLD, EXPERT_GOLD_INK } from '../../../components/experts/ExpertBadge';
import { fonts, useTheme } from '../../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type ProfileMenuItem = {
  key: string;
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Gold treatment — used for the verified-expert entry. */
  premium?: boolean;
  /** Small status text on the right (e.g. "PENDING"). */
  tag?: string;
};

export type ProfileMenuSection = { title: string; items: ProfileMenuItem[] };

/** The own-profile shortcut list: grouped under small section labels, each row a cut-box card
 * with a gradient icon tile, a title + one-line description and a chevron. */
export function ProfileMenu({ sections }: { sections: ProfileMenuSection[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.muted }]}>{section.title}</Text>
            <View style={[styles.labelRule, { backgroundColor: colors.cardBorder }]} />
          </View>
          {section.items.map((item) => (
            <Row key={item.key} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Row({ item }: { item: ProfileMenuItem }) {
  const { colors } = useTheme();
  const accent = item.premium ? EXPERT_GOLD : colors.cyan;
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.press, pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] }]}
    >
      <CyberCutBox
        cutSize={10}
        radius={8}
        fill={item.premium ? 'rgba(245, 197, 66, 0.08)' : colors.cardFill}
        borderColor={item.premium ? 'rgba(245, 197, 66, 0.55)' : colors.cardBorder}
        borderWidth={item.premium ? 1 : 0.88}
      >
        <View style={styles.row}>
          <LinearGradient
            colors={item.premium ? ['#FFE27A', '#F5B301', '#B8860B'] : ['rgba(0,229,255,0.28)', 'rgba(109,53,255,0.28)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconTile, { borderColor: item.premium ? 'rgba(255, 226, 122, 0.8)' : 'rgba(0, 229, 255, 0.35)' }]}
          >
            <Ionicons name={item.icon} size={20} color={item.premium ? EXPERT_GOLD_INK : colors.cyan} />
          </LinearGradient>
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
          {item.tag ? (
            <View style={[styles.tag, { borderColor: accent, backgroundColor: `${accent}1F` }]}>
              <Text style={[styles.tagText, { color: accent }]}>{item.tag}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={item.premium ? EXPERT_GOLD : colors.muted} />
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  section: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  labelRule: { flex: 1, height: StyleSheet.hairlineWidth },
  press: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  iconTile: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15 },
  subtitle: { marginTop: 2, fontFamily: fonts.body, fontSize: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  tagText: { fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1 },
});
