import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

export function CoverImageHeader({ uri, height = 200 }: { uri: string; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height }}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} accessibilityLabel="Cover image" />
      <LinearGradient colors={['transparent', colors.bg]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
