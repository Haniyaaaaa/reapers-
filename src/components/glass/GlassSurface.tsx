import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

/** One frosted-glass look for the whole app (tour card, filter sheets): a real blur of what's behind,
 * a cool translucent tint, a soft top-left sheen and a light edge.
 *
 * Legibility: iPhone blurs for real, so a lighter tint is enough. Android's blur is far weaker, so
 * there the body is nearly opaque — otherwise the screen behind shows through and its text collides
 * with the surface's own text. The sheen and edge keep the glass character either way. */
const BODY = {
  dark: { ios: 'rgba(15, 22, 44, 0.62)', android: 'rgba(15, 22, 44, 0.93)' },
  light: { ios: 'rgba(255, 255, 255, 0.62)', android: 'rgba(255, 255, 255, 0.95)' },
};

type Radii = { radius?: number; topRadius?: number };

function radiiStyle({ radius = 0, topRadius }: Radii): ViewStyle {
  return topRadius !== undefined
    ? { borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }
    : { borderRadius: radius };
}

/** The glass layers only — drop it as the FIRST child of any container that has `overflow: 'hidden'`
 * and the same radii. Ignores touches. Use `sheet` for bottom sheets (no line along the bottom edge). */
export function GlassBackground({ radius = 0, topRadius, sheet = false, blurIntensity = 55 }: Radii & { sheet?: boolean; blurIntensity?: number }) {
  const { light } = useTheme();
  const body = BODY[light ? 'light' : 'dark'][Platform.OS === 'ios' ? 'ios' : 'android'];
  const radii = radiiStyle({ radius, topRadius });
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: body }]} pointerEvents="none" />
      <BlurView intensity={blurIntensity} tint={light ? 'light' : 'dark'} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: light ? 'rgba(120, 150, 220, 0.08)' : 'rgba(40, 58, 112, 0.14)' }]} pointerEvents="none" />
      <LinearGradient
        colors={light ? ['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.2)'] : ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Light edge, drawn on top of the layers so the blur can't hide it */}
      <View
        style={[
          StyleSheet.absoluteFill,
          radii,
          { borderWidth: 1, borderColor: light ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.22)' },
          sheet && { borderBottomWidth: 0 },
        ]}
        pointerEvents="none"
      />
    </>
  );
}

/** A ready-made glass container: rounded, clipped, with the glass layers behind its children. */
export function GlassSurface({
  children,
  style,
  radius = 22,
  sheet = false,
  blurIntensity,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** Bottom sheet: rounded on top only, no bottom edge line. */
  sheet?: boolean;
  blurIntensity?: number;
}) {
  return (
    <View style={[styles.surface, sheet ? radiiStyle({ topRadius: radius }) : { borderRadius: radius }, style]}>
      <GlassBackground radius={sheet ? 0 : radius} topRadius={sheet ? radius : undefined} sheet={sheet} blurIntensity={blurIntensity} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden' },
});
