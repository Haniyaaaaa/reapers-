import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// login-bg.webp native dimensions: 941 x 1672 (aspect ratio ~0.5628)
const IMAGE_ASPECT_RATIO = 941 / 1672;

interface CyberBackgroundProps {
  showArtwork?: boolean;
  opacity?: number;
}

export function CyberBackground({ showArtwork = false, opacity = 0.22 }: CyberBackgroundProps) {
  const { colors, light } = useTheme();
  const bgHeight = Math.max(SCREEN_HEIGHT, SCREEN_WIDTH / IMAGE_ASPECT_RATIO) + 60;
  const bgWidth = Math.max(SCREEN_WIDTH, bgHeight * IMAGE_ASPECT_RATIO);
  const leftOffset = (SCREEN_WIDTH - bgWidth) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base Theme Color: #090F1C in dark, #F3F6FB in light */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />

      {/* Cyberpunk Artwork ONLY displayed on auth/onboarding screens when showArtwork={true} */}
      {showArtwork ? (
        <>
          <Image
            source={require('../../../assets/login-bg.webp')}
            style={[
              styles.image,
              {
                width: bgWidth,
                height: bgHeight,
                left: leftOffset,
                top: -50,
                opacity: light ? opacity * 0.55 : opacity,
              },
            ]}
            resizeMode="cover"
          />

          <LinearGradient
            colors={
              light
                ? [
                    'rgba(243, 246, 251, 0.75)',
                    'rgba(243, 246, 251, 0.55)',
                    'rgba(243, 246, 251, 0.75)',
                    'rgba(243, 246, 251, 0.95)',
                  ]
                : [
                    'rgba(9, 15, 28, 0.65)',
                    'rgba(9, 15, 28, 0.45)',
                    'rgba(9, 15, 28, 0.65)',
                    'rgba(9, 15, 28, 0.92)',
                  ]
            }
            locations={[0, 0.28, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        /* Atmospheric Radial Gradients:
           Dark: Deep Plum + Neon Cyan glow
           Light: Soft Orchid + Subtle Electric Teal glow (Pearlescent Lab Frost) */
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient
              id="figma-bottom-radial"
              cx="109.33%"
              cy="106.59%"
              rx="231.59%"
              ry="69.15%"
              fx="109.33%"
              fy="106.59%"
            >
              <Stop
                offset="0%"
                stopColor={light ? '#9333EA' : '#442251'}
                stopOpacity={light ? 0.06 : 0.5}
              />
              <Stop
                offset="62%"
                stopColor={light ? '#9333EA' : '#442251'}
                stopOpacity={0}
              />
              <Stop
                offset="100%"
                stopColor={light ? '#9333EA' : '#442251'}
                stopOpacity={0}
              />
            </RadialGradient>

            <RadialGradient
              id="figma-top-radial"
              cx="0%"
              cy="0%"
              rx="80%"
              ry="45%"
              fx="0%"
              fy="0%"
            >
              <Stop
                offset="0%"
                stopColor={light ? '#0891B2' : '#00E5FF'}
                stopOpacity={light ? 0.07 : 0.08}
              />
              <Stop
                offset="100%"
                stopColor={light ? '#0891B2' : '#00E5FF'}
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#figma-bottom-radial)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#figma-top-radial)" />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
  },
});
