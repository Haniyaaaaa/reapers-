import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { colors, fonts, space } from '../../theme';
import { captureException } from '../../services/analytics/analytics';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Top-level crash boundary (wraps RootNavigator in App.tsx) — without this, an uncaught
 * render error in any single screen crashed the entire app to React Native's red/white
 * screen with no recovery path. "Try again" just resets the boundary's own state; if the
 * error was in truly global state, the user can still relaunch the app normally. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    captureException(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.h}>Something went wrong</Text>
          <Text style={styles.p}>The app hit an unexpected error. You can try again, or close and reopen the app.</Text>
          <View style={{ height: space.lg }} />
          <PrimaryButton label="Try again" onPress={() => this.setState({ error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  h: { color: colors.text, fontFamily: fonts.display, fontSize: 22, marginBottom: 8, textAlign: 'center' },
  p: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center', lineHeight: 20 },
});
