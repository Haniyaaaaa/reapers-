import { StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../../theme';

export function OfflineBanner() {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.navy }]}>
      <Text style={[styles.text, { color: colors.warning }]}>You’re offline. Actions will retry when you reconnect.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 10, paddingHorizontal: 20 },
  text: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
});
