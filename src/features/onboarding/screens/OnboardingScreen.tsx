import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { AvatarPicker } from '../../../components/avatars/AvatarPicker';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { gameOptions, skillOptions } from '../../../data/mock';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, radius, space, useTheme } from '../../../theme';
import type { Role } from '../../../types/user';

const STEPS = 4;

export function OnboardingScreen() {
  const { completeOnboarding, user } = useAuth();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<Role[]>(user?.roles?.length ? user.roles : []);
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUri);
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? 'reaper');
  const [avatarLook, setAvatarLook] = useState(user?.avatarLook);
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [games, setGames] = useState<string[]>(user?.games ?? []);
  const [userErr, setUserErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (r: Role) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const next = async () => {
    if (step === 1) {
      if (username.trim().length < 3) {
        setUserErr('Username is required (3+ characters)');
        return;
      }
      setUserErr('');
    }
    if (step < STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (roles.length === 0) {
      setStep(0);
      return;
    }
    setSubmitting(true);
    await completeOnboarding({
      username: username.trim(),
      displayName: username.trim(),
      bio,
      avatarUri,
      avatarId: avatarUri ? undefined : avatarId,
      avatarLook: avatarUri ? undefined : avatarLook,
      roles,
      skills: roles.includes('developer') ? skills : [],
      games: roles.includes('gamer') ? games : [],
    });
    setSubmitting(false);
  };

  return (
    <Screen footerPad={false}>
      <Text style={[styles.kicker, { color: colors.cyan }]}>Welcome</Text>
      <View style={styles.progress}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View key={i} style={[styles.seg, { backgroundColor: colors.border }, i <= step && { backgroundColor: colors.magenta }]} />
        ))}
      </View>
      <Text style={[styles.stepLabel, { color: colors.muted2 }]}>
        Step {step + 1} of {STEPS}
      </Text>

      {step === 0 ? (
        <>
          <Text style={[styles.h, { color: colors.text }]}>How do you show up?</Text>
          <Text style={[styles.p, { color: colors.muted }]}>Multi-select. You can be both.</Text>
          {(['gamer', 'developer'] as Role[]).map((r) => {
            const on = roles.includes(r);
            return (
              <Pressable
                key={r}
                onPress={() => toggleRole(r)}
                style={[
                  styles.role,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  on && { borderColor: colors.magenta, backgroundColor: colors.magentaDeep },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.roleTitle, { color: colors.text }]}>{r === 'gamer' ? 'Gamer' : 'Developer'}</Text>
                <Text style={[styles.p, { color: colors.muted }]}>
                  {r === 'gamer' ? 'Play, RSVP, review demos, book experts.' : 'Ship demos, post events, find teammates.'}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text style={[styles.h, { color: colors.text }]}>Your look</Text>
          <Text style={[styles.p, { color: colors.muted }]}>Pick a gamer avatar or upload a photo.</Text>
          <AuthTextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            error={userErr}
            onBlur={() => setUserErr(username.trim().length < 3 ? 'Username is required (3+ characters)' : '')}
          />
          <AvatarPicker
            selectedId={avatarId}
            customUri={avatarUri}
            look={avatarLook}
            onSelectId={(id) => {
              setAvatarId(id);
              setAvatarUri(undefined);
            }}
            onCustomUri={setAvatarUri}
            onLookChange={setAvatarLook}
          />
          <AuthTextField label="Bio (optional)" value={bio} onChangeText={setBio} multiline />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={[styles.h, { color: colors.text }]}>Tags</Text>
          {roles.includes('developer') ? (
            <>
              <Text style={[styles.p, { color: colors.muted }]}>Skills</Text>
              <ChipPicker options={skillOptions} selected={skills} onToggle={(v) => setSkills((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))} />
            </>
          ) : null}
          {roles.includes('gamer') ? (
            <>
              <Text style={[styles.p, { marginTop: 16, color: colors.muted }]}>Favorite games</Text>
              <ChipPicker options={gameOptions} selected={games} onToggle={(v) => setGames((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))} />
            </>
          ) : null}
          {roles.length === 0 ? <InlineErrorText message="Go back and pick at least one role." /> : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text style={[styles.h, { color: colors.text }]}>You’re in</Text>
          <Text style={[styles.p, { color: colors.muted }]}>
            {username} · {roles.join(' + ') || 'no role'}
          </Text>
          <Text style={[styles.p, { color: colors.muted }]}>{bio || 'No bio yet'}</Text>
          {skills.length ? <Text style={[styles.p, { color: colors.muted }]}>Skills: {skills.join(', ')}</Text> : null}
          {games.length ? <Text style={[styles.p, { color: colors.muted }]}>Games: {games.join(', ')}</Text> : null}
        </>
      ) : null}

      <View style={{ height: space.xl }} />
      <PrimaryButton
        label={step === STEPS - 1 ? 'Enter Reapers' : 'Continue'}
        onPress={next}
        loading={submitting}
        disabled={(step === 0 && roles.length === 0) || submitting}
      />
      {step > 0 ? (
        <Pressable onPress={() => setStep((s) => s - 1)} style={styles.back} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.cyan }]}>Back</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.mono, marginTop: 8 },
  progress: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontFamily: fonts.mono, fontSize: 11, marginBottom: 16 },
  h: { fontFamily: fonts.display, fontSize: 24, marginBottom: 8 },
  p: { fontFamily: fonts.body, marginBottom: 12 },
  role: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 18,
    marginBottom: 12,
  },
  roleTitle: { fontFamily: fonts.displayMed, fontSize: 18, marginBottom: 4 },
  link: { fontFamily: fonts.bodyMed },
  back: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
