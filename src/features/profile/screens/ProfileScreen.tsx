import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { ConnectButton } from '../../../components/buttons/ConnectButton';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { AvatarPicker } from '../../../components/avatars/AvatarPicker';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { DemoCard } from '../../../components/cards/DemoCard';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { currentUser, people, skillOptions } from '../../../data/mock';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import type { Role } from '../../../types/user';
import { Ionicons } from '@expo/vector-icons';

export function ProfileScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'Profile'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user, completeOnboarding } = useAuth();
  const demos = useCommunityStore((s) => s.demos);
  const peopleCards = useCommunityStore((s) => s.people);
  const connectPerson = useCommunityStore((s) => s.connectPerson);
  const isExpert = useCommunityStore((s) => s.isExpert);
  const isOwn = !params?.id || params.id === user?.id;
  const other = people.find((p) => p.id === params?.id) ?? currentUser;
  const profile = isOwn ? user : other;
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [roles, setRoles] = useState<Role[]>(profile?.roles ?? []);
  const [skills, setSkills] = useState(profile?.skills ?? profile?.tags ?? []);
  const [avatar, setAvatar] = useState(profile?.avatarUri);
  const [avatarId, setAvatarId] = useState(profile?.avatarId ?? 'reaper');
  const [avatarLook, setAvatarLook] = useState(profile?.avatarLook);
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl ?? '');
  const [saveMsg, setSaveMsg] = useState('');

  const portfolio = useMemo(
    () => demos.filter((d) => d.developerId === (isOwn ? user?.id : params?.id) || (isOwn && d.developerName === user?.displayName)),
    [demos, isOwn, user, params?.id],
  );

  const save = async () => {
    await completeOnboarding({
      bio,
      roles,
      skills,
      tags: skills,
      avatarUri: avatar,
      avatarId: avatar ? undefined : avatarId,
      avatarLook: avatar ? undefined : avatarLook,
      portfolioUrl,
      linkedinUrl,
    });
    setEditing(false);
    setDirty(false);
    setSaveMsg('Saved');
  };

  const conn = peopleCards.find((p) => p.id === params?.id)?.connect ?? 'connect';
  const openLink = (url: string) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(href);
  };

  return (
    <Screen>
      <ScreenHeader
        title={isOwn ? 'Your profile' : profile?.displayName ?? 'Profile'}
        onBack={() => nav.goBack()}
        right={
          isOwn ? (
            <Pressable onPress={() => nav.navigate('Settings')} style={styles.icon} accessibilityRole="button" accessibilityLabel="Settings">
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          ) : null
        }
      />
      {dirty ? <Text style={{ color: colors.warning, fontFamily: fonts.bodyMed, marginBottom: 8 }}>Unsaved changes</Text> : null}
      {saveMsg ? <Text style={{ color: colors.online, fontFamily: fonts.bodyMed, marginBottom: 8 }}>{saveMsg}</Text> : null}
      <View style={styles.header}>
        <AvatarRing name={profile?.displayName ?? 'R'} size={88} uri={avatar} avatarId={avatarId} look={avatarLook} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{profile?.displayName}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>@{profile?.username}</Text>
          <View style={styles.badges}>
            {(profile?.roles ?? []).map((r) => (
              <View key={r} style={[styles.badge, { backgroundColor: colors.tealMuted }]}>
                <Text style={{ color: colors.cyan, fontFamily: fonts.mono, fontSize: 11 }}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Text style={[styles.stat, { color: colors.text }]}>Credibility {profile?.credibility ?? 0}</Text>

      {editing && isOwn ? (
        <>
          <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed, marginBottom: 10 }}>Gamer avatar</Text>
          <AvatarPicker
            selectedId={avatarId}
            customUri={avatar}
            look={avatarLook}
            onSelectId={(id) => {
              setAvatarId(id);
              setAvatar(undefined);
              setDirty(true);
            }}
            onCustomUri={(uri) => {
              setAvatar(uri);
              setDirty(true);
            }}
            onLookChange={(next) => {
              setAvatarLook(next);
              setDirty(true);
            }}
          />
          <AuthTextField
            label="Bio"
            value={bio}
            onChangeText={(v) => {
              setBio(v);
              setDirty(true);
            }}
            multiline
          />
          <AuthTextField
            label="Portfolio URL"
            value={portfolioUrl}
            onChangeText={(v) => {
              setPortfolioUrl(v);
              setDirty(true);
            }}
            autoCapitalize="none"
            placeholder="https://your.site"
          />
          <AuthTextField
            label="LinkedIn URL"
            value={linkedinUrl}
            onChangeText={(v) => {
              setLinkedinUrl(v);
              setDirty(true);
            }}
            autoCapitalize="none"
            placeholder="https://linkedin.com/in/you"
          />
          <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed, marginBottom: 8 }}>Roles</Text>
          <ChipPicker
            options={['gamer', 'developer']}
            selected={roles}
            onToggle={(v) => {
              setRoles((s) => (s.includes(v as Role) ? s.filter((x) => x !== v) : [...s, v as Role]));
              setDirty(true);
            }}
          />
          <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed, marginVertical: 8 }}>Tags</Text>
          <ChipPicker
            options={skillOptions}
            selected={skills}
            searchable
            allowCustom
            onToggle={(v) => {
              setSkills((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
              setDirty(true);
            }}
          />
          <PrimaryButton label="Save profile" onPress={save} style={{ marginTop: 16 }} />
        </>
      ) : (
        <>
          <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, marginBottom: 12 }}>{profile?.bio}</Text>
          {skills.length ? (
            <View style={styles.badges}>
              {skills.map((t) => (
                <View key={t} style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bodyMed, fontSize: 12 }}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {profile?.portfolioUrl ? (
            <Pressable onPress={() => openLink(profile.portfolioUrl!)} style={styles.linkRow} accessibilityRole="link">
              <Ionicons name="globe-outline" size={18} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Portfolio</Text>
            </Pressable>
          ) : null}
          {profile?.linkedinUrl ? (
            <Pressable onPress={() => openLink(profile.linkedinUrl!)} style={styles.linkRow} accessibilityRole="link">
              <Ionicons name="logo-linkedin" size={18} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>LinkedIn</Text>
            </Pressable>
          ) : null}
        </>
      )}
      {isOwn && !editing ? <PrimaryButton label="Edit profile" onPress={() => setEditing(true)} style={{ marginTop: 12 }} /> : null}
      {!isOwn ? (
        <View style={styles.actions}>
          <ConnectButton state={conn} onPress={() => params.id && connectPerson(params.id)} />
          <Pressable
            onPress={() => nav.navigate('ChatDetail', { id: params.id === 'u4' ? 'dm-mira' : params.id === 'u2' ? 'dm-alex' : 'r1' })}
            style={[styles.msg, { borderColor: colors.border }]}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>Message</Text>
          </Pressable>
        </View>
      ) : null}
      {isOwn && !isExpert ? (
        <Pressable onPress={() => nav.navigate('BecomeExpert')} style={styles.linkRow} accessibilityRole="button">
          <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Become an Expert</Text>
        </Pressable>
      ) : null}
      {(profile?.roles ?? []).includes('developer') ? (
        <>
          <Text style={[styles.h2, { color: colors.text }]}>Portfolio demos</Text>
          <View style={{ gap: 12 }}>
            {portfolio.map((d) => (
              <DemoCard key={d.id} demo={d} onPress={() => nav.navigate('DemoDetail', { id: d.id })} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 8 },
  name: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  stat: { fontFamily: fonts.monoBold, marginVertical: 14, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  msg: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  linkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  h2: { fontFamily: fonts.display, fontSize: 20, marginTop: 20, marginBottom: 10 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
