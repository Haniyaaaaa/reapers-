import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  Pressable,
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
import type { TeamCompensation, TeamStage, TeamWorkMode } from '../../../services/supabase/types';
import { COMPENSATION_OPTIONS, ENGINE_OPTIONS, ROLE_OPTIONS, STAGE_OPTIONS, WORK_MODE_OPTIONS, titleCase, toDateKey } from '../../../utils/teamRequest';
import { getTeamRequest } from '../../../services/supabase/network';
import { ListPickerSheet, type ListPickerOption } from '../../../components/inputs/ListPickerSheet';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const PRESET_ROLES = ROLE_OPTIONS;

/** Single-select pill row: tap a pill to pick it, tap it again to clear. */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.pillsWrap}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable key={o.value} onPress={() => onChange(active ? null : o.value)} accessibilityRole="button" accessibilityState={{ selected: active }}>
              {active ? (
                <CyberCutBox cutSize={6} radius={4} gradient style={styles.activePillCut}>
                  <View style={styles.activePillInner}>
                    <Text style={styles.activePillText}>{o.label}</Text>
                  </View>
                </CyberCutBox>
              ) : (
                <CyberCutBox cutSize={6} radius={4} fill={colors.cardBorder} borderColor={colors.cardBorder} borderWidth={1} style={styles.inactivePillCut}>
                  <View style={styles.inactivePillInner}>
                    <Text style={[styles.inactivePillText, { color: colors.muted }]}>{o.label}</Text>
                  </View>
                </CyberCutBox>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PostTeamRequestScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const postTeam = useNetworkStore((s) => s.postTeam);
  const updateTeam = useNetworkStore((s) => s.updateTeam);
  const { params } = useRoute<RouteProp<MainStackParamList, 'PostTeamRequest'>>();
  const editId = params?.editId;
  const isEditing = !!editId;
  const existing = useNetworkStore((s) => (editId ? s.myTeams.find((t) => t.id === editId) ?? s.teams.find((t) => t.id === editId) : undefined));

  const [project, setProject] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [studio, setStudio] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [stage, setStage] = useState<TeamStage | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState<TeamWorkMode | null>(null);
  const [neededBy, setNeededBy] = useState<string | null>(null); // YYYY-MM-DD
  const [neededByOpen, setNeededByOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [compensation, setCompensation] = useState<TeamCompensation | null>(null);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const valid = project.trim().length >= 3;

  // Editing: load the existing request into the form once (from the lists already in memory, or
  // fetched if the screen was opened cold).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!editId || loadedFor === editId) return;
    const fill = (t: NonNullable<typeof existing>) => {
      setProject(t.project);
      setExcerpt(t.excerpt);
      setRoles(t.roles);
      setStudio(t.studio ?? '');
      setTeamSize(t.teamSize ? String(t.teamSize) : '');
      setStage(t.stage ?? null);
      setEngine(t.engine ?? null);
      setLocation(t.location ?? '');
      setWorkMode(t.workMode ?? null);
      setNeededBy(t.neededBy ?? null);
      setHours(t.hoursPerWeek ? String(t.hoursPerWeek) : '');
      setCompensation(t.compensation ?? null);
      setLoadedFor(editId);
    };
    if (existing) fill(existing);
    else getTeamRequest(editId).then((t) => t && fill(t)).catch(() => undefined);
  }, [editId, existing, loadedFor]);

  const toggleRole = (r: string) => {
    if (roles.includes(r)) {
      setRoles(roles.filter((x) => x !== r));
    } else {
      setRoles([...roles, r]);
    }
  };

  const addCustomRole = () => {
    const tag = titleCase(customTag);
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
    const size = teamSize ? Number(teamSize) : undefined;
    const weekly = hours ? Number(hours) : undefined;
    if (size !== undefined && (size < 1 || size > 500)) {
      setSubmitErr('Team size must be between 1 and 500.');
      return;
    }
    if (weekly !== undefined && (weekly < 1 || weekly > 168)) {
      setSubmitErr('Hours per week must be between 1 and 168.');
      return;
    }
    setSubmitting(true);
    setSubmitErr('');
    try {
      const payload = {
        project: project.trim(),
        excerpt: excerpt.trim(),
        roles,
        studio: studio.trim() || undefined,
        teamSize: size,
        stage: stage ?? undefined,
        engine: engine ?? undefined,
        location: location.trim() || undefined,
        workMode: workMode ?? undefined,
        neededBy: neededBy ?? undefined,
        hoursPerWeek: weekly,
        compensation: compensation ?? undefined,
      };
      if (editId) await updateTeam(editId, payload);
      else await postTeam(user.id, payload);
      nav.goBack();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not publish request');
    } finally {
      setSubmitting(false);
    }
  };

  const neededByOptions: ListPickerOption[] = Array.from({ length: 180 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const key = toDateKey(d);
    return { key, label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), hint: key };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />
      <ListPickerSheet
        visible={neededByOpen}
        title="Role needed by"
        options={neededByOptions}
        selectedKey={neededBy ?? undefined}
        onSelect={setNeededBy}
        onClose={() => setNeededByOpen(false)}
      />

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

        <Text style={[styles.headerTitleText, { color: colors.text }]}>{isEditing ? 'Edit team request' : 'Post team request'}</Text>
      </View>

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
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
                  What you are building and what you still need help with.
                </Text>
              </View>
            </View>
          </CyberCutBox>
        </View>

        {/* Section 1b: TEAM DETAILS — every field optional; the card only shows what is filled in */}
        <View style={styles.fieldSection}>
          <Text style={[styles.sectionHeaderLabel, { color: colors.primary }]}>TEAM DETAILS</Text>

          <CyberCutBox
            cutSize={12}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.cardCutBox}
          >
            <View style={styles.cardInner}>
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>STUDIO / TEAM NAME</Text>
                  <Text style={[styles.counterText, { color: colors.muted2 }]}>{studio.length}/60</Text>
                </View>
                <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.inputCutBox}>
                  <TextInput
                    value={studio}
                    onChangeText={(v) => setStudio(v.slice(0, 60))}
                    placeholder="Karachi Pixel Studio"
                    placeholderTextColor={colors.muted2}
                    style={[styles.textInput, { color: colors.text }]}
                  />
                </CyberCutBox>
              </View>

              <View style={styles.twoCols}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>TEAM SIZE</Text>
                  <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.inputCutBox}>
                    <TextInput
                      value={teamSize}
                      onChangeText={(v) => setTeamSize(v.replace(/\D/g, '').slice(0, 3))}
                      placeholder="4"
                      placeholderTextColor={colors.muted2}
                      keyboardType="number-pad"
                      style={[styles.textInput, { color: colors.text }]}
                    />
                  </CyberCutBox>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>HOURS / WEEK</Text>
                  <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.inputCutBox}>
                    <TextInput
                      value={hours}
                      onChangeText={(v) => setHours(v.replace(/\D/g, '').slice(0, 3))}
                      placeholder="10"
                      placeholderTextColor={colors.muted2}
                      keyboardType="number-pad"
                      style={[styles.textInput, { color: colors.text }]}
                    />
                  </CyberCutBox>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>CITY</Text>
                  <Text style={[styles.counterText, { color: colors.muted2 }]}>{location.length}/60</Text>
                </View>
                <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.inputCutBox}>
                  <TextInput
                    value={location}
                    onChangeText={(v) => setLocation(v.slice(0, 60))}
                    placeholder="e.g. Karachi"
                    placeholderTextColor={colors.muted2}
                    style={[styles.textInput, { color: colors.text }]}
                  />
                </CyberCutBox>
              </View>

              <ChipGroup label="WORK MODE" options={WORK_MODE_OPTIONS} value={workMode} onChange={setWorkMode} />

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>ROLE NEEDED BY</Text>
                <Pressable onPress={() => setNeededByOpen(true)} accessibilityRole="button">
                  <CyberCutBox cutSize={8} radius={4} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.inputCutBox}>
                    <View style={styles.neededByInner}>
                      <Text style={[styles.textInput, { color: neededBy ? colors.text : colors.muted2, paddingVertical: 0 }]}>{neededBy ?? 'Pick a date (optional)'}</Text>
                      {neededBy ? (
                        <Pressable onPress={() => setNeededBy(null)} hitSlop={8} accessibilityLabel="Clear date">
                          <Ionicons name="close-circle" size={18} color={colors.muted} />
                        </Pressable>
                      ) : (
                        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                      )}
                    </View>
                  </CyberCutBox>
                </Pressable>
              </View>

              <ChipGroup label="STAGE" options={STAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={stage} onChange={setStage} />
              <ChipGroup label="ENGINE" options={ENGINE_OPTIONS.map((e) => ({ value: e, label: e }))} value={engine} onChange={setEngine} />
              <ChipGroup label="COMPENSATION" options={COMPENSATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={compensation} onChange={setCompensation} />
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
                  Add the roles you still need so matching developers can find you.
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
                  {submitting ? (isEditing ? 'Saving…' : 'Publishing…') : isEditing ? 'Save changes' : 'Publish request'}
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
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  neededByInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
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
  twoCols: {
    flexDirection: 'row',
    gap: 12,
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
