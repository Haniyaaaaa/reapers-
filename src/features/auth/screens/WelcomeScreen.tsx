import React from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Polygon, Stop } from 'react-native-svg';

import type { AuthStackParamList } from '../../../navigation/types';
import { fonts, space } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = Math.min(SCREEN_WIDTH - 48, 330);
const BUTTON_HEIGHT = 48;

// Exact Figma Chamfer Cuts:
// Top-Right: 14px diagonal cut
// Bottom-Left: 20px x 16px diagonal cut
const CUT_TR = 14;
const CUT_BL_X = 20;
const CUT_BL_Y = 16;

const appVersion = Constants.expoConfig?.version ?? '1.0.0';
const buildNumber = Constants.nativeBuildVersion ?? 'BUILD 2026.09';
const versionLabel = `V${appVersion} · ${buildNumber}`;

export function WelcomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  // Six-point polygon for the dual-cut cyberpunk button from Figma:
  // 1. Top-Left: (0, 0)
  // 2. Top-Right start: (W - CUT_TR, 0)
  // 3. Top-Right cut end: (W, CUT_TR)
  // 4. Bottom-Right: (W, H)
  // 5. Bottom-Left cut start: (CUT_BL_X, H)
  // 6. Bottom-Left cut end: (0, H - CUT_BL_Y)
  const buttonPolygonPoints = [
    `0,0`,
    `${BUTTON_WIDTH - CUT_TR},0`,
    `${BUTTON_WIDTH},${CUT_TR}`,
    `${BUTTON_WIDTH},${BUTTON_HEIGHT}`,
    `${CUT_BL_X},${BUTTON_HEIGHT}`,
    `0,${BUTTON_HEIGHT - CUT_BL_Y}`,
  ].join(' ');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-screen Background Artwork */}
      <ImageBackground
        source={require('../../../../assets/login-bg.webp')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Soft Vignette & Bottom Dark Fade — artwork stays vivid up top, only fades to dark
            toward the bottom where it needs to yield to the text/button, matching the Figma
            reference rather than dimming the whole image uniformly. */}
        <LinearGradient
          colors={[
            'rgba(9, 15, 28, 0.05)',
            'rgba(9, 15, 28, 0.15)',
            'rgba(9, 15, 28, 0.55)',
            'rgba(9, 15, 28, 0.92)',
            '#090F1C',
          ]}
          locations={[0, 0.35, 0.6, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* Screen Content */}
      <SafeAreaView style={styles.safeArea}>
        {/* Header Branding */}
        <View style={styles.topHeader}>
          <Image
            source={require('../../../../assets/reaper-mark.png')}
            style={styles.logoMark}
            resizeMode="contain"
            accessibilityLabel="Reapers Logo"
          />
          <Text style={styles.brandTitle}>REAPERS</Text>
          <LinearGradient
            colors={['#00D4FF', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.brandDivider}
          />
          <Text style={styles.brandTagline}>GAMERS · DEVELOPERS · INDUSTRY</Text>
        </View>

        {/* Dynamic spacer above CTA to position welcome text across character torso */}
        <View style={styles.topSpacer} />

        {/* Center/Lower CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.welcomeHeading}>WELCOME TO{'\n'}REAPERS</Text>
          <Text style={styles.subtitle}>
            One ecosystem for the people who play games{'\n'}and the people who build them.
          </Text>

          {/* Chamfered Cyberpunk Button with Top-Right and Bottom-Left cuts */}
          <View style={styles.buttonWrapper}>
            <Pressable
              onPress={() => nav.navigate('Login')}
              style={({ pressed }) => [
                styles.pressableButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Enter Reapers"
            >
              <Svg width={BUTTON_WIDTH} height={BUTTON_HEIGHT} style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#41B8FF" />
                    <Stop offset="25%" stopColor="#3F7FFE" />
                    <Stop offset="70%" stopColor="#A939FF" />
                    <Stop offset="100%" stopColor="#CC3CFF" />
                  </SvgGradient>
                </Defs>
                <Polygon points={buttonPolygonPoints} fill="url(#btnGrad)" />
              </Svg>

              <Text style={styles.buttonText}>ENTER REAPERS</Text>
            </Pressable>
          </View>
        </View>

        {/* Generous breathing room below button matching Figma */}
        <View style={styles.bottomSpacer} />

        {/* Version */}
        <Text style={styles.version}>{versionLabel}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  topHeader: {
    alignItems: 'center',
    marginTop: space.sm,
  },
  logoMark: {
    width: 54,
    height: 54,
    marginBottom: 4,
  },
  brandTitle: {
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 31.82,
    lineHeight: 31.82,
    letterSpacing: 5.09,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  brandDivider: {
    width: 44,
    height: 1.5,
    marginVertical: 8,
    borderRadius: 1,
  },
  brandTagline: {
    fontFamily: fonts.displayMed,
    fontSize: 9,
    letterSpacing: 2.2,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  topSpacer: {
    flex: 2.6,
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
  },
  welcomeHeading: {
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 3.5,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: space.xs + 2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontFamily: fonts.displayMed,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    marginBottom: space.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonWrapper: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableButton: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 2.5,
    color: '#FFFFFF',
  },
  bottomSpacer: {
    flex: 1,
  },
  version: {
    fontFamily: fonts.displayMed,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    marginBottom: space.xs,
  },
});