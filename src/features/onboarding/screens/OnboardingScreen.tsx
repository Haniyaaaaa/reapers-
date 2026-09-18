import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { CyberChip } from '../../../components/cyber/CyberChip';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberRoleCard } from '../../../components/cyber/CyberRoleCard';
import { CyberTextField } from '../../../components/cyber/CyberTextField';
import { AvatarBuilderScreen } from './AvatarBuilderScreen';
import {
  DEFAULT_AVATAR_ID,
  getCyberAvatarById,
} from '../../../data/cyberAvatars';
import { gameOptions, skillOptions } from '../../../data/mock';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, useTheme } from '../../../theme';
import type { Role } from '../../../types/user';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);

const TAG_SECTIONS = {
  engines: ['UNITY', 'UNREAL ENGINE', 'GODOT', 'BEVY', 'CUSTOM ENGINE'],
  languages: ['C#', 'C++', 'RUST', 'GDSCRIPT', 'LUA', 'PYTHON', 'TYPESCRIPT'],
  disciplines: [
    '3D ARTIST',
    '2D ARTIST',
    'UI/UX',
    'GAME DESIGNER',
    'SOUND DESIGNER',
    'ANIMATOR',
    'TECHNICAL ARTIST',
    'PRODUCER',
  ],
  systems: ['NETCODE', 'GAMEPLAY SYSTEMS', 'SHADERS', 'TOOLS', 'AI', 'PHYSICS'],
  interests: ['ROGUELITES', 'IMMERSIVE SIMS', 'CO-OP DESIGN', 'SIM SYSTEMS', 'HORROR', 'RPG', 'STRATEGY'],
};

const EXPERIENCE_OPTIONS = ['< 1 yr', '1–3 yrs', '3–5 yrs', '5–8 yrs', '8+ yrs'];

export function OnboardingScreen() {
  const { completeOnboarding, user, logout } = useAuth();
  const { colors, isLight } = useTheme();

  // Step state:
  // 0: Role (Step 2 of 5, 40%)
  // 1: About (Step 3 of 5, 60%)
  // 2: Skills (Step 4 of 5, 80%)
  // 3: Avatar Builder (Step 5 of 5, 100%)
  // 4: Review & Complete (100%)
  const [step, setStep] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - Preserving 100% of current system
  const [roles, setRoles] = useState<Role[]>(user?.roles?.length ? user.roles : ['developer']);
  const [fullName, setFullName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUri);
  const [avatarId, setAvatarId] = useState(user?.avatarId || DEFAULT_AVATAR_ID);
  const [avatarLook, setAvatarLook] = useState(user?.avatarLook);
  const [linkedin, setLinkedin] = useState(user?.linkedinUrl ?? '');
  const [portfolio, setPortfolio] = useState(user?.portfolioUrl ?? '');
  const [experience, setExperience] = useState('5–8 yrs');
  const [company, setCompany] = useState('');
  const [expertRole, setExpertRole] = useState('');

  // Selected tags & games
  const [selectedTags, setSelectedTags] = useState<string[]>(user?.skills?.length ? user.skills : ['UNITY', 'C#', 'NETCODE']);
  const [selectedGames, setSelectedGames] = useState<string[]>(user?.games?.length ? user.games : ['Fortnite', 'Valorant']);

  const [showAvatarBuilderModal, setShowAvatarBuilderModal] = useState(false);
  const [userErr, setUserErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [roleErr, setRoleErr] = useState('');

  const selectedCyberAvatar = getCyberAvatarById(avatarId);

  const toggleRole = (r: Role) => {
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
    if (roleErr) setRoleErr('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((cur) =>
      cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]
    );
  };

  const toggleGame = (game: string) => {
    setSelectedGames((cur) =>
      cur.includes(game) ? cur.filter((g) => g !== game) : [...cur, game]
    );
  };

  const next = async () => {
    if (step === 0) {
      if (roles.length === 0) {
        setRoleErr('Please select at least one role');
        return;
      }
      setRoleErr('');
      setStep(1);
      return;
    }

    if (step === 1) {
      const u = username.trim();
      const n = fullName.trim();
      let hasErr = false;
      if (!u || u.length < 3) {
        setUserErr('Username must be at least 3 characters');
        hasErr = true;
      }
      if (!n) {
        setNameErr('Full name is required');
        hasErr = true;
      }
      if (hasErr) return;
      setUserErr('');
      setNameErr('');
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3); // Advances to Avatar Builder
      return;
    }

    if (step === 3) {
      setStep(4); // Advances to Review & Complete
      return;
    }

    // Step 4 is Final Submission
    setSubmitting(true);
    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await completeOnboarding(
        {
          username: username.trim(),
          displayName: fullName.trim() || username.trim(),
          firstName,
          lastName,
          bio: bio.trim(),
          avatarUri,
          avatarId: avatarUri ? undefined : avatarId,
          avatarLook: avatarUri ? undefined : avatarLook,
          roles,
          skills: selectedTags,
          tags: selectedTags,
          games: roles.includes('gamer') ? selectedGames : [],
          linkedinUrl: linkedin.trim(),
          portfolioUrl: portfolio.trim(),
        },
        roles.includes('expert')
          ? {
              role: expertRole.trim() || 'Industry professional',
              company: company.trim(),
              bio: bio.trim(),
              specialties: selectedTags,
              portfolioUrl: portfolio.trim(),
              linkedinUrl: linkedin.trim(),
            }
          : undefined
      );
    } catch (err) {
      console.error('Onboarding completion error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Step configs for header progress matching Figma
  const STEP_METAS = [
    { stepText: 'STEP 2 OF 5 · ROLE', progress: '40%', width: '40%' },
    { stepText: 'STEP 3 OF 5 · ABOUT', progress: '60%', width: '60%' },
    { stepText: 'STEP 4 OF 5 · SKILLS', progress: '80%', width: '80%' },
    { stepText: 'STEP 5 OF 5 · AVATAR', progress: '100%', width: '100%' },
    { stepText: 'YOU’RE ALL SET', progress: '100%', width: '100%' },
  ];

  // Dedicated Avatar Builder screen at Step 3
  if (step === 3) {
    return (
      <AvatarBuilderScreen
        initialAvatarId={avatarId}
        userName={fullName || username || 'Kade Rourke'}
        stepLabel="STEP 5 OF 5 · AVATAR"
        progressPercent="100%"
        onSaveAvatar={(item) => {
          setAvatarId(item.id);
          setAvatarUri(undefined);
          setStep(4);
        }}
        onClose={() => setStep(2)}
      />
    );
  }

  const currentMeta = STEP_METAS[step] || STEP_METAS[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {/* Unified CyberBackground with bottom neon floor reflections */}
      <CyberBackground showArtwork />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
              {/* Top Navigation Row: Step Tracker + Logout Button */}
              <View style={styles.stepHeader}>
                <View style={styles.topActionRow}>
                  <Text style={[styles.stepText, { color: colors.muted }]}>{currentMeta.stepText}</Text>
                  <View style={styles.rightTopRow}>
                    <Text style={styles.percentageText}>{currentMeta.progress}</Text>
                    <Pressable
                      onPress={async () => {
                        setLoggingOut(true);
                        await logout();
                        setLoggingOut(false);
                      }}
                      disabled={loggingOut}
                      hitSlop={8}
                      style={styles.logoutBtn}
                    >
                      <Text style={[styles.logoutText, { color: colors.muted2 }]}>{loggingOut ? '...' : 'Log out'}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                  <LinearGradient
                    colors={['#00E5FF', '#D83CFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: currentMeta.width as any }]}
                  />
                </View>
              </View>

              {/* ================= STEP 2 OF 5: ROLE ================= */}
              {step === 0 && (
                <View style={styles.stepBlock}>
                  <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>How Do You Show Up Here?</Text>
                    <View style={styles.accentLineContainer}>
                      <LinearGradient
                        colors={['#00E5FF', '#D83CFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.accentLine}
                      />
                    </View>
                    <Text style={[styles.subtitle, { color: colors.muted }]}>
                      Your role shapes your feed, your matches and what the community can ask of you.
                    </Text>
                  </View>

                  {/* 3 Role Cards */}
                  <CyberRoleCard
                    title="Gamer"
                    tagline="PLAY, REVIEW, ATTEND"
                    description="Discover indie demos, join communities and show up to events."
                    icon={<Ionicons name="game-controller-outline" size={24} color={isLight && !roles.includes('gamer') ? colors.text : '#FFFFFF'} />}
                    selected={roles.includes('gamer')}
                    onPress={() => toggleRole('gamer')}
                  />

                  <CyberRoleCard
                    title="Game Developer"
                    tagline="BUILD, PUBLISH, RECRUIT"
                    description="Ship demos, find teammates and get feedback from experts."
                    icon={<Ionicons name="code-slash-outline" size={24} color={isLight && !roles.includes('developer') ? colors.text : '#FFFFFF'} />}
                    selected={roles.includes('developer')}
                    onPress={() => toggleRole('developer')}
                  />

                  <CyberRoleCard
                    title="Expert / Industry"
                    tagline="ADVISE, MENTOR, HIRE"
                    description="Offer 15-minute sessions and connect with emerging studios."
                    icon={<Ionicons name="briefcase-outline" size={24} color={isLight && !roles.includes('expert') ? colors.text : '#FFFFFF'} />}
                    selected={roles.includes('expert')}
                    onPress={() => toggleRole('expert')}
                  />

                  {roleErr ? <Text style={styles.errorText}>{roleErr}</Text> : null}
                </View>
              )}

              {/* ================= STEP 3 OF 5: ABOUT ================= */}
              {step === 1 && (
                <View style={styles.stepBlock}>
                  <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Tell Us Who You Are</Text>
                    <View style={styles.accentLineContainer}>
                      <LinearGradient
                        colors={['#00E5FF', '#D83CFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.accentLine}
                      />
                    </View>
                  </View>

                  {/* Avatar Section */}
                  <View style={styles.avatarSection}>
                    <Pressable
                      onPress={() => setShowAvatarBuilderModal(true)}
                      style={styles.avatarBoxPressable}
                      accessibilityRole="button"
                      accessibilityLabel="Open Avatar Builder"
                    >
                      <CyberCutBox
                        cutSize={12}
                        radius={6}
                        fill={isLight ? 'rgba(109, 53, 255, 0.1)' : 'rgba(45, 30, 75, 0.85)'}
                        borderColor="rgba(216, 60, 255, 0.5)"
                        borderWidth={1.5}
                        style={styles.avatarBox}
                      >
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatarPreviewImg} />
                        ) : (
                          <Image source={selectedCyberAvatar.source} style={styles.avatarPreviewImg} />
                        )}
                      </CyberCutBox>
                    </Pressable>

                    <View style={styles.avatarActions}>
                      <Pressable
                        onPress={() => setShowAvatarBuilderModal(true)}
                        style={styles.buildAvatarBtn}
                        accessibilityRole="button"
                      >
                        <CyberCutBox
                          cutSize={8}
                          radius={4}
                          fill={isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)'}
                          borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.18)'}
                          borderWidth={1}
                          style={styles.buildAvatarCutBox}
                        >
                          <View style={styles.buildAvatarInner}>
                            <Ionicons name="sparkles" size={13} color={isLight ? colors.primary : '#00E5FF'} />
                            <Text style={[styles.buildAvatarText, { color: colors.text }]}>
                              Build custom avatar
                            </Text>
                          </View>
                        </CyberCutBox>
                      </Pressable>
                      <Text style={[styles.avatarHelpText, { color: colors.muted }]}>
                        {selectedCyberAvatar.name} · {selectedCyberAvatar.traits}
                      </Text>
                    </View>
                  </View>

                  {/* Fields */}
                  <CyberTextField
                    label="FULL NAME"
                    required
                    value={fullName}
                    onChangeText={(v) => {
                      setFullName(v);
                      if (nameErr) setNameErr('');
                    }}
                    placeholder="Kade Rourke"
                    error={nameErr}
                  />

                  <CyberTextField
                    label="USER NAME"
                    required
                    value={username}
                    onChangeText={(v) => {
                      setUsername(v);
                      if (userErr) setUserErr('');
                    }}
                    autoCapitalize="none"
                    placeholder="kaderourke"
                    error={userErr}
                  />

                  <CyberTextField
                    label="BIO"
                    required
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                    placeholder="Systems-first gameplay engineer shipping tactical roguelites."
                    hint="160 characters. What you work on, plainly."
                    maxLength={160}
                    style={styles.bioInput}
                  />

                  <CyberTextField
                    label="LINKEDIN"
                    required
                    value={linkedin}
                    onChangeText={setLinkedin}
                    autoCapitalize="none"
                    placeholder="linkedin.com/in/kaderourke"
                  />

                  <CyberTextField
                    label="PORTFOLIO"
                    required
                    value={portfolio}
                    onChangeText={setPortfolio}
                    autoCapitalize="none"
                    placeholder="kaderourke.dev"
                  />

                  {/* Experience Selector */}
                  <View style={styles.experienceWrap}>
                    <Text style={[styles.expLabel, { color: colors.muted }]}>EXPERIENCE *</Text>
                    <View style={styles.expChipsRow}>
                      {EXPERIENCE_OPTIONS.map((opt) => {
                        const selected = experience === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => setExperience(opt)}
                            style={styles.expChipPressable}
                          >
                            <CyberCutBox
                              cutSize={6}
                              radius={3}
                              fill={selected ? (isLight ? 'rgba(109, 53, 255, 0.15)' : 'rgba(109, 53, 255, 0.4)') : (isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.8)')}
                              borderColor={selected ? (isLight ? colors.primary : '#00E5FF') : (isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.1)')}
                              borderWidth={1}
                              style={styles.expChipBox}
                            >
                              <Text style={[styles.expChipText, { color: selected ? (isLight ? colors.primary : '#00E5FF') : colors.muted }, selected && styles.expChipTextActive]}>
                                {opt}
                              </Text>
                            </CyberCutBox>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* If Expert: Company & Title */}
                  {roles.includes('expert') && (
                    <>
                      <CyberTextField
                        label="COMPANY"
                        required
                        value={company}
                        onChangeText={setCompany}
                        placeholder="Studio or Company name"
                      />
                      <CyberTextField
                        label="EXPERT ROLE / TITLE"
                        required
                        value={expertRole}
                        onChangeText={setExpertRole}
                        placeholder="e.g. Lead Combat Designer"
                      />
                    </>
                  )}
                </View>
              )}

              {/* ================= STEP 4 OF 5: SKILLS & TAGS ================= */}
              {step === 2 && (
                <View style={styles.stepBlock}>
                  <View style={styles.skillsHeader}>
                    <Text style={[styles.title, { color: colors.text }]}>Skills & Tags</Text>
                    <Text style={styles.selectedCountBadge}>
                      {selectedTags.length} SELECTED
                    </Text>
                  </View>

                  {/* Information Banner */}
                  <CyberCutBox
                    cutSize={10}
                    radius={4}
                    fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.75)'}
                    borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.1)'}
                    borderWidth={1}
                    style={styles.infoBox}
                  >
                    <Text style={[styles.infoText, { color: colors.muted }]}>
                      These tags are structured — the matching engine uses them to surface teammates, team requests and experts. Pick precisely.
                    </Text>
                  </CyberCutBox>

                  {/* Engines */}
                  <Text style={[styles.categoryTitle, { color: colors.muted2 }]}>ENGINES</Text>
                  <View style={styles.chipRow}>
                    {TAG_SECTIONS.engines.map((t) => (
                      <CyberChip
                        key={t}
                        label={t}
                        selected={selectedTags.includes(t)}
                        onPress={() => toggleTag(t)}
                      />
                    ))}
                  </View>

                  {/* Languages */}
                  <Text style={[styles.categoryTitle, { color: colors.muted2 }]}>LANGUAGES</Text>
                  <View style={styles.chipRow}>
                    {TAG_SECTIONS.languages.map((t) => (
                      <CyberChip
                        key={t}
                        label={t}
                        selected={selectedTags.includes(t)}
                        onPress={() => toggleTag(t)}
                      />
                    ))}
                  </View>

                  {/* Disciplines */}
                  <Text style={[styles.categoryTitle, { color: colors.muted2 }]}>DISCIPLINES</Text>
                  <View style={styles.chipRow}>
                    {TAG_SECTIONS.disciplines.map((t) => (
                      <CyberChip
                        key={t}
                        label={t}
                        selected={selectedTags.includes(t)}
                        onPress={() => toggleTag(t)}
                      />
                    ))}
                  </View>

                  {/* Systems */}
                  <Text style={[styles.categoryTitle, { color: colors.muted2 }]}>SYSTEMS</Text>
                  <View style={styles.chipRow}>
                    {TAG_SECTIONS.systems.map((t) => (
                      <CyberChip
                        key={t}
                        label={t}
                        selected={selectedTags.includes(t)}
                        onPress={() => toggleTag(t)}
                      />
                    ))}
                  </View>

                  {/* Interests */}
                  <Text style={[styles.categoryTitle, { color: colors.muted2 }]}>INTERESTS</Text>
                  <View style={styles.chipRow}>
                    {TAG_SECTIONS.interests.map((t) => (
                      <CyberChip
                        key={t}
                        label={t}
                        selected={selectedTags.includes(t)}
                        onPress={() => toggleTag(t)}
                      />
                    ))}
                  </View>

                  {/* Gamer Favorite Games (if Gamer role selected) */}
                  {roles.includes('gamer') && (
                    <>
                      <Text style={[styles.categoryTitle, { color: colors.muted2 }]}>FAVORITE GAMES</Text>
                      <View style={styles.chipRow}>
                        {gameOptions.map((g) => (
                          <CyberChip
                            key={g}
                            label={g}
                            selected={selectedGames.includes(g)}
                            onPress={() => toggleGame(g)}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  {/* Bottom Selected Pills */}
                  {selectedTags.length > 0 && (
                    <View style={[styles.selectedPillRow, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                      {selectedTags.map((t) => (
                        <View key={t} style={styles.miniTag}>
                          <Text style={styles.miniTagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* ================= STEP 5 OF 5: REVIEW / COMPLETE ================= */}
              {step === 4 && (
                <View style={styles.stepBlock}>
                  <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>You’re All Set!</Text>
                    <View style={styles.accentLineContainer}>
                      <LinearGradient
                        colors={['#00E5FF', '#D83CFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.accentLine}
                      />
                    </View>
                    <Text style={[styles.subtitle, { color: colors.muted }]}>
                      Review your profile details before entering the Reapers community.
                    </Text>
                  </View>

                  {/* Review Card */}
                  <CyberCutBox
                    cutSize={14}
                    radius={6}
                    fill={isLight ? colors.cardFill : 'rgba(14, 20, 35, 0.85)'}
                    borderColor={isLight ? colors.cardBorder : 'rgba(109, 53, 255, 0.5)'}
                    borderWidth={1}
                    style={styles.reviewCard}
                  >
                    <View style={styles.reviewInner}>
                      {/* Avatar & Identity Hero */}
                      <View style={styles.reviewHeroRow}>
                        <CyberCutBox
                          cutSize={10}
                          radius={5}
                          fill={isLight ? 'rgba(109, 53, 255, 0.1)' : 'rgba(45, 30, 75, 0.9)'}
                          borderColor="rgba(216, 60, 255, 0.6)"
                          borderWidth={1.5}
                          style={styles.reviewAvatarBox}
                        >
                          {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.reviewAvatarImg} />
                          ) : (
                            <Image source={selectedCyberAvatar.source} style={styles.reviewAvatarImg} />
                          )}
                        </CyberCutBox>
                        <View style={styles.reviewHeroInfo}>
                          <Text style={[styles.reviewName, { color: colors.text }]}>{fullName || username}</Text>
                          <Text style={[styles.reviewRoles, { color: isLight ? colors.primary : '#00E5FF' }]}>
                            @{username} · {roles.map((r) => r.toUpperCase()).join(' + ')}
                          </Text>
                          <Text style={styles.reviewTraits}>{selectedCyberAvatar.traits}</Text>
                        </View>
                      </View>

                      <Text style={[styles.reviewBio, { color: colors.muted }]}>{bio || 'No bio specified'}</Text>

                      {selectedTags.length > 0 && (
                        <View style={[styles.reviewSection, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                          <Text style={[styles.reviewSecLabel, { color: colors.muted2 }]}>SKILLS & TAGS</Text>
                          <Text style={[styles.reviewSecValue, { color: colors.text }]}>{selectedTags.join(', ')}</Text>
                        </View>
                      )}

                      {roles.includes('gamer') && selectedGames.length > 0 && (
                        <View style={[styles.reviewSection, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                          <Text style={[styles.reviewSecLabel, { color: colors.muted2 }]}>FAVORITE GAMES</Text>
                          <Text style={[styles.reviewSecValue, { color: colors.text }]}>{selectedGames.join(', ')}</Text>
                        </View>
                      )}

                      <View style={[styles.reviewSection, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                        <Text style={[styles.reviewSecLabel, { color: colors.muted2 }]}>EXPERIENCE</Text>
                        <Text style={[styles.reviewSecValue, { color: colors.text }]}>{experience}</Text>
                      </View>

                      {linkedin ? (
                        <View style={[styles.reviewSection, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                          <Text style={[styles.reviewSecLabel, { color: colors.muted2 }]}>LINKEDIN</Text>
                          <Text style={[styles.reviewSecValue, { color: colors.text }]}>{linkedin}</Text>
                        </View>
                      ) : null}

                      {portfolio ? (
                        <View style={[styles.reviewSection, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                          <Text style={[styles.reviewSecLabel, { color: colors.muted2 }]}>PORTFOLIO</Text>
                          <Text style={[styles.reviewSecValue, { color: colors.text }]}>{portfolio}</Text>
                        </View>
                      ) : null}

                      {roles.includes('expert') && company ? (
                        <View style={[styles.reviewSection, { borderTopColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                          <Text style={[styles.reviewSecLabel, { color: colors.muted2 }]}>EXPERT APPLICATION</Text>
                          <Text style={[styles.reviewSecValue, { color: colors.text }]}>
                            {expertRole || 'Expert'} at {company}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </CyberCutBox>
                </View>
              )}

              {/* Action Buttons */}
              <CyberButton
                label={step === 4 ? 'ENTER REAPERS' : 'Continue'}
                onPress={next}
                loading={submitting}
                disabled={submitting}
                style={styles.actionBtn}
              />

              {step > 0 && (
                <Pressable
                  onPress={() => setStep((s) => s - 1)}
                  style={styles.backBtn}
                  accessibilityRole="button"
                >
                  <Text style={[styles.backText, { color: colors.muted }]}>Back</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Full-screen Avatar Builder Modal (triggered from Step 1) */}
      <Modal
        visible={showAvatarBuilderModal}
        animationType="slide"
        onRequestClose={() => setShowAvatarBuilderModal(false)}
      >
        <AvatarBuilderScreen
          initialAvatarId={avatarId}
          userName={fullName || username || 'Kade Rourke'}
          stepLabel="AVATAR BUILDER"
          progressPercent="100%"
          onSaveAvatar={(item) => {
            setAvatarId(item.id);
            setAvatarUri(undefined);
            setShowAvatarBuilderModal(false);
          }}
          onClose={() => setShowAvatarBuilderModal(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  innerContent: {
    width: '100%',
    alignItems: 'center',
  },
  stepHeader: {
    width: '100%',
    marginBottom: 24,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  rightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  percentageText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    fontWeight: '700',
    color: '#D83CFF',
  },
  logoutBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  logoutText: {
    fontFamily: fonts.bodyMed,
    fontSize: 11.5,
    color: '#64748B',
  },
  progressTrack: {
    width: '100%',
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepBlock: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  accentLineContainer: {
    marginVertical: 10,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  accentLine: {
    width: 48,
    height: 2.5,
    borderRadius: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#8E9BB5',
    textAlign: 'center',
    marginTop: 2,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#FF4D6D',
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    width: '100%',
  },
  avatarBoxPressable: {
    shadowColor: '#D83CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  avatarBox: {
    width: 64,
    height: 64,
  },
  avatarPreviewImg: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarActions: {
    flex: 1,
  },
  buildAvatarBtn: {
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  buildAvatarCutBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buildAvatarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buildAvatarText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  avatarHelpText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: '#8E9BB5',
  },
  avatarPickerWrapper: {
    marginBottom: 20,
    width: '100%',
  },
  bioInput: {
    minHeight: 64,
    paddingTop: 8,
  },
  experienceWrap: {
    marginBottom: 18,
    width: '100%',
  },
  expLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  expChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expChipPressable: {
    marginBottom: 4,
  },
  expChipBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expChipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: '#8E9BB5',
  },
  expChipTextActive: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  skillsHeader: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  selectedCountBadge: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    letterSpacing: 1.2,
    color: '#D83CFF',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: '#8E9BB5',
  },
  categoryTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 12,
  },
  selectedPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 8,
    marginBottom: 16,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(216, 60, 255, 0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.3)',
  },
  miniTagText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#D83CFF',
  },
  reviewCard: {
    width: '100%',
    padding: 20,
    marginBottom: 24,
  },
  reviewInner: {
    width: '100%',
  },
  reviewHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  reviewAvatarBox: {
    width: 60,
    height: 60,
  },
  reviewAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  reviewHeroInfo: {
    flex: 1,
  },
  reviewName: {
    fontFamily: fonts.bodySemi,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  reviewRoles: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#00E5FF',
    marginBottom: 4,
  },
  reviewTraits: {
    fontFamily: fonts.bodySemi,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#D83CFF',
    textTransform: 'uppercase',
  },
  reviewBio: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#8E9BB5',
    marginBottom: 16,
  },
  reviewSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  reviewSecLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  reviewSecValue: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#E2E8F0',
  },
  actionBtn: {
    marginTop: 10,
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: '#8E9BB5',
  },
});
