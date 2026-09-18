import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

export type AuthTabType = 'login' | 'signup';

interface CyberTabsProps {
  activeTab: AuthTabType;
  onChangeTab: (tab: AuthTabType) => void;
  style?: StyleProp<ViewStyle>;
}

export function CyberTabs({ activeTab, onChangeTab, style }: CyberTabsProps) {
  const { colors, isLight } = useTheme();
  const isLogin = activeTab === 'login';

  return (
    <View style={[styles.container, style]}>
      {/* Outer chamfer-cut container */}
      <CyberCutBox
        cutSize={10}
        radius={3}
        fill={isLight ? colors.cardFill : 'rgba(11, 16, 28, 0.85)'}
        borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.1)'}
        borderWidth={1}
        style={styles.outerBox}
      >
        <View style={styles.tabRow}>
          {/* LOG IN Tab */}
          <Pressable
            onPress={() => onChangeTab('login')}
            accessibilityRole="tab"
            accessibilityState={{ selected: isLogin }}
            style={styles.tabPressable}
          >
            {isLogin ? (
              <CyberCutBox
                gradient
                cutSize={10}
                radius={3}
                style={styles.activePill}
              >
                <View style={styles.pillInner}>
                  <Text style={styles.activeText}>LOG IN</Text>
                </View>
              </CyberCutBox>
            ) : (
              <View style={styles.inactivePill}>
                <Text style={[styles.inactiveText, { color: colors.muted }]}>LOG IN</Text>
              </View>
            )}
          </Pressable>

          {/* CREATE ACCOUNT Tab */}
          <Pressable
            onPress={() => onChangeTab('signup')}
            accessibilityRole="tab"
            accessibilityState={{ selected: !isLogin }}
            style={styles.tabPressable}
          >
            {!isLogin ? (
              <CyberCutBox
                gradient
                cutSize={10}
                radius={3}
                style={styles.activePill}
              >
                <View style={styles.pillInner}>
                  <Text style={styles.activeText}>CREATE ACCOUNT</Text>
                </View>
              </CyberCutBox>
            ) : (
              <View style={styles.inactivePill}>
                <Text style={[styles.inactiveText, { color: colors.muted }]}>CREATE ACCOUNT</Text>
              </View>
            )}
          </Pressable>
        </View>
      </CyberCutBox>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
  },
  outerBox: {
    width: '100%',
    height: 44,
  },
  tabRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
  },
  tabPressable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePill: {
    width: '100%',
    height: '100%',
  },
  pillInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactivePill: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  inactiveText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: '#6B7A90',
    textTransform: 'uppercase',
  },
});
