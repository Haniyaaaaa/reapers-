import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { fonts } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

interface CyberButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  cutSize?: number;
}

export function CyberButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  height = 50,
  cutSize = 14,
}: CyberButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.outer,
        { opacity: pressed || disabled ? 0.8 : 1 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <CyberCutBox
        gradient
        cutSize={cutSize}
        radius={4}
        style={[styles.box, { height }]}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    shadowColor: '#6D35FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  box: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
