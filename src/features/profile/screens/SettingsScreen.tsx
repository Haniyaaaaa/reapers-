import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { BladeCard } from '../../../components/cards/BladeCard';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { brandLogo } from '../../../data/brand';
import { streakOptions } from '../../../data/streaks';
import { useAuth } from '../../../hooks/useAuth';
import { useUiStore } from '../../../store/uiStore';
import { fonts, radius, useTheme } from '../../../theme';

function Row({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} thumbColor={colors.cyan} trackColor={{ true: colors.magenta, false: colors.border }} />
    </View>
  );
}

export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const offline = useUiStore((s) => s.offline);
  const setOffline = useUiStore((s) => s.setOffline);
  const prefs = useUiStore((s) => s.prefs);
  const setPref = useUiStore((s) => s.setPref);
  const blocked = useUiStore((s) => s.blocked);
  const unblock = useUiStore((s) => s.unblock);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const streakEmoji = useUiStore((s) => s.streakEmoji);
  const setStreakEmoji = useUiStore((s) => s.setStreakEmoji);
  const [out, setOut] = useState(false);

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Settings" onBack={() => nav.goBack()} />

      <Pressable onPress={() => nav.navigate('Profile', {})} accessibilityRole="button">
        <BladeCard style={styles.profile}>
          <Image source={brandLogo} style={styles.logo} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.displayName ?? 'Player'}</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body }}>@{user?.username ?? 'reaper'}</Text>
          </View>
          <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Edit</Text>
        </BladeCard>
      </Pressable>

      <Text style={[styles.h, { color: colors.text }]}>Appearance</Text>
      <BladeCard style={styles.card}>
        <Row label="Light mode" hint="Cool white surfaces, teal accents" value={theme === 'light'} onValueChange={(v) => setTheme(v ? 'light' : 'dark')} />
      </BladeCard>

      <Text style={[styles.h, { color: colors.text }]}>Chat streak</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>Cyborg is the default. Tap an icon — it shows on DMs.</Text>
      <BladeCard style={styles.card}>
        <View style={styles.streakRow}>
          {streakOptions.map((o) => {
            const on = streakEmoji === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => setStreakEmoji(o.id)}
                style={[
                  styles.streakChip,
                  { borderColor: on ? colors.magenta : colors.border, backgroundColor: on ? colors.magentaDeep : colors.surfaceElevated },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={{ fontSize: 26 }}>{o.emoji}</Text>
                <Text style={{ color: colors.text, fontFamily: fonts.bodyMed, fontSize: 11 }}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BladeCard>

      <Text style={[styles.h, { color: colors.text }]}>Notifications</Text>
      <BladeCard style={styles.card}>
        <Row label="Chat" hint="DMs and rooms" value={prefs.chat} onValueChange={(v) => setPref('chat', v)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row label="Events" hint="RSVPs and reminders" value={prefs.events} onValueChange={(v) => setPref('events', v)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row label="Demos" hint="Comments on your slices" value={prefs.demos} onValueChange={(v) => setPref('demos', v)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row label="Bookings" hint="Expert office hours" value={prefs.bookings} onValueChange={(v) => setPref('bookings', v)} />
      </BladeCard>

      <Text style={[styles.h, { color: colors.text }]}>Privacy</Text>
      <BladeCard style={styles.card}>
        <Row label="Discoverable in Network" hint="People can find you by skill" value={prefs.discoverable} onValueChange={(v) => setPref('discoverable', v)} />
      </BladeCard>

      <Text style={[styles.h, { color: colors.text }]}>Blocked</Text>
      <BladeCard style={styles.card}>
        {blocked.length === 0 ? <Text style={[styles.muted, { color: colors.muted, paddingVertical: 8 }]}>No blocked users.</Text> : null}
        {blocked.map((b) => (
          <View key={b} style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>{b}</Text>
            <Pressable onPress={() => unblock(b)} accessibilityRole="button" style={styles.unblock}>
              <Text style={[styles.link, { color: colors.cyan }]}>Unblock</Text>
            </Pressable>
          </View>
        ))}
      </BladeCard>

      <Text style={[styles.h, { color: colors.text }]}>Debug</Text>
      <BladeCard style={styles.card}>
        <Row label="Simulate offline" hint="Retry banners and queued sends" value={offline} onValueChange={setOffline} />
      </BladeCard>

      <Pressable onPress={() => setOut(true)} style={[styles.logout, { backgroundColor: colors.surface, borderColor: colors.danger }]} accessibilityRole="button">
        <Text style={[styles.logoutText, { color: colors.danger }]}>Log out</Text>
      </Pressable>
      <ConfirmSheet
        visible={out}
        title="Log out?"
        body="You’ll need to sign in again on this device."
        confirmLabel="Log out"
        onClose={() => setOut(false)}
        onConfirm={async () => {
          setOut(false);
          await logout();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.display, fontSize: 18, marginTop: 22, marginBottom: 10 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 8 },
  logo: { width: 52, height: 52, borderRadius: 16 },
  profileName: { fontFamily: fonts.display, fontSize: 20 },
  card: { paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15 },
  hint: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  muted: { fontFamily: fonts.body, marginBottom: 10, lineHeight: 20 },
  divider: { height: 1 },
  unblock: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: fonts.bodyMed },
  logout: { minHeight: 52, justifyContent: 'center', marginTop: 28, marginBottom: 20, borderRadius: radius.md, borderWidth: 1 },
  logoutText: { fontFamily: fonts.bodySemi, textAlign: 'center' },
  streakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 },
  streakChip: {
    width: '23%',
    minHeight: 76,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
});
