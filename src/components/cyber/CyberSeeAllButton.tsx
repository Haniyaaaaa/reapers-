import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts, useTheme } from '../../theme';

interface CyberSeeAllButtonProps {
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/** Plain text link ("See all >") per the Figma section headers — deliberately not a button. */
export function CyberSeeAllButton({
  label = 'See all',
  onPress,
  accessibilityLabel,
}: CyberSeeAllButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
