import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';
import { InlineErrorText } from '../feedback/InlineErrorText';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextField({ label, error, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { borderColor: colors.border, backgroundColor: colors.surface },
          focused && { borderColor: colors.cyan },
          !!error && { borderColor: colors.danger },
        ]}
      >
        <TextInput
          placeholderTextColor={colors.muted2}
          style={[styles.input, { color: colors.text }]}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error ? <InlineErrorText message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 12 },
  label: { fontFamily: fonts.bodyMed, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
  field: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 10 },
});
