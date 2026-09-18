import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StatusBar, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Figma Design Specs:
 * Background:
 *   #090F1C
 *   radial-gradient(231.59% 69.15% at 109.33% 106.59%, rgba(68, 34, 81, 0.5) 0%, rgba(68, 34, 81, 0) 62%)
 *   radial-gradient(68.6% 40.16% at 12.13% 1.79%, rgba(0, 63, 63, 0.35) 0%, rgba(0, 63, 63, 0) 62%)
 *   linear-gradient(0deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2))
 *
 * Diagonal Accent Lines (Both running bottom-left to top-right):
 *   Top-left line: connects left edge (~36% H) up-right to top edge (~48% W)
 *   Bottom-right line: connects bottom edge (~42% W) up-right to right edge (~58% H)
 *   Stroke: width 1.51px, opacity 0.3, linear-gradient(#26817D -> #275368 -> #6C3B7B)
 *
 * Centered Logo:
 *   Proportionally sized to match Figma (28.2% of screen width)
 *
 * Animation (Figma Smart Animate):
 *   animation-delay: 3ms
 *   animation-timing-function: cubic-bezier(0.7, -0.4, 0.4, 1.4)
 *   animation-duration: 800ms
 *   Transitions from "splash screen 2" (facing right) to "splash screen 3" (flipped horizontally)
 */

const FIGMA_EASING = Easing.bezier(0.7, -0.4, 0.4, 1.4);

interface SplashScreenProps {
  onAnimationEnd?: () => void;
}

export function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  const flipProgress = useRef(new Animated.Value(0)).current;
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

  // SVG Line coordinates matching Figma exactly
  // Top-left line: from left edge to top edge (diagonal left top)
  const topX1 = 0;
  const topY1 = windowHeight * 0.36;
  const topX2 = windowWidth * 0.48;
  const topY2 = 0;

  // Bottom-right line: from bottom edge to right edge (diagonal right bottom)
  const botX1 = windowWidth * 0.42;
  const botY1 = windowHeight;
  const botX2 = windowWidth;
  const botY2 = windowHeight * 0.58;

  useEffect(() => {
    // Brief pause on splash screen 2 before flipping
    const startTimer = setTimeout(() => {
      Animated.timing(flipProgress, {
        toValue: 1,
        duration: 800,
        easing: FIGMA_EASING,
        useNativeDriver: true,
      }).start(() => {
        // Short hold on splash screen 3 — long enough to read as a deliberate transition,
        // not so long the whole splash drags (total is ~2.5s now, was ~5.8s).
        const endTimer = setTimeout(() => {
          onAnimationEnd?.();
        }, 1100);
        return () => clearTimeout(endTimer);
      });
    }, 600);

    return () => clearTimeout(startTimer);
  }, [flipProgress, onAnimationEnd]);

  // Flip from 1 (splash screen 2 - facing right) to -1 (splash screen 3 - facing left)
  const scaleX = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -1],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Exact Figma Background & Diagonal Lines */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Radial Gradient 1: 231.59% 69.15% at 109.33% 106.59%, rgba(68, 34, 81, 0.5) 0%, rgba(68, 34, 81, 0) 62% */}
          <RadialGradient
            id="purpleGlow"
            cx="109.33%"
            cy="106.59%"
            rx="231.59%"
            ry="69.15%"
            fx="109.33%"
            fy="106.59%"
          >
            <Stop offset="0%" stopColor="#442251" stopOpacity={0.5} />
            <Stop offset="62%" stopColor="#442251" stopOpacity={0} />
            <Stop offset="100%" stopColor="#442251" stopOpacity={0} />
          </RadialGradient>

          {/* Radial Gradient 2: 68.6% 40.16% at 12.13% 1.79%, rgba(0, 63, 63, 0.35) 0%, rgba(0, 63, 63, 0) 62% */}
          <RadialGradient
            id="tealGlow"
            cx="12.13%"
            cy="1.79%"
            rx="68.6%"
            ry="40.16%"
            fx="12.13%"
            fy="1.79%"
          >
            <Stop offset="0%" stopColor="#003F3F" stopOpacity={0.35} />
            <Stop offset="62%" stopColor="#003F3F" stopOpacity={0} />
            <Stop offset="100%" stopColor="#003F3F" stopOpacity={0} />
          </RadialGradient>

          {/* Diagonal Line Gradient: #26817D 0%, #275368 48%, #6C3B7B 100% */}
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#26817D" />
            <Stop offset="0.48" stopColor="#275368" />
            <Stop offset="1" stopColor="#6C3B7B" />
          </LinearGradient>
        </Defs>

        {/* Base Background: #090F1C */}
        <Rect width="100%" height="100%" fill="#090F1C" />

        {/* Purple glow at bottom right */}
        <Rect width="100%" height="100%" fill="url(#purpleGlow)" />

        {/* Teal glow at top left */}
        <Rect width="100%" height="100%" fill="url(#tealGlow)" />

        {/* Linear overlay: 0deg rgba(0, 0, 0, 0.2) */}
        <Rect width="100%" height="100%" fill="#000000" fillOpacity={0.2} />

        {/* Top-Left Diagonal Line (diagonal left top): connects left edge up to top edge */}
        <Line
          x1={topX1}
          y1={topY1}
          x2={topX2}
          y2={topY2}
          stroke="url(#lineGrad)"
          strokeWidth={1.51}
          strokeOpacity={0.3}
        />

        {/* Bottom-Right Diagonal Line (diagonal right bottom): connects bottom edge up to right edge */}
        <Line
          x1={botX1}
          y1={botY1}
          x2={botX2}
          y2={botY2}
          stroke="url(#lineGrad)"
          strokeWidth={1.51}
          strokeOpacity={0.3}
        />
      </Svg>

      {/* Centered Logo with Exact Smart-Animate Flip & Proper Figma Proportion */}
      <View style={styles.center} pointerEvents="none">
        <Animated.Image
          source={require('../../../../assets/reaper-mark.png')}
          style={[
            styles.mark,
            {
              transform: [{ scaleX }],
            },
          ]}
          accessibilityLabel="Reapers logo"
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
    overflow: 'hidden',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 230,
    height: 230,
  },
});
