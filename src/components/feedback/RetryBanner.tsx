import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../../theme';

export function RetryBanner({ message = 'Could not load. Retry.', onRetry }: { message?: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.magentaDeep }]}>
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" style={styles.btn}>
        <Text style={[styles.btnText, { color: colors.cyan }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  text: { fontFamily: fonts.body, flex: 1 },
  btn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  btnText: { fontFamily: fonts.bodySemi },
});
