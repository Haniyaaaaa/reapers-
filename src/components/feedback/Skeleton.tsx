import { StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../../theme';

export function Skeleton({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const { colors } = useTheme();
  return <View style={[styles.box, { width, height, backgroundColor: colors.surfaceElevated }, style]} />;
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, opacity: 0.7 },
});
