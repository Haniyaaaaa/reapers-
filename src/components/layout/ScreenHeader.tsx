import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, minTouch, useTheme } from '../../theme';

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.icon} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.icon} />
      )}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: minTouch, marginBottom: 12, gap: 8 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 20, textAlign: 'center', letterSpacing: 0.3 },
  right: { minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
});
