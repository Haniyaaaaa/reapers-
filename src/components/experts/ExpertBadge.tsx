import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts } from '../../theme';

/** Verified experts are gold/premium everywhere (profile, directory, cards) — one shared set of
 * tokens so the badge, tick and avatar ring can't drift back to the generic cyan "verified". */
export const EXPERT_GOLD = '#F5C542';
export const EXPERT_GOLD_GRADIENT: [string, string, string] = ['#FFE27A', '#F5B301', '#B8860B'];
export const EXPERT_GOLD_INK = '#3A2600';

// A 12-point rosette ("seal") outline in a 100x100 box — the classic verified-badge silhouette.
const SEAL_POINTS = 12;
const SEAL_PATH = (() => {
  const pts: string[] = [];
  for (let i = 0; i < SEAL_POINTS * 2; i++) {
    const angle = (i * Math.PI) / SEAL_POINTS - Math.PI / 2;
    const r = i % 2 === 0 ? 47 : 41;
    pts.push(`${(50 + r * Math.cos(angle)).toFixed(2)} ${(50 + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

/** Premium verified seal: gold rosette with a subtle inner ring, top-left highlight and a bold
 * check. `tone="ink"` flips it (dark seal, gold check) for use on top of gold backgrounds, where a
 * gold seal would disappear. */
export function VerifiedSeal({ size = 16, tone = 'gold' }: { size?: number; tone?: 'gold' | 'ink' }) {
  const id = useId().replace(/:/g, '');
  const gold = tone === 'gold';
  return (
    <View style={gold ? styles.glow : undefined} accessibilityLabel="Verified expert">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={EXPERT_GOLD_GRADIENT[0]} />
            <Stop offset="0.55" stopColor={EXPERT_GOLD_GRADIENT[1]} />
            <Stop offset="1" stopColor={EXPERT_GOLD_GRADIENT[2]} />
          </LinearGradient>
        </Defs>
        <Path
          d={SEAL_PATH}
          fill={gold ? `url(#g${id})` : EXPERT_GOLD_INK}
          stroke={gold ? `url(#g${id})` : EXPERT_GOLD_INK}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <Circle cx={50} cy={50} r={31} fill="none" stroke={gold ? 'rgba(255,255,255,0.55)' : 'rgba(245,197,66,0.6)'} strokeWidth={2} />
        {gold ? <Ellipse cx={36} cy={27} rx={20} ry={9} fill="rgba(255,255,255,0.22)" transform="rotate(-30 36 27)" /> : null}
        <Path
          d="M32 52 L44 64 L69 38"
          fill="none"
          stroke={gold ? EXPERT_GOLD_INK : EXPERT_GOLD}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/** Gold "VERIFIED EXPERT" pill (same look as the one on the profile screen). */
export function ExpertBadge({ label = 'VERIFIED EXPERT' }: { label?: string }) {
  return (
    <View style={styles.wrap} accessibilityLabel="Verified expert">
      <CyberCutBox gradient gradientColors={EXPERT_GOLD_GRADIENT} cutSize={6} radius={4} style={styles.cut}>
        <View style={styles.inner}>
          <VerifiedSeal size={15} tone="ink" />
          <Text style={styles.text}>{label}</Text>
        </View>
      </CyberCutBox>
    </View>
  );
}

/** Verified seal that sits next to an expert's name. */
export function ExpertTick({ size = 16 }: { size?: number }) {
  return <VerifiedSeal size={size + 2} />;
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#F5B301',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  wrap: {
    alignSelf: 'flex-start',
    shadowColor: '#F5B301',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  cut: { height: 24, paddingHorizontal: 10, justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 1, color: EXPERT_GOLD_INK },
});
