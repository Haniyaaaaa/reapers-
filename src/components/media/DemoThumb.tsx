import { Image, StyleProp, StyleSheet, View, ViewStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

/** A demo's cover image, or — when the uploader didn't provide one and none could be
 * extracted from the video — a neutral gradient placeholder. Replaces a hardcoded stock
 * photo that used to be shown for every demo without a thumbnail, which read as a fake
 * upload the developer never made. */
export function DemoThumb({
  uri,
  style,
  iconSize = 34,
  accessibilityLabel,
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle & ViewStyle>;
  iconSize?: number;
  accessibilityLabel?: string;
}) {
  if (uri) {
    return <Image source={{ uri }} style={style as StyleProp<ImageStyle>} resizeMode="cover" accessibilityLabel={accessibilityLabel} />;
  }
  return (
    <View style={[style as StyleProp<ViewStyle>, styles.placeholder]} accessibilityLabel={accessibilityLabel}>
      <LinearGradient
        colors={['#1B2440', '#2A1B4D', '#0E1423']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="game-controller-outline" size={iconSize} color="rgba(255, 255, 255, 0.35)" />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
