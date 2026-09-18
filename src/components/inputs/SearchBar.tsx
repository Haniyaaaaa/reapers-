import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search' }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.bar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
      accessibilityRole="search"
    >
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        style={[styles.input, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16 },
});
