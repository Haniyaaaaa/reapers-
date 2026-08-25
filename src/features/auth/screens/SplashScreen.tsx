import { Image, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brandLogo } from '../../../data/brand';
import { colors, fonts, gradients } from '../../../theme';

export function SplashScreen() {
  return (
    <LinearGradient colors={gradients.background} style={styles.fill}>
      <Image source={brandLogo} style={styles.logo} accessibilityLabel="Reapers logo" />
      <Text style={styles.title}>REAPERS</Text>
      <Text style={styles.sub}>Gaming community · developer network</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  logo: { width: 96, height: 96, borderRadius: 28 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: 4 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
});
