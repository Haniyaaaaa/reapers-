import { ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../../theme';
import { OfflineBanner } from '../feedback/OfflineBanner';
import { useOffline } from '../../hooks/useOffline';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footerPad?: boolean;
};

export function Screen({ children, scroll = true, padded = true, footerPad = true }: Props) {
  const insets = useSafeAreaInsets();
  const offline = useOffline();
  const { colors, gradients } = useTheme();
  const pad = {
    paddingHorizontal: padded ? space.lg : 0,
    paddingBottom: footerPad ? 108 : insets.bottom + 16,
  };
  return (
    <LinearGradient colors={gradients.background} style={[styles.fill, { backgroundColor: colors.bg }]}>
      {offline ? <OfflineBanner /> : null}
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad, { paddingTop: insets.top + 12 }]}>{children}</View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
