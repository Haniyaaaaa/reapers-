import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

interface CyberSocialRowProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  loadingProvider?: 'google' | 'apple' | null;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CyberSocialRow({
  onGooglePress,
  onApplePress,
  loadingProvider,
  disabled = false,
  style,
}: CyberSocialRowProps) {
  const { colors, isLight } = useTheme();

  const items = [
    {
      key: 'google' as const,
      label: 'Sign in with Google',
      onPress: onGooglePress,
      icon: <FontAwesome name="google" size={19} color={colors.text} />,
    },
    {
      key: 'apple' as const,
      label: 'Sign in with Apple',
      onPress: onApplePress,
      icon: <Ionicons name="logo-apple" size={22} color={colors.text} />,
    },
  ];

  return (
    <View style={[styles.row, style]}>
      {items.map((item) => {
        const isLoading = loadingProvider === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            disabled={disabled || !!loadingProvider}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => [
              styles.pressable,
              { opacity: pressed || disabled ? 0.75 : 1 },
              pressed && styles.pressed,
            ]}
          >
            <CyberCutBox
              cutSize={12}
              radius={4}
              fill="rgba(14, 20, 35, 0.75)"
              borderColor="rgba(255, 255, 255, 0.12)"
              borderWidth={1}
              style={styles.box}
            >
              <View style={styles.inner}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  item.icon
                )}
              </View>
            </CyberCutBox>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  pressable: {
    flex: 1,
    height: 48,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  box: {
    width: '100%',
    height: '100%',
  },
  inner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
