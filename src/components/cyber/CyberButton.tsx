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
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { CyberCutBox } from './CyberCutBox';

interface CyberButtonProps {
  label: string;
  /** If this returns a promise the button shows a spinner and ignores taps until it settles. */
  onPress: () => unknown;
  loading?: boolean;
  /** Status text shown next to the spinner while busy, e.g. "Saving…". */
  loadingLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  cutSize?: number;
}

export function CyberButton({
  label,
  onPress,
  loading = false,
  loadingLabel = 'Please wait…',
  disabled = false,
  style,
  height = 50,
  cutSize = 14,
}: CyberButtonProps) {
  const { run, pending } = useSingleFlight(onPress);
  const busy = loading || pending;
  return (
    <Pressable
      onPress={run}
      disabled={disabled || busy}
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
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.label}>{loadingLabel}</Text>
            </View>
          ) : (
            <Text style={styles.label}>{label}</Text>
          )}
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
