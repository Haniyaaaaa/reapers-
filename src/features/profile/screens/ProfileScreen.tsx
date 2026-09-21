import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { goBackOrHome } from '../../../navigation/goBackOrHome';
import type { MainStackParamList } from '../../../navigation/types';
import { ConnectButton } from '../../../components/buttons/ConnectButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { AvatarPicker } from '../../../components/avatars/AvatarPicker';
import { DemoCard } from '../../../components/cards/DemoCard';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { skillOptions } from '../../../data/mock';
import { resolveAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthStore } from '../../../store/authStore';
import { useNetworkStore } from '../../../store/networkStore';
import { useChatStore } from '../../../store/chatStore';
import { useExpertStore } from '../../../store/expertStore';
import { useDemoStore } from '../../../store/demoStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { useCommunitiesStore } from '../../../store/communitiesStore';
import { getProfile, profileRowToUser } from '../../../services/supabase/profiles';
import { fonts, useTheme } from '../../../theme';
import type { Role, User } from '../../../types/user';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';
import { VerifiedSeal } from '../../../components/experts/ExpertBadge';
import { STALE_MS } from '../../../store/swr';

const INTEREST_OPTIONS = ['ROGUELITES', 'IMMERSIVE SIMS', 'CO-OP DESIGN', 'SIM SYSTEMS', 'HORROR', 'RPG', 'STRATEGY'];

export function ProfileScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'Profile'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, completeOnboarding, refreshUser } = useAuth();
  const logout = useAuthStore((s) => s.logout);

  const demos = useDemoStore((s) => s.demos);
  const fetchDemosByDeveloper = useDemoStore((s) => s.fetchDemosByDeveloper);
  const peopleCards = useNetworkStore((s) => s.people);
  const fetchPeople = useNetworkStore((s) => s.fetchPeople);
  const connectPerson = useNetworkStore((s) => s.connectPerson);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);
  const communities = useCommunitiesStore((s) => s.communities);
  const fetchCommunities = useCommunitiesStore((s) => s.fetchCommunities);

  const [messaging, setMessaging] = useState(false);
  const blocked = useSettingsStore((s) => s.blocked);
  const fetchBlocked = useSettingsStore((s) => s.fetchBlocked);
  const blockUser = useSettingsStore((s) => s.blockUser);
  const unblockUser = useSettingsStore((s) => s.unblockUser);
  const fetchMySubscription = useSubscriptionStore((s) => s.fetchMySubscription);
  const myApplication = useExpertStore((s) => s.myApplication);
  const fetchMyApplication = useExpertStore((s) => s.fetchMyApplication);

  const isOwn = !params?.id || params.id === user?.id;
  const [other, setOther] = useState<User | null>(null);
  const [otherLoading, setOtherLoading] = useState(!isOwn);

  useEffect(() => {
    if (isOwn || !params?.id) return;
    let cancelled = false;
    setOtherLoading(true);
    getProfile(params.id)
      .then((row) => {
        if (!cancelled) setOther(profileRowToUser(row, ''));
      })
      .catch(() => {
        if (!cancelled) setOther(null);
      })
      .finally(() => {
        if (!cancelled) setOtherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwn, params?.id]);

  const profile = isOwn ? user : other;
  const isExpert = isOwn ? !!user?.isExpert : !!other?.isExpert;

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [nameErr, setNameErr] = useState('');
  const [userErr, setUserErr] = useState('');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [roles, setRoles] = useState<Role[]>(profile?.roles ?? []);
  const [skills, setSkills] = useState(profile?.skills ?? profile?.tags ?? []);
  const [avatar, setAvatar] = useState(profile?.avatarUri);
  const [avatarId, setAvatarId] = useState(profile?.avatarId ?? 'male_1');
  const [avatarLook, setAvatarLook] = useState(profile?.avatarLook);
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [yearsExperience, setYearsExperience] = useState(
    profile?.yearsExperience != null ? String(profile.yearsExperience) : '',
  );
  const [interests, setInterests] = useState(profile?.interests ?? []);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [saving, setSaving] = useState(false);

  // The "Saved" confirmation is transient — it shouldn't sit on the page forever.
  useEffect(() => {
    if (!saveMsg) return;
    const t = setTimeout(() => setSaveMsg(''), 2500);
    return () => clearTimeout(t);
  }, [saveMsg]);

  const portfolioOwnerId = isOwn ? user?.id : params?.id;

  useEffect(() => {
    if (portfolioOwnerId) fetchDemosByDeveloper(portfolioOwnerId);
  }, [portfolioOwnerId, fetchDemosByDeveloper]);

  // Effects key on the stable user id: `refreshUser` used to hand back a fresh-but-equal `user`
  // object, which re-fired every one of these (and the focus effect that calls it) in a loop.
  const userId = user?.id;

  useEffect(() => {
    if (isOwn && userId) fetchMySubscription(userId);
  }, [isOwn, userId, fetchMySubscription]);

  useEffect(() => {
    if (isOwn && userId) fetchCommunities(userId, { ifStaleMs: STALE_MS });
  }, [isOwn, userId, fetchCommunities]);

  useEffect(() => {
    if (isOwn && userId) fetchMyApplication(userId);
  }, [isOwn, userId, fetchMyApplication]);

  useFocusEffect(
    useCallback(() => {
      if (isOwn && userId) {
        refreshUser({ ifStaleMs: 60_000 });
        fetchMyApplication(userId);
      }
    }, [isOwn, userId, refreshUser, fetchMyApplication]),
  );

  useEffect(() => {
    if (!isOwn && userId) {
      fetchPeople(userId, { ifStaleMs: 10_000 });
      fetchBlocked(userId);
    }
  }, [isOwn, userId, fetchPeople, fetchBlocked]);

  // Re-fetch on every focus, not just first mount — the other person's connection response
  // (accepting/declining a request you sent) happens on their own device and this screen has
  // no realtime subscription to learn about it, so without this the Connect button can keep
  // showing a stale "Pending" indefinitely if you navigate back to an already-mounted instance
  // of this screen instead of getting a fresh mount.
  useFocusEffect(
    useCallback(() => {
      if (!isOwn && userId) fetchPeople(userId, { ifStaleMs: 10_000 });
    }, [isOwn, userId, fetchPeople]),
  );

  const portfolio = useMemo(
    () => demos.filter((d) => d.developerId === portfolioOwnerId),
    [demos, portfolioOwnerId],
  );

  const refreshControl = useRefreshControl(async () => {
    if (isOwn) {
      if (!user) return;
      await Promise.all([refreshUser(), fetchDemosByDeveloper(user.id), fetchCommunities(user.id)]);
    } else if (params?.id) {
      const row = await getProfile(params.id);
      setOther(profileRowToUser(row, ''));
      await fetchDemosByDeveloper(params.id);
    }
  });

  const nameOk = displayName.trim().length >= 2;
  const userOk = username.trim().length >= 3;

  const save = async () => {
    if (saving) return;
    if (!nameOk) {
      setNameErr('Name needs 2+ characters');
      return;
    }
    if (!userOk) {
      setUserErr('Username needs 3+ characters');
      return;
    }
    const parsedYears = yearsExperience.trim() ? Number(yearsExperience.trim()) : undefined;
    setSaving(true);
    setSaveErr('');
    setSaveMsg('');
    try {
      await completeOnboarding({
        displayName: displayName.trim(),
        username: username.trim(),
        bio,
        roles,
        skills,
        tags: skills,
        avatarUri: avatar ?? '',
        avatarId: avatar ? undefined : avatarId,
        avatarLook: avatar ? undefined : avatarLook,
        portfolioUrl,
        linkedinUrl,
        location: location.trim(),
        yearsExperience: Number.isFinite(parsedYears) ? parsedYears : undefined,
        interests,
      });
      setEditing(false);
      setDirty(false);
      setSaveMsg('Saved ✓');
    } catch (e) {
      // Stay in edit mode with everything the user typed intact, and say what went wrong.
      setSaveErr(e instanceof Error && e.message ? e.message : 'Could not save your profile — try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.displayName ?? 'this developer'}'s profile on Reapers!`,
      });
    } catch {}
  };

  const shownName = profile?.displayName || 'Kade Rourke';
  const conn = peopleCards.find((p) => p.id === params?.id)?.connect ?? 'connect';
  const openLink = (url: string) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(href);
  };

  if (!isOwn && otherLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CyberBackground showArtwork={false} />
        <View style={[styles.innerContent, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (!isOwn && !other) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CyberBackground showArtwork={false} />
        <View style={[styles.innerContent, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>This profile could not be found.</Text>
          <Pressable onPress={() => goBackOrHome(nav)} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => goBackOrHome(nav)} style={styles.headerBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.headerCutBox}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{isOwn ? 'Profile' : 'Profile'}</Text>

        {isOwn ? (
          <Pressable onPress={() => nav.navigate('Settings')} style={styles.headerBtn} accessibilityRole="button">
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.headerCutBox}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </CyberCutBox>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        {saving ? <Text style={styles.savingText}>Saving your changes…</Text> : null}
        {!saving && dirty ? <Text style={styles.unsavedText}>Unsaved changes</Text> : null}
        {saveMsg ? <Text style={styles.saveMsgText}>{saveMsg}</Text> : null}
        {saveErr ? <Text style={styles.saveErrText}>{saveErr}</Text> : null}

        {/* 1. USER IDENTITY HEADER */}
        <View style={styles.identitySection}>
          <View style={styles.avatarWrap}>
            <CutAvatar
              source={resolveAvatarSource(profile?.avatarUri, profile?.avatarId || 'male_1')}
              size={90}
              cut={22}
              fill="#161B2E"
              borderColor={isExpert ? '#F5C542' : 'rgba(216, 60, 255, 0.6)'}
              borderWidth={isExpert ? 3 : 2}
            />
          </View>

          <Text style={[styles.displayNameText, { color: colors.text }, isExpert && { marginBottom: 8 }]}>{shownName}</Text>
          {isExpert ? (
            <View style={styles.expertBadgeWrap} accessibilityLabel="Verified expert">
              <CyberCutBox
                gradient
                gradientColors={['#FFE27A', '#F5B301', '#B8860B']}
                cutSize={7}
                radius={4}
                style={styles.expertBadgeCut}
              >
                <View style={styles.expertBadgeInner}>
                  <VerifiedSeal size={17} tone="ink" />
                  <Text style={styles.expertBadgeText}>VERIFIED EXPERT</Text>
                </View>
              </CyberCutBox>
            </View>
          ) : null}

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            {isOwn ? (
              <Pressable onPress={() => {
                  if (saving) return;
                  if (!editing) setEditing(true);
                  else if (dirty) save();
                  else setEditing(false);
                }} disabled={saving} style={[styles.editBtnTouch, saving && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ busy: saving }}>
                <CyberCutBox gradient cutSize={8} radius={4} style={styles.actionBtnCut}>
                  <View style={styles.actionBtnInner}>
                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.actionBtnText}>{editing ? 'Done' : 'Edit profile'}</Text>}
                  </View>
                </CyberCutBox>
              </Pressable>
            ) : null}

            <Pressable onPress={handleShare} style={styles.shareBtnTouch} accessibilityRole="button">
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={0.88}
                style={styles.actionBtnCut}
              >
                <View style={styles.actionBtnInner}>
                  <Text style={[styles.shareBtnText, { color: colors.text }]}>Share</Text>
                </View>
              </CyberCutBox>
            </Pressable>
          </View>
        </View>

        {/* 2. STATS 4-TILE ROW */}
        <View style={styles.statsGridRow}>
          <CyberCutBox
            cutSize={8}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.statTileCut}
          >
            <View style={styles.statTileInner}>
              <Text style={[styles.statNumText, { color: colors.text }]}>{portfolio.length}</Text>
              <Text style={[styles.statLabelText, { color: colors.muted }]}>PROJECTS</Text>
            </View>
          </CyberCutBox>

          <CyberCutBox
            cutSize={8}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.statTileCut}
          >
            <View style={styles.statTileInner}>
              <Text style={[styles.statNumText, { color: colors.text }]}>{isOwn ? communities.filter((c) => c.joined).length : 0}</Text>
              <Text style={[styles.statLabelText, { color: colors.muted }]}>COMMUNITIES</Text>
            </View>
          </CyberCutBox>

          <CyberCutBox
            cutSize={8}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.statTileCut}
          >
            <View style={styles.statTileInner}>
              <Text style={[styles.statNumText, { color: colors.text }]}>{(profile?.credibility ?? 0).toLocaleString()}</Text>
              <Text style={[styles.statLabelText, { color: colors.muted }]}>REPUTATION</Text>
            </View>
          </CyberCutBox>
        </View>

        {/* 3. ABOUT / BIO GLASS CARD */}
        {!editing ? (
          <CyberCutBox
            cutSize={14}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.aboutCardBox}
          >
            <View style={styles.aboutCardInner}>
              <Text style={[styles.bioText, { color: colors.text }]}>
                {profile?.bio ||
                  (isOwn ? 'Tap Edit profile to add a short bio.' : 'No bio yet.')}
              </Text>

              {/* Skill Tags */}
              <View style={styles.skillBadgesRow}>
                {(skills.length > 0 ? skills : ['UNITY', 'C#', 'NETCODE', 'GAMEPLAY SYSTEMS', 'SHADERS', 'LEVEL DESIGN']).map((t) => (
                  <View key={t} style={[styles.skillPill, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.skillPillText, { color: colors.muted }]}>{t.toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              {/* Location & Experience Meta Rows */}
              <View style={styles.metaInfoGroup}>
                {profile?.location ? (
                  <View style={styles.metaInfoRow}>
                    <Ionicons name="location-outline" size={15} color={colors.electricAccent} />
                    <Text style={[styles.metaInfoText, { color: colors.muted }]}>{profile.location}</Text>
                  </View>
                ) : null}

                {profile?.yearsExperience != null ? (
                  <View style={styles.metaInfoRow}>
                    <Ionicons name="briefcase-outline" size={15} color="#D83CFF" />
                    <Text style={[styles.metaInfoText, { color: colors.muted }]}>
                      {profile.yearsExperience} {profile.yearsExperience === 1 ? 'yr' : 'yrs'} experience
                    </Text>
                  </View>
                ) : null}

                {profile?.portfolioUrl ? (
                  <Pressable onPress={() => openLink(profile.portfolioUrl!)} style={styles.metaInfoRow}>
                    <Ionicons name="globe-outline" size={15} color={colors.primary} />
                    <Text style={[styles.metaInfoText, { color: colors.primary }]}>Portfolio</Text>
                  </Pressable>
                ) : null}

                {profile?.linkedinUrl ? (
                  <Pressable onPress={() => openLink(profile.linkedinUrl!)} style={styles.metaInfoRow}>
                    <Ionicons name="logo-linkedin" size={15} color={colors.primary} />
                    <Text style={[styles.metaInfoText, { color: colors.primary }]}>LinkedIn</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </CyberCutBox>
        ) : (
          /* EDIT PROFILE FORM */
          <View style={styles.editFormWrap}>
            <AuthTextField
              label="Display name"
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                setNameErr('');
                setDirty(true);
              }}
              error={nameErr}
              maxLength={30}
              showCount
              placeholder="Hira Fatima"
            />
            <AuthTextField
              label="Username"
              value={username}
              onChangeText={(v) => {
                setUsername(v.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase());
                setUserErr('');
                setDirty(true);
              }}
              error={userErr}
              maxLength={20}
              showCount
              autoCapitalize="none"
              placeholder="hirafatima"
            />
            <Text style={[styles.editSectionTitle, { color: colors.muted }]}>Gamer Avatar</Text>
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
            <AuthTextField label="Bio" value={bio} onChangeText={(v) => { setBio(v); setDirty(true); }} multiline />
            <AuthTextField label="Portfolio URL" value={portfolioUrl} onChangeText={(v) => { setPortfolioUrl(v); setDirty(true); }} autoCapitalize="none" />
            <AuthTextField label="LinkedIn URL" value={linkedinUrl} onChangeText={(v) => { setLinkedinUrl(v); setDirty(true); }} autoCapitalize="none" />
            <AuthTextField
              label="Location"
              value={location}
              onChangeText={(v) => { setLocation(v); setDirty(true); }}
              placeholder="Lahore, PK · UTC+5"
            />
            <AuthTextField
              label="Years of experience"
              value={yearsExperience}
              onChangeText={(v) => { setYearsExperience(v.replace(/[^0-9]/g, '')); setDirty(true); }}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="6"
            />
            <Text style={[styles.editSectionTitle, { color: colors.muted }]}>Roles</Text>
            <ChipPicker
              options={['gamer', 'developer']}
              selected={roles}
              onToggle={(v) => {
                setRoles((s) => (s.includes(v as Role) ? s.filter((x) => x !== v) : [...s, v as Role]));
                setDirty(true);
              }}
            />
            <Text style={[styles.editSectionTitle, { color: colors.muted }]}>Tags</Text>
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
            <Text style={[styles.editSectionTitle, { color: colors.muted }]}>Interests</Text>
            <ChipPicker
              options={INTEREST_OPTIONS}
              selected={interests}
              allowCustom
              onToggle={(v) => {
                setInterests((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
                setDirty(true);
              }}
            />

            <Pressable onPress={save} disabled={!nameOk || !userOk || saving} style={{ marginTop: 14, opacity: !nameOk || !userOk || saving ? 0.7 : 1 }} accessibilityRole="button" accessibilityState={{ busy: saving }}>
              <CyberCutBox gradient cutSize={8} radius={4} style={{ width: '100%', height: 46 }}>
                <View style={[styles.actionBtnInner, saving && { flexDirection: 'row', gap: 8 }]}>
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                  <Text style={styles.actionBtnText}>{saving ? 'Saving…' : 'Save profile'}</Text>
                </View>
              </CyberCutBox>
            </Pressable>
          </View>
        )}

        {/* 4. INTERESTS SECTION */}
        {!editing && profile?.interests && profile.interests.length > 0 ? (
          <View style={styles.interestsSection}>
            <View style={styles.sectionHeaderWrap}>
              <Text style={[styles.sectionTitleText, { color: colors.text }]}>Interests</Text>
              <LinearGradient
                colors={['#00E5FF', '#D83CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentLine}
              />
            </View>

            <View style={styles.interestsRow}>
              {profile.interests.map((interest) => (
                <View key={interest} style={styles.interestPill}>
                  <Text style={styles.interestPillText}>{interest.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Other User Actions (Connect / Message / Block) */}
        {!isOwn && (
          <View style={styles.otherActionsRow}>
            <ConnectButton state={conn} onPress={() => params.id && user && connectPerson(user.id, params.id)} />
            {conn === 'connected' && (
              <Pressable
                onPress={async () => {
                  if (!user || !params.id || messaging) return;
                  setMessaging(true);
                  try {
                    const roomId = await startDirectMessage(user.id, params.id, profile?.displayName ?? 'them');
                    nav.navigate('ChatDetail', { id: roomId });
                  } finally {
                    setMessaging(false);
                  }
                }}
                style={styles.msgBtnTouch}
                accessibilityRole="button"
              >
                <CyberCutBox gradient cutSize={8} radius={4} style={{ width: 150, height: 42 }}>
                  <View style={styles.actionBtnInner}>
                    <Text style={styles.actionBtnText}>{messaging ? 'Opening...' : 'Start Messaging'}</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            )}
          </View>
        )}

        {/* Quick Links for Own Profile */}
        {isOwn && (
          <View style={styles.quickLinksGroup}>
            <Pressable onPress={() => nav.navigate('MyPosts')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="chatbubbles-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>My Posts</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('Tabs', { screen: 'CommunitiesTab' })} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="people-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>My Communities</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('MyTeamRequests')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="people-circle-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>My Team Requests</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('MyEvents')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="megaphone-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>My Events</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('MyDemos')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="game-controller-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>My Demos</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('MyBookings')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>My Bookings</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('MyEventApplications')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="receipt-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Payment Applications</Text>
            </Pressable>

            <Pressable onPress={() => nav.navigate('BecomeExpert')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
              <Ionicons name="ribbon-outline" size={17} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {isExpert
                  ? 'Expert Profile'
                  : myApplication?.rejection_reason
                  ? 'Expert Application (not approved)'
                  : myApplication
                  ? 'Expert Application (pending review)'
                  : 'Become an Expert'}
              </Text>
            </Pressable>

            {isExpert && (
              <Pressable onPress={() => nav.navigate('ExpertAvailability')} style={[styles.linkRow, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]}>
                <Ionicons name="time-outline" size={17} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary }]}>Manage Availability</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Portfolio Demos */}
        {(profile?.roles ?? []).includes('developer') && portfolio.length > 0 ? (
          <View style={styles.portfolioSection}>
            <Text style={[styles.portfolioTitleText, { color: colors.text }]}>Portfolio Demos</Text>
            <View style={{ gap: 12 }}>
              {portfolio.map((d) => (
                <DemoCard key={d.id} demo={d} onPress={() => nav.navigate('DemoDetail', { id: d.id })} />
              ))}
            </View>
          </View>
        ) : null}

        {/* 5. SIGN OUT BUTTON */}
        {isOwn && (
          <Pressable
            onPress={() => logout()}
            style={styles.signOutBtnTouch}
            accessibilityRole="button"
          >
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill="rgba(40, 15, 25, 0.6)"
              borderColor="rgba(255, 77, 109, 0.6)"
              borderWidth={1}
              style={styles.signOutCutBox}
            >
              <View style={styles.signOutInner}>
                <Ionicons name="log-out-outline" size={18} color="#FF4D6D" style={{ marginRight: 8 }} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  innerContent: {
    width: '100%',
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
  },
  headerCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  notFoundText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: '#E2E8F0',
  },
  unsavedText: {
    color: '#F5C542',
    fontFamily: fonts.bodySemi,
    marginBottom: 8,
  },
  savingText: {
    color: '#00E5FF',
    fontFamily: fonts.bodySemi,
    marginBottom: 8,
  },
  saveErrText: {
    color: '#FF4D6D',
    fontFamily: fonts.bodySemi,
    marginBottom: 8,
  },
  saveMsgText: {
    color: '#3DDC84',
    fontFamily: fonts.bodySemi,
    marginBottom: 8,
  },
  identitySection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    position: 'relative',
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  avatarCutBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  expertBadgeWrap: {
    marginBottom: 16,
    shadowColor: '#F5B301',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  expertBadgeCut: {
    height: 28,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  expertBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expertBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#3A2600',
  },
  displayNameText: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editBtnTouch: {
    height: 38,
    width: 120,
  },
  shareBtnTouch: {
    height: 38,
    width: 90,
  },
  actionBtnCut: {
    width: '100%',
    height: 38,
  },
  actionBtnInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
  statsGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statTileCut: {
    flex: 1,
    height: 60,
  },
  statTileInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  statNumText: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabelText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.6,
    color: '#8E9BB5',
  },
  aboutCardBox: {
    width: '100%',
    marginBottom: 20,
  },
  aboutCardInner: {
    padding: 16,
    gap: 14,
  },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#CBD5E1',
  },
  skillBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skillPillText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: '#8E9BB5',
  },
  metaInfoGroup: {
    gap: 8,
    paddingTop: 4,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaInfoText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#8E9BB5',
  },
  editFormWrap: {
    marginBottom: 20,
    gap: 10,
  },
  editSectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    marginTop: 6,
  },
  interestsSection: {
    marginBottom: 24,
  },
  sectionHeaderWrap: {
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 10,
  },
  sectionTitleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accentLine: {
    width: 30,
    height: 2,
    borderRadius: 1,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestPill: {
    backgroundColor: 'rgba(216, 60, 255, 0.18)',
    borderColor: 'rgba(216, 60, 255, 0.45)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  interestPillText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#D83CFF',
  },
  otherActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  msgBtnTouch: {
    height: 42,
  },
  quickLinksGroup: {
    gap: 8,
    marginBottom: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(14, 20, 35, 0.75)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  linkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: '#00E5FF',
  },
  portfolioSection: {
    marginBottom: 24,
  },
  portfolioTitleText: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  signOutBtnTouch: {
    width: '100%',
    height: 48,
    marginTop: 8,
    marginBottom: 20,
  },
  signOutCutBox: {
    width: '100%',
    height: '100%',
  },
  signOutInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FF4D6D',
    letterSpacing: 0.5,
  },
});
