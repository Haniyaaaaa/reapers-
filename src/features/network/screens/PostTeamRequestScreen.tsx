import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { useAuth } from '../../../hooks/useAuth';
import { useNetworkStore } from '../../../store/networkStore';
import { fonts, useTheme } from '../../../theme';

const PRESET_ROLES = ['Unity', 'Unreal', 'UI', 'Netcode', 'Animation', 'SFX', 'Shaders', 'Live ops'];

export function PostTeamRequestScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const postTeam = useNetworkStore((s) => s.postTeam);

  const [project, setProject] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const valid = project.trim().length >= 3;

  const toggleRole = (r: string) => {
    if (roles.includes(r)) {
      setRoles(roles.filter((x) => x !== r));
    } else {
      setRoles([...roles, r]);
    }
  };

  const addCustomRole = () => {
    const tag = customTag.trim();
    if (!tag) return;
    if (!roles.includes(tag)) {
      setRoles([...roles, tag]);
    }
    setCustomTag('');
  };

  const submit = async () => {
    if (!valid || !user) {
      setErr('Project name is required');
      return;
    }
    setSubmitting(true);
    setSubmitErr('');
    try {
      await postTeam(user.id, {
        project: project.trim(),
        excerpt: excerpt.trim() || 'Looking for collaborators.',
        roles: roles.length ? roles : ['Gameplay'],
      });
      nav.goBack();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not publish request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Screen Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtnTouch} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.backCutBox}
          >
            <View style={styles.backInner}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </View>
          </CyberCutBox>
        </Pressable>

        <Text style={[styles.headerTitleText, { color: colors.text }]}>Post team request</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Blurb Subtitle */}
        <Text style={[styles.blurbText, { color: colors.muted }]}>
          Tell the community what you are building and which teammates you still need. Your post lands in Network under Team requests.
        </Text>

        {/* Section 1: PROJECT */}
        <View style={styles.fieldSection}>
          <Text style={[styles.sectionHeaderLabel, { color: colors.primary }]}>PROJECT</Text>

          <CyberCutBox
            cutSize={12}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.cardCutBox}
          >
            <View style={styles.cardInner}>
              {/* Project Name Field */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>PROJECT NAME</Text>
                  <Text style={[styles.counterText, { color: colors.muted2 }]}>{project.length}/60</Text>
                </View>

                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={colors.inputFill}
                  borderColor={err ? '#FF3B30' : colors.inputBorder}
                  borderWidth={1}
                  style={styles.inputCutBox}
                >
                  <TextInput
                    value={project}
                    onChangeText={(v) => {
                      setProject(v.slice(0, 60));
                      if (err && v.trim().length >= 3) setErr('');
                    }}
                    placeholder="Neon Drift"
                    placeholderTextColor={colors.muted2}
                    style={[styles.textInput, { color: colors.text }]}
                  />
                </CyberCutBox>
                {err ? <InlineErrorText message={err} /> : null}
              </View>

              {/* Pitch Field */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>PITCH</Text>
                  <Text style={[styles.counterText, { color: colors.muted2 }]}>{excerpt.length}/280</Text>
                </View>

                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={colors.inputFill}
                  borderColor={colors.inputBorder}
                  borderWidth={1}
                  style={styles.textareaCutBox}
                >
                  <TextInput
                    value={excerpt}
                    onChangeText={(v) => setExcerpt(v.slice(0, 280))}
                    placeholder="A co-op racer built in Unity. Prototype is playable, aiming for a demo in 8 weeks."
                    placeholderTextColor={colors.muted2}
                    multiline
                    style={[styles.textareaInput, { color: colors.text }]}
                  />
                </CyberCutBox>

                <Text style={[styles.hintText, { color: colors.muted2 }]}>
                  Mention the engine, the stage you are at, and the time commitment.
                </Text>
              </View>
            </View>
          </CyberCutBox>
        </View>

        {/* Section 2: ROLES YOU NEED */}
        <View style={styles.fieldSection}>
          <CyberCutBox
            cutSize={12}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.cardCutBox}
          >
            <View style={styles.cardInner}>
              <View style={styles.labelRow}>
                <Text style={[styles.sectionHeaderLabel, { color: colors.primary }]}>ROLES YOU NEED</Text>
                <Text style={[styles.rolesStatusText, { color: colors.muted2 }]}>
                  {roles.length ? `${roles.length} selected` : 'Optional'}
                </Text>
              </View>

              {/* Roles Preset Pills */}
              <View style={styles.pillsWrap}>
                {PRESET_ROLES.map((r) => {
                  const active = roles.includes(r);
                  return (
                    <Pressable key={r} onPress={() => toggleRole(r)} accessibilityRole="button">
                      {active ? (
                        <CyberCutBox
                          cutSize={6}
                          radius={4}
                          gradient
                          style={styles.activePillCut}
                        >
                          <View style={styles.activePillInner}>
                            <Text style={styles.activePillText}>{r}</Text>
                          </View>
                        </CyberCutBox>
                      ) : (
                        <CyberCutBox
                          cutSize={6}
                          radius={4}
                          fill={colors.cardBorder}
                          borderColor={colors.cardBorder}
                          borderWidth={1}
                          style={styles.inactivePillCut}
                        >
                          <View style={styles.inactivePillInner}>
                            <Text style={[styles.inactivePillText, { color: colors.muted }]}>{r}</Text>
                          </View>
                        </CyberCutBox>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom Tag Input Row */}
              <View style={styles.customTagRow}>
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={colors.inputFill}
                  borderColor={colors.inputBorder}
                  borderWidth={1}
                  style={styles.customTagCutBox}
                >
                  <TextInput
                    value={customTag}
                    onChangeText={setCustomTag}
                    placeholder="Add your own tag"
                    placeholderTextColor={colors.muted2}
                    style={[styles.customTagInput, { color: colors.text }]}
                  />
                </CyberCutBox>

                <Pressable onPress={addCustomRole} style={styles.addBtnTouch} accessibilityRole="button">
                  <CyberCutBox
                    cutSize={8}
                    radius={4}
                    gradient
                    style={styles.addCutBox}
                  >
                    <View style={styles.addInner}>
                      <Text style={styles.addBtnText}>Add</Text>
                    </View>
                  </CyberCutBox>
                </Pressable>
              </View>

              {roles.length === 0 ? (
                <Text style={[styles.noteText, { color: colors.muted2 }]}>
                  Nothing picked yet, so we will tag your post as Gameplay.
                </Text>
              ) : null}
            </View>
          </CyberCutBox>
        </View>

        {submitErr ? <InlineErrorText message={submitErr} /> : null}

        {/* Action Buttons */}
        <View style={styles.actionsWrap}>
          <Pressable
            onPress={submit}
            disabled={!valid || submitting}
            style={styles.publishTouch}
            accessibilityRole="button"
          >
            <CyberCutBox
              cutSize={12}
              radius={4}
              gradient
              style={styles.publishCutBox}
            >
              <View style={styles.publishInner}>
                <Text style={styles.publishText}>
                  {submitting ? 'Publishing…' : 'Publish request'}
                </Text>
              </View>
            </CyberCutBox>
          </Pressable>

          <Pressable onPress={() => nav.goBack()} style={styles.cancelTouch} accessibilityRole="button">
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardBorder}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.cancelCutBox}
            >
              <View style={styles.cancelInner}>
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtnTouch: {
    width: 38,
    height: 38,
  },
  backCutBox: {
    width: 38,
    height: 38,
  },
  backInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  blurbText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    lineHeight: 19,
    marginBottom: 4,
  },
  fieldSection: {
    gap: 8,
  },
  sectionHeaderLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#8E9BB5',
    letterSpacing: 0.8,
  },
  cardCutBox: {
    width: '100%',
  },
  cardInner: {
    padding: 16,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8E9BB5',
    letterSpacing: 0.6,
  },
  counterText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#60718F',
  },
  inputCutBox: {
    width: '100%',
    height: 44,
  },
  textInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: '100%',
  },
  textareaCutBox: {
    width: '100%',
    height: 100,
  },
  textareaInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: '100%',
    textAlignVertical: 'top',
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#60718F',
    marginTop: 2,
  },
  rolesStatusText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#60718F',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activePillCut: {
    height: 32,
  },
  activePillInner: {
    height: '100%',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  inactivePillCut: {
    height: 32,
  },
  inactivePillInner: {
    height: '100%',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactivePillText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#8E9BB5',
    letterSpacing: 0.5,
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  customTagCutBox: {
    flex: 1,
    height: 40,
  },
  customTagInput: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: '100%',
  },
  addBtnTouch: {
    width: 64,
    height: 40,
  },
  addCutBox: {
    width: 64,
    height: 40,
  },
  addInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#60718F',
    marginTop: 2,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 6,
  },
  publishTouch: {
    width: '100%',
    height: 48,
  },
  publishCutBox: {
    width: '100%',
    height: 48,
  },
  publishInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  cancelTouch: {
    width: '100%',
    height: 44,
  },
  cancelCutBox: {
    width: '100%',
    height: 44,
  },
  cancelInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#8E9BB5',
  },
});
