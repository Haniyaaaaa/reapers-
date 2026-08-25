import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radius, shadows, useTheme } from '../../theme';

export function BladeCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.blade,
    borderTopRightRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
