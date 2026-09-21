import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { fonts, useTheme } from '../../theme';

export interface TabConfig {
  key: string;
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const DEFAULT_TAB_MAP: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }
> = {
  // Main System Tabs
  CommunitiesTab: {
    label: 'COMMUNITIES',
    icon: 'people-outline',
    activeIcon: 'people',
  },
  EventsTab: {
    label: 'EVENTS',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
  },
  HomeTab: {
    label: 'HOME',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  DemosTab: {
    label: 'DEMOS',
    icon: 'game-controller-outline',
    activeIcon: 'game-controller',
  },
  ExpertsTab: {
    label: 'EXPERTS',
    icon: 'shield-outline',
    activeIcon: 'shield-checkmark',
  },
  // Admin Operations Tabs
  AdminOverview: {
    label: 'OVERVIEW',
    icon: 'stats-chart-outline',
    activeIcon: 'stats-chart',
  },
  AdminApprovals: {
    label: 'APPROVALS',
    icon: 'checkmark-done-circle-outline',
    activeIcon: 'checkmark-done-circle',
  },
  AdminUsersTab: {
    label: 'USERS',
    icon: 'people-outline',
    activeIcon: 'people',
  },
  AdminBilling: {
    label: 'BILLING',
    icon: 'card-outline',
    activeIcon: 'card',
  },
  AdminSupportTab: {
    label: 'SUPPORT',
    icon: 'help-buoy-outline',
    activeIcon: 'help-buoy',
  },
};

const CUBE_SIZE = 50;
const CRADLE_SIZE = 76;
const CRADLE_DIAG = Math.ceil(CRADLE_SIZE * Math.SQRT2);
const CRADLE_CENTER_Y = -14; // cradle center relative to the bar's top edge
const CRADLE_CLIP_H = 56;
const CUBE_HALF = CUBE_SIZE / 2;
const BAR_PAD_X = 12; // inner left/right padding of the tab row

export function CyberCubicTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(Dimensions.get('window').width - 20);

  // Dynamically configure tabs based on navigation state routes
  const tabConfigs: TabConfig[] = state.routes.map((route) => {
    const preset = DEFAULT_TAB_MAP[route.name];
    if (preset) {
      return {
        key: route.key,
        name: route.name,
        ...preset,
      };
    }
    const options = descriptors?.[route.key]?.options;
    const label = (options?.title || route.name.replace(/(Tab|Screen)$/, '')).toUpperCase();
    return {
      key: route.key,
      name: route.name,
      label,
      icon: 'grid-outline',
      activeIcon: 'grid',
    };
  });

  const { colors, gradients, isLight } = useTheme();
  const activeTabIdx = Math.max(0, state.index);

  // Animated values for the Rolling Cubic Wheel
  const animIndex = useRef(new Animated.Value(activeTabIdx)).current;
  const prevIdxRef = useRef(activeTabIdx);

  useEffect(() => {
    if (activeTabIdx !== prevIdxRef.current) {
      const distance = Math.abs(activeTabIdx - prevIdxRef.current);
      const duration = Math.min(550, 320 + distance * 60);

      Animated.parallel([
        Animated.timing(animIndex, {
          toValue: activeTabIdx,
          duration,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: true,
        }),
      ]).start();

      prevIdxRef.current = activeTabIdx;
    }
  }, [activeTabIdx, animIndex]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== barWidth) {
      setBarWidth(w);
    }
  };

  const count = tabConfigs.length || 1;
  const tabWidth = (barWidth - BAR_PAD_X * 2) / count;

  // Build rolling interpolation arrays
  const indexInputRange: number[] = [];
  const translateXOutput: number[] = [];
  const rotateDegOutput: string[] = [];
  const iconCounterRotateOutput: string[] = [];

  const halfStepInputRange: number[] = [];
  const hopYOutput: number[] = [];
  const cubeScaleOutput: number[] = [];

  for (let i = 0; i < count; i++) {
    indexInputRange.push(i);
    translateXOutput.push(BAR_PAD_X + i * tabWidth + tabWidth / 2 - CUBE_HALF);
    const deg = (i - Math.floor(count / 2)) * 180;
    rotateDegOutput.push(`${deg}deg`);
    iconCounterRotateOutput.push(`${-deg}deg`);

    halfStepInputRange.push(i);
    hopYOutput.push(0);
    cubeScaleOutput.push(1);

    if (i < count - 1) {
      halfStepInputRange.push(i + 0.5);
      hopYOutput.push(-10);
      cubeScaleOutput.push(0.9);
    }
  }

  // Safe interpolations for single-route edge cases
  const safeInputRange = indexInputRange.length > 1 ? indexInputRange : [0, 1];
  const safeTranslateX =
    translateXOutput.length > 1 ? translateXOutput : [translateXOutput[0] || 0, translateXOutput[0] || 0];
  const safeRotateDeg = rotateDegOutput.length > 1 ? rotateDegOutput : ['0deg', '0deg'];
  const safeCounterRotate = iconCounterRotateOutput.length > 1 ? iconCounterRotateOutput : ['0deg', '0deg'];

  const safeHalfStepInput = halfStepInputRange.length > 1 ? halfStepInputRange : [0, 1];
  const safeHopY = hopYOutput.length > 1 ? hopYOutput : [0, 0];
  const safeCubeScale = cubeScaleOutput.length > 1 ? cubeScaleOutput : [1, 1];

  const translateX = animIndex.interpolate({
    inputRange: safeInputRange,
    outputRange: safeTranslateX,
  });

  const rotateDeg = animIndex.interpolate({
    inputRange: safeInputRange,
    outputRange: safeRotateDeg,
  });

  const hopY = animIndex.interpolate({
    inputRange: safeHalfStepInput,
    outputRange: safeHopY,
  });

  const cubeScale = animIndex.interpolate({
    inputRange: safeHalfStepInput,
    outputRange: safeCubeScale,
  });

  const iconCounterRotate = animIndex.interpolate({
    inputRange: safeInputRange,
    outputRange: safeCounterRotate,
  });

  const activeConfig = tabConfigs[activeTabIdx] || tabConfigs[0];

  const handleTabPress = (config: TabConfig) => {
    const route = state.routes.find((r) => r.key === config.key);
    if (route) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }
  };

  // SVG Chamfer-cut bar outline — top-left + bottom-right cuts, same shape as the cards
  const cut = 20;
  const rad = 6;
  const barHeight = 64;
  const barPath = `
    M ${cut} 0
    H ${barWidth - rad}
    Q ${barWidth} 0 ${barWidth} ${rad}
    V ${barHeight - cut}
    L ${barWidth - cut} ${barHeight}
    H ${rad}
    Q 0 ${barHeight} 0 ${barHeight - rad}
    V ${cut}
    Z
  `;
  const barBorder = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(150, 180, 230, 0.28)';

  const scrimHeight = 64 + Math.max(insets.bottom, 12) + 64;
  const scrimColor = isLight ? '255, 255, 255' : '9, 15, 28';

  return (
    <>
    {/* Soft progressive blur + scrim under the bar so scrolled content doesn't clutter it */}
    <View pointerEvents="none" style={[styles.scrim, { height: scrimHeight }]}>
      {[[0.9, 8], [0.66, 18], [0.42, 32]].map(([h, intensity]) => (
        <BlurView
          key={intensity}
          intensity={intensity}
          tint={isLight ? 'light' : 'dark'}
          style={[styles.scrimBlur, { height: scrimHeight * h }]}
        />
      ))}
      <LinearGradient
        colors={[`rgba(${scrimColor}, 0)`, `rgba(${scrimColor}, 0.55)`, `rgba(${scrimColor}, 0.92)`]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
    <View
      style={[
        styles.outerWrap,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.barContainer, isLight && styles.barContainerLight]} onLayout={onBarLayout}>
        {/* Chamfer-cut SVG Background with obsidian glass fill & specular neon border */}
        <Svg
          width={barWidth}
          height={barHeight}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {/* Figma: linear-gradient(92.37deg, rgba(42,70,130,.58) 0.29%, rgba(9,15,28,.58) 110.52%) */}
            <SvgGradient id="barFill" x1="0" y1="0.5" x2="1" y2="0.54">
              <Stop offset="0" stopColor="#2A4682" stopOpacity={0.58} />
              <Stop offset="1" stopColor="#0C1426" stopOpacity={0.58} />
            </SvgGradient>
          </Defs>
          <Path
            d={barPath}
            fill={isLight ? 'rgba(255, 255, 255, 0.95)' : 'url(#barFill)'}
            stroke={barBorder}
            strokeWidth={1}
          />
        </Svg>

        {/* V-notch cut into the bar's top edge under the diamond: the dark rotated square is
            clipped at the bar's top so only the part dipping into the bar shows. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.notchClip,
            { transform: [{ translateX }], marginLeft: CUBE_HALF - CRADLE_DIAG / 2 },
          ]}
        >
          <View
            style={[
              styles.cradle,
              { borderColor: barBorder, backgroundColor: isLight ? '#F1F5F9' : '#0A101E' },
            ]}
          />
        </Animated.View>

        {/* Dynamic Rolling Cubic Wheel */}
        <Animated.View
          style={[
            styles.cubicWheelWrap,
            {
              transform: [
                { translateX },
                { translateY: hopY },
                { scale: cubeScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          {/* Outer Diamond Cradle Shadow */}
          <Animated.View
            style={[
              styles.cubicGlowShadow,
              {
                transform: [{ rotate: rotateDeg }, { rotate: '45deg' }],
              },
            ]}
          >
            <LinearGradient
              colors={gradients.cyber}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cubeGradient}
            />
          </Animated.View>

          {/* Gyroscopically Stabilized Center Icon */}
          <Animated.View
            style={[
              styles.gyroIconWrap,
              {
                transform: [{ rotate: iconCounterRotate }],
              },
            ]}
          >
            <Ionicons
              name={activeConfig?.activeIcon || 'grid'}
              size={22}
              color="#FFFFFF"
            />
          </Animated.View>
        </Animated.View>

        {/* Bottom Tab Touch Targets */}
        <View style={styles.tabsRow}>
          {tabConfigs.map((config, index) => {
            const isFocused = activeTabIdx === index;

            return (
              <Pressable
                key={config.key}
                onPress={() => handleTabPress(config)}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel={config.label}
              >
                {/* Inactive Icon sits in place; active icon is lifted into the rolling cubic wheel */}
                <View style={styles.iconSlot}>
                  {!isFocused ? (
                    <Ionicons
                      name={config.icon}
                      size={21}
                      color={isLight ? colors.muted : '#B4C0D6'}
                    />
                  ) : (
                    <View style={styles.emptySpacer} />
                  )}
                </View>

                {/* Tab Label */}
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused
                      ? [styles.tabLabelActive, isLight && styles.tabLabelActiveLight]
                      : [styles.tabLabelInactive, { color: isLight ? colors.muted : '#B4C0D6' }],
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {isFocused ? '' : config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  scrimBlur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  outerWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    alignItems: 'center',
  },
  barContainer: {
    width: '100%',
    height: 64,
    position: 'relative',
    justifyContent: 'center',
  },
  barContainerLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: BAR_PAD_X,
    height: '100%',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    gap: 4,
  },
  iconSlot: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySpacer: {
    width: 22,
    height: 22,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    letterSpacing: 0.2,
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
  },
  tabLabelInactive: {
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#00E5FF',
    fontWeight: '700',
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tabLabelActiveLight: {
    color: '#6D35FF',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  notchClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CRADLE_DIAG,
    height: CRADLE_CLIP_H,
    overflow: 'hidden',
  },
  cradle: {
    position: 'absolute',
    width: CRADLE_SIZE,
    height: CRADLE_SIZE,
    left: (CRADLE_DIAG - CRADLE_SIZE) / 2,
    top: CRADLE_CENTER_Y - CRADLE_SIZE / 2,
    borderRadius: 14,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  cubicWheelWrap: {
    position: 'absolute',
    top: -40,
    left: 0,
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cubicGlowShadow: {
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    borderRadius: 12,
    shadowColor: '#6D35FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  cubeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  gyroIconWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
