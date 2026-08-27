import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts, useTheme } from '../../theme';
import { BladeCard } from '../cards/BladeCard';

export function FormSection({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {title || right ? (
        <View style={styles.head}>
          {title ? <Text style={[styles.kicker, { color: colors.muted2 }]}>{title}</Text> : <View />}
          {right}
        </View>
      ) : null}
      <BladeCard style={[styles.card, style]}>{children}</BladeCard>
    </View>
  );
}

export function FormDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { padding: 16 },
  divider: { height: 1, marginBottom: 14 },
});
