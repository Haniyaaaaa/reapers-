import { memo, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../../../theme';
import { dayPeriod } from '../../../utils/greeting';

/** "SATURDAY · 23:47 / Evening, Admin". Owns its own clock so the 30 s tick re-renders only these
 * two lines — not the whole Home screen. It also catches up when the app returns to the foreground,
 * where timers were paused. */
export const HeaderGreeting = memo(function HeaderGreeting({ name }: { name: string }) {
  const { colors } = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.timestamp, { color: colors.muted }]} numberOfLines={1}>{`${day} · ${time}`}</Text>
      <Text style={[styles.greeting, { color: colors.text }]}>{`${dayPeriod(now)}, ${name}`}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 2, flex: 1 },
  timestamp: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: fonts.bodySemi,
    fontSize: 20,
    fontWeight: '700',
  },
});
