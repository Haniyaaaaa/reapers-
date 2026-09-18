import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

interface CyberChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CyberChip({ label, selected, onPress, style }: CyberChipProps) {
  const { colors, isLight } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        style,
      ]}
    >
      <CyberCutBox
        cutSize={8}
        radius={4}
        fill={selected ? (isLight ? 'rgba(0, 180, 216, 0.12)' : 'rgba(30, 24, 56, 0.95)') : (isLight ? '#FFFFFF' : 'rgba(12, 17, 30, 0.75)')}
        borderColor={selected ? (isLight ? colors.primary : '#00E5FF') : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)')}
        borderWidth={1}
        style={styles.box}
      >
        <View style={styles.inner}>
          {selected && (
            <Ionicons
              name="checkmark-sharp"
              size={13}
              color={isLight ? colors.primary : '#00E5FF'}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: selected ? (isLight ? colors.primary : '#FFFFFF') : colors.muted },
              selected && styles.textSelected,
            ]}
          >
            {label}
          </Text>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginRight: 8,
    marginBottom: 8,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  box: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: {
    marginRight: 1,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  textSelected: {
    fontWeight: '700',
  },
});
