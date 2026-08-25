import { StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../../theme';
import { PrimaryButton } from '../buttons/PrimaryButton';

export function EmptyState({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 40, gap: 18, alignItems: 'center' },
  title: { fontFamily: fonts.body, textAlign: 'center', fontSize: 15, lineHeight: 22 },
});
