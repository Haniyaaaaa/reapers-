import React, { useId, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';

export interface CyberCutBoxProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  cutSize?: number;
  radius?: number;
  fill?: string;
  gradient?: boolean;
  /** Overrides the 3-stop gradient's colors when `gradient` is set — defaults to the brand
   * cyan/purple/magenta trio. Used for e.g. a red-toned danger CTA that still renders through
   * this component's own SVG-gradient chamfer path instead of a separate button component. */
  gradientColors?: [string, string, string];
  borderColor?: string;
  borderWidth?: number;
  onLayout?: (e: LayoutChangeEvent) => void;
  /** Real frosted-glass blur behind the card, on by default whenever there's a real fill
   * color to tint it with (solid gradient cards and transparent/outline-only boxes — buttons,
   * badges, glow underlines — opt out automatically). Set false to force it off. RN has no
   * way to clip a native blur to this shape's diagonal-cut corners without an extra masking
   * library, so the blur's own corners are approximated with `radius` — at this app's small
   * cutSize values (8-14px) that shows as a barely-visible squared sliver at the cut corners
   * rather than a perfectly crisp diagonal, a deliberate trade-off over adding a new
   * masking dependency for pixel-perfect corners. */
  glass?: boolean;
}

// Matches this codebase's consistent `rgba(r, g, b, a)` fill convention (every call site uses
// this exact form) so the glass effect can re-tint at a lower, blur-appropriate alpha without
// touching every individual call site's fill value.
function withGlassAlpha(color: string, alpha: number): string {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return color;
  const [r, g, b] = match[1].split(',').map((p) => p.trim());
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const CYBER_GRADIENT_COLORS = {
  cyan: '#00E5FF',
  purple: '#6D35FF',
  magenta: '#D83CFF',
};

export function CyberCutBox({
  children,
  style,
  cutSize = 14,
  radius = 4,
  fill = 'transparent',
  gradient = false,
  gradientColors,
  borderColor = 'transparent',
  borderWidth = 0,
  onLayout,
  glass,
}: CyberCutBoxProps) {
  const { colors, light, gradients } = useTheme();

  // Smart remap for legacy hardcoded dark fills & borders so unmigrated screens automatically render light cards safely
  let effectiveFill = fill;
  let effectiveBorder = borderColor;

  if (light) {
    if (
      fill.startsWith('rgba(14, 20, 35') ||
      fill.startsWith('rgba(18, 14, 36') ||
      fill.startsWith('rgba(9, 15, 28') ||
      fill === '#121729' ||
      fill === '#0E1423'
    ) {
      effectiveFill = colors.cardFill;
    } else if (fill.startsWith('rgba(40, 15, 25')) {
      effectiveFill = 'rgba(254, 242, 242, 0.85)';
    }

    if (
      borderColor.startsWith('rgba(255, 255, 255, 0.1') ||
      borderColor.startsWith('rgba(255, 255, 255, 0.0') ||
      borderColor.startsWith('rgba(255, 255, 255, 0.2')
    ) {
      effectiveBorder = colors.cardBorder;
    } else if (borderColor.startsWith('rgba(255, 77, 109')) {
      effectiveBorder = 'rgba(220, 38, 38, 0.4)';
    }
  }

  const isCardFill =
    effectiveFill === colors.cardFill ||
    effectiveFill.startsWith('rgba(14, 20, 35') ||
    effectiveFill.startsWith('rgba(18, 14, 36') ||
    effectiveFill.startsWith('rgba(9, 15, 28') ||
    effectiveFill === '#121729' ||
    effectiveFill === '#0E1423';

  const showGlass = Boolean(glass) && !gradient && effectiveFill !== 'transparent';
  const flattened = StyleSheet.flatten(style) || {};
  const initialWidth = typeof flattened.width === 'number' ? flattened.width : 0;
  const initialHeight = typeof flattened.height === 'number' ? flattened.height : 0;

  const [size, setSize] = useState<{ width: number; height: number } | null>(
    initialWidth > 0 && initialHeight > 0 ? { width: initialWidth, height: initialHeight } : null
  );
  const rawId = useId();
  const gradId = `cyber-cut-grad-${rawId.replace(/:/g, '')}`;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      if (!size || size.width !== width || size.height !== height) {
        setSize({ width, height });
      }
    }
    onLayout?.(e);
  };

  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  const c = Math.min(cutSize, Math.min(w, h) / 2);
  const r = Math.min(radius, Math.min(w, h) / 4);
  const strokeOffset = borderWidth > 0 ? borderWidth / 2 : 0;

  const x0 = strokeOffset;
  const y0 = strokeOffset;
  const x1 = w - strokeOffset;
  const y1 = h - strokeOffset;

  // Path coordinates with chamfer cuts on top-left and bottom-right
  const pathData =
    w > 0 && h > 0
      ? [
          `M ${x0 + c} ${y0}`,
          `L ${x1 - r} ${y0}`,
          r > 0 ? `Q ${x1} ${y0} ${x1} ${y0 + r}` : `L ${x1} ${y0}`,
          `L ${x1} ${y1 - c}`,
          `L ${x1 - c} ${y1}`,
          `L ${x0 + r} ${y1}`,
          r > 0 ? `Q ${x0} ${y1} ${x0} ${y1 - r}` : `L ${x0} ${y1}`,
          `L ${x0} ${y0 + c}`,
          'Z',
        ].join(' ')
      : '';

  const defaultGrad = light
    ? gradients.cyber
    : [CYBER_GRADIENT_COLORS.cyan, CYBER_GRADIENT_COLORS.purple, CYBER_GRADIENT_COLORS.magenta];

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {showGlass && w > 0 && h > 0 && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: 'hidden' }]} pointerEvents="none">
          <BlurView intensity={60} tint={light ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          {/* Subtle left-to-right sheen highlight */}
          <ExpoLinearGradient
            colors={
              light
                ? ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.15)']
                : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.05)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.02 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
      {w > 0 && h > 0 && (
        <Svg
          width={w}
          height={h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            {gradient && (
              <SvgGradient
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop offset="0%" stopColor={gradientColors?.[0] ?? defaultGrad[0]} />
                <Stop offset="50%" stopColor={gradientColors?.[1] ?? defaultGrad[1]} />
                <Stop offset="100%" stopColor={gradientColors?.[2] ?? defaultGrad[2]} />
              </SvgGradient>
            )}
          </Defs>
          <Path
            d={pathData}
            fill={
              gradient
                ? `url(#${gradId})`
                : showGlass
                ? (light ? colors.cardFill : withGlassAlpha(effectiveFill, 0.22))
                : effectiveFill
            }
            stroke={effectiveBorder || 'none'}
            strokeWidth={borderWidth}
            strokeLinejoin="round"
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
});
