import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts, radius, useTheme } from '../../theme';
import { InlineErrorText } from '../feedback/InlineErrorText';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
};

export function AuthTextField({ label, error, hint, showCount, onBlur, style, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const { colors } = useTheme();
  const multiline = !!rest.multiline;
  const count = typeof rest.value === 'string' ? rest.value.length : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: focused ? colors.cyan : colors.muted }]}>{label}</Text>
        {showCount && rest.maxLength ? (
          <Text style={[styles.count, { color: count >= rest.maxLength ? colors.warning : colors.muted2 }]}>
            {count}/{rest.maxLength}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
          focused && { borderColor: colors.cyan },
          !!error && { borderColor: colors.danger },
        ]}
      >
        <TextInput
          placeholderTextColor={colors.muted2}
          {...rest}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, multiline && styles.inputMultiline, { color: colors.text }, style]}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            style={styles.eyeBtn}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <InlineErrorText message={error} /> : null}
      {!error && hint ? <Text style={[styles.hint, { color: colors.muted2 }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.bodyMed, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  count: { fontFamily: fonts.mono, fontSize: 11 },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldMultiline: { minHeight: 104, alignItems: 'flex-start', paddingVertical: 4 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 10 },
  eyeBtn: { paddingLeft: 8, minHeight: 44, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
  inputMultiline: { minHeight: 92, lineHeight: 22 },
  hint: { fontFamily: fonts.body, fontSize: 12 },
});
