import { ReactElement, ReactNode, useMemo } from 'react';
import { RefreshControlProps, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../../theme';
import { OfflineBanner } from '../feedback/OfflineBanner';
import { useOffline } from '../../hooks/useOffline';
import { CyberBackground } from '../cyber/CyberBackground';
import { KeyboardAwareScrollView } from '../../components/layout/KeyboardAwareScrollView';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footerPad?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function Screen({ children, scroll = true, padded = true, footerPad = true, refreshControl }: Props) {
  const insets = useSafeAreaInsets();
  const offline = useOffline();
  const { colors } = useTheme();
  const pad = {
    paddingHorizontal: padded ? space.lg : 0,
    paddingBottom: footerPad ? 108 : insets.bottom + 16,
  };
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <CyberBackground />
      {offline ? <OfflineBanner /> : null}
      {scroll ? (
        <KeyboardAwareScrollView
          contentContainerStyle={[pad, { paddingTop: insets.top + 12 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.fill, pad, { paddingTop: insets.top + 12 }]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
