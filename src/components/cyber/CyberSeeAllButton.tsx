import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from './CyberCutBox';
import { fonts, useTheme } from '../../theme';

interface CyberSeeAllButtonProps {
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function CyberSeeAllButton({
  label = 'SEE ALL',
  onPress,
  accessibilityLabel,
}: CyberSeeAllButtonProps) {
  const { colors, light } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <CyberCutBox
        cutSize={5}
        radius={4}
        fill={light ? 'rgba(0, 180, 216, 0.08)' : 'rgba(0, 229, 255, 0.08)'}
        borderColor={light ? 'rgba(0, 180, 216, 0.38)' : 'rgba(0, 229, 255, 0.40)'}
        borderWidth={1}
        style={styles.cutBox}
      >
        <View style={styles.inner}>
          <Text style={[styles.text, { color: light ? colors.electricAccent : '#00E5FF' }]}>
            {label}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={11}
            color={light ? colors.electricAccent : '#00E5FF'}
            style={styles.icon}
          />
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  cutBox: {
    height: 26,
    paddingHorizontal: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  text: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  icon: {
    marginLeft: 1,
    marginTop: 0.5,
  },
});
