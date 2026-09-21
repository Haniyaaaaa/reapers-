import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

interface CyberTextFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function CyberTextField({
  label,
  required = false,
  error,
  hint,
  containerStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  style,
  ...rest
}: CyberTextFieldProps) {
  const { colors, isLight } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isPassword = !!secureTextEntry;
  const showPassword = isPassword && !hidden;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Label with optional purple/magenta asterisk */}
      {label || required ? (
      <View style={styles.labelRow}>
        <Text
          style={[
            styles.labelText,
            { color: colors.muted },
            focused && (isLight ? { color: colors.primary } : styles.labelFocused),
          ]}
        >
          {label}
        </Text>
        {required && <Text style={styles.asterisk}>*</Text>}
      </View>
      ) : null}

      {/* Cyber Chamfer Input Box */}
      <CyberCutBox
        cutSize={12}
        radius={4}
        fill={isLight ? colors.inputFill : '#121927B2'}
        borderColor={error ? '#FF4D6D' : focused ? (isLight ? colors.primary : '#00E5FF') : (isLight ? colors.inputBorder : 'rgba(255, 255, 255, 0.12)')}
        borderWidth={1}
        style={styles.cutBox}
      >
        <View style={styles.inputContainer}>
          <TextInput
            {...rest}
            secureTextEntry={isPassword && hidden}
            placeholderTextColor={colors.muted2}
            style={[styles.input, { color: colors.text }, style]}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
          />

          {isPassword && (
            <Pressable
              onPress={() => setHidden((prev) => !prev)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.muted}
              />
            </Pressable>
          )}
        </View>
      </CyberCutBox>

      {/* Error or Hint */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  labelText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: '#00E5FF',
  },
  asterisk: {
    color: '#D83CFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 13,
  },
  cutBox: {
    width: '100%',
    height: 48,
  },
  inputContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#FF4D6D',
    marginTop: 5,
    paddingLeft: 4,
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#8E9BB5',
    marginTop: 5,
    paddingLeft: 4,
  },
});
