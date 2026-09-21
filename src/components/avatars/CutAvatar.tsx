import React from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Image as SvgImage, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

/** Avatar clipped to the app's chamfer (top-left + bottom-right cut) with a matching border —
 * drawn in SVG so the image itself is cut, not just a rectangle sitting over a cut frame. */
export function CutAvatar({
  source,
  size = 64,
  cut = 16,
  borderColor = 'rgba(216, 60, 255, 0.6)',
  borderWidth = 1.5,
  fill = 'rgba(45, 30, 75, 0.85)',
  gradientBorder,
}: {
  source: ImageSourcePropType;
  size?: number;
  cut?: number;
  borderColor?: string;
  borderWidth?: number;
  fill?: string;
  /** Overrides borderColor with a 3-stop diagonal gradient stroke (used for the live/ring look). */
  gradientBorder?: [string, string, string];
}) {
  const uid = React.useId().replace(/:/g, '');
  const clipId = `cutAvatarClip-${uid}`;
  const gradId = `cutAvatarGrad-${uid}`;
  const o = borderWidth / 2;
  const path = `M ${o + cut} ${o} L ${size - o - 6} ${o} Q ${size - o} ${o} ${size - o} ${o + 6} L ${size - o} ${size - o - cut} L ${size - o - cut} ${size - o} L ${o + 6} ${size - o} Q ${o} ${size - o} ${o} ${size - o - 6} L ${o} ${o + cut} Z`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={path} />
          </ClipPath>
          {gradientBorder ? (
            <SvgGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradientBorder[0]} />
              <Stop offset="0.5" stopColor={gradientBorder[1]} />
              <Stop offset="1" stopColor={gradientBorder[2]} />
            </SvgGradient>
          ) : null}
        </Defs>
        <Path d={path} fill={fill} />
        <G clipPath={`url(#${clipId})`}>
          <SvgImage href={source} width={size} height={size} preserveAspectRatio="xMidYMid slice" />
        </G>
        <Path d={path} fill="none" stroke={gradientBorder ? `url(#${gradId})` : borderColor} strokeWidth={borderWidth} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
