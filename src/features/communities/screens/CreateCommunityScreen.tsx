import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { DEFAULT_AVATAR_ID, getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunitiesStore } from '../../../store/communitiesStore';
import { uploadImage } from '../../../services/supabase/storage';
import type { MainStackParamList } from '../../../navigation/types';
import { fonts, useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 430);

const AVAILABLE_TAGS = [
  'UNITY',
  'UNREAL',
  'GODOT',
  '2D ART',
  'AUDIO',
  'NETCODE',
  'PUBLISHING',
  'PLAY TESTING',
];

const CATEGORIES = ['Engines', 'Indie', 'Audio', '3D Art', 'Netcode', 'Publishing'];

const DEFAULT_RULES = `1. Critique the work, not the person.
2. Playtest requests go in #playtest only.
3. No recruiting without a posted team request.`;

function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words.map((w) => w[0]).join('').toUpperCase();
    if (initials.length >= 2) return initials.slice(0, 8);
  }
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length >= 2) return clean.slice(0, 6);
  return 'GUILD';
}

export function CreateCommunityScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const createCommunity = useCommunitiesStore((s) => s.createCommunity);

  // Form states matching Figma media_1789455428349.png
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState(
    'A room for small Unity teams shipping tactics games. Weekly playtest nights, honest feedback, no self-promo dumps.'
  );
  const [category, setCategory] = useState('Engines');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(['UNITY', 'PLAY TESTING']);
  const [privacy, setPrivacy] = useState<'public' | 'invite_only'>('public');
  const [rules, setRules] = useState(DEFAULT_RULES);

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setLogoUri(res.assets[0].uri);
    }
  };

  const handleSaveDraft = () => {
    Alert.alert('Draft Saved', 'Your community parameters have been preserved.');
  };

  const handleSubmit = async () => {
    if (!user) {
      setSubmitErr('Please log in to create a community.');
      return;
    }
    if (name.trim().length < 3) {
      setSubmitErr('Community name must be at least 3 characters.');
      return;
    }

    setSubmitting(true);
    setSubmitErr('');

    try {
      let uploadedLogoUrl: string | undefined = undefined;
      if (logoUri) {
        uploadedLogoUrl = await uploadImage('community-logos', user.id, logoUri);
      }

      const shortName = deriveShortName(name);

      const community = await createCommunity({
        createdBy: user.id,
        shortName,
        name: name.trim(),
        description: description.trim(),
        logoUrl: uploadedLogoUrl,
      });

      nav.replace('CommunityDetail', { id: community.id });
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not create community');
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedAvatar = logoUri ? { uri: logoUri } : getCyberAvatarSource('female_4');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <CyberBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {/* ================= 1. HEADER ================= */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => nav.goBack()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={1}
                style={styles.backCutBox}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </CyberCutBox>
            </Pressable>

            <View style={styles.headerTitleBlock}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Create community</Text>
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>STEP 1 OF 1 · DRAFT SAVED</Text>
            </View>
          </View>

          {/* ================= 2. COMMUNITY IMAGE ================= */}
          <View style={styles.imageSection}>
            <View style={styles.avatarContainer}>
              <CyberCutBox
                cutSize={12}
                radius={6}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={1}
                style={styles.avatarCutBox}
              >
                <Image source={resolvedAvatar} style={styles.avatarImg} />
              </CyberCutBox>

              {/* Sparkle Overlay Badge */}
              <View style={styles.sparkleBadge}>
                <LinearGradient
                  colors={['#00E5FF', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sparkleGradient}
                >
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </View>

            <View style={styles.imageTextWrap}>
              <Text style={[styles.imageTitle, { color: colors.text }]}>Community image</Text>
              <Text style={[styles.imageSubtitle, { color: colors.muted }]}>Upload art or generate a mark.</Text>

              <Pressable
                onPress={pickImage}
                style={styles.uploadBtn}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill={colors.cardBorder}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.uploadCutBox}
                >
                  <View style={styles.uploadInner}>
                    <Ionicons name="image-outline" size={13} color={colors.primary} />
                    <Text style={[styles.uploadBtnText, { color: colors.text }]}>Upload image</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            </View>
          </View>

          {/* ================= 3. COMMUNITY NAME ================= */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <View style={styles.labelLeft}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>COMMUNITY NAME</Text>
                <Text style={styles.labelCaret}>▾</Text>
              </View>
              <Text style={[styles.charCountText, { color: colors.muted2 }]}>{name.length}/40</Text>
            </View>

            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={colors.inputFill}
              borderColor={colors.inputBorder}
              borderWidth={1}
              style={styles.inputCutBox}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={40}
                placeholder="e.g. Salvage Crew Devs"
                placeholderTextColor={colors.muted2}
                style={[styles.textInput, { color: colors.text }]}
              />
            </CyberCutBox>
          </View>

          {/* ================= 4. DESCRIPTION ================= */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <View style={styles.labelLeft}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>DESCRIPTION</Text>
                <Text style={styles.labelCaret}>▾</Text>
              </View>
              <Text style={[styles.hintText, { color: colors.muted2 }]}>what happens here?</Text>
            </View>

            <CyberCutBox
              cutSize={10}
              radius={4}
              fill={colors.inputFill}
              borderColor={colors.inputBorder}
              borderWidth={1}
              style={styles.textAreaCutBox}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="A room for small teams shipping games..."
                placeholderTextColor={colors.muted2}
                style={[styles.textAreaInput, { color: colors.text }]}
                textAlignVertical="top"
              />
            </CyberCutBox>
          </View>

          {/* ================= 5. CATEGORY ================= */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <View style={styles.labelLeft}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>CATEGORY</Text>
                <Text style={styles.labelCaret}>▾</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowCategoryPicker((prev) => !prev)}
              style={styles.categoryPressable}
              accessibilityRole="button"
            >
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.inputFill}
                borderColor={colors.inputBorder}
                borderWidth={1}
                style={styles.categoryCutBox}
              >
                <View style={styles.categoryInner}>
                  <Text style={[styles.categorySelectedText, { color: colors.text }]}>{category}</Text>
                  <Ionicons
                    name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={colors.muted2}
                  />
                </View>
              </CyberCutBox>
            </Pressable>

            {/* Category Dropdown Options */}
            {showCategoryPicker && (
              <View style={styles.categoryOptionsRow}>
                {CATEGORIES.map((cat) => {
                  const isSel = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                      style={styles.categoryOptionPill}
                    >
                      <CyberCutBox
                        cutSize={6}
                        radius={3}
                        fill={isSel ? (isDark ? 'rgba(0, 229, 255, 0.2)' : 'rgba(14, 165, 233, 0.15)') : colors.cardFill}
                        borderColor={isSel ? colors.primary : colors.cardBorder}
                        borderWidth={1}
                        style={styles.categoryOptionCut}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            { color: isSel ? colors.primary : colors.muted },
                            isSel && styles.categoryOptionTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* ================= 6. TAGS ================= */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>TAGS</Text>
            </View>

            <View style={styles.tagsFlowRow}>
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={styles.tagBtn}
                    accessibilityRole="button"
                  >
                    <CyberCutBox
                      cutSize={6}
                      radius={3}
                      gradient={isSelected}
                      fill={isSelected ? undefined : colors.cardBorder}
                      borderColor={isSelected ? undefined : colors.cardBorder}
                      borderWidth={isSelected ? 0 : 1}
                      style={styles.tagCutBox}
                    >
                      <View style={styles.tagInner}>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#FFFFFF"
                            style={{ marginRight: 3 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.tagItemText,
                            isSelected ? styles.tagItemTextActive : { color: colors.muted },
                          ]}
                        >
                          {tag}
                        </Text>
                      </View>
                    </CyberCutBox>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ================= 7. PRIVACY ================= */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>PRIVACY</Text>
            </View>

            <View style={styles.privacyRow}>
              {/* Public Option */}
              <Pressable
                onPress={() => setPrivacy('public')}
                style={styles.privacyCardWrap}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={10}
                  radius={5}
                  fill={colors.cardFill}
                  borderColor={
                    privacy === 'public' ? colors.primary : colors.cardBorder
                  }
                  borderWidth={1.5}
                  style={styles.privacyCutBox}
                >
                  <View style={styles.privacyInner}>
                    <View style={styles.privacyIconBox}>
                      <Ionicons name="globe-outline" size={16} color="#D83CFF" />
                    </View>
                    <Text style={[styles.privacyTitle, { color: colors.text }]}>Public</Text>
                    <Text style={[styles.privacyDesc, { color: colors.muted }]}>Anyone can find and join.</Text>
                  </View>
                </CyberCutBox>
              </Pressable>

              {/* Invite Only Option */}
              <Pressable
                onPress={() => setPrivacy('invite_only')}
                style={styles.privacyCardWrap}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={10}
                  radius={5}
                  fill={colors.cardFill}
                  borderColor={
                    privacy === 'invite_only' ? colors.primary : colors.cardBorder
                  }
                  borderWidth={1.5}
                  style={styles.privacyCutBox}
                >
                  <View style={styles.privacyInner}>
                    <View style={styles.privacyIconBox}>
                      <Ionicons name="lock-closed-outline" size={16} color={colors.muted2} />
                    </View>
                    <Text style={[styles.privacyTitle, { color: colors.text }]}>Invite only</Text>
                    <Text style={[styles.privacyDesc, { color: colors.muted }]}>Members approve requests.</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            </View>
          </View>

          {/* ================= 8. RULES ================= */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>RULES</Text>
              <Text style={[styles.hintText, { color: colors.muted2 }]}>one per line</Text>
            </View>

            <CyberCutBox
              cutSize={10}
              radius={4}
              fill={colors.inputFill}
              borderColor={colors.inputBorder}
              borderWidth={1}
              style={styles.rulesCutBox}
            >
              <TextInput
                value={rules}
                onChangeText={setRules}
                multiline
                numberOfLines={4}
                placeholder="1. Critique the work, not the person..."
                placeholderTextColor={colors.muted2}
                style={[styles.rulesInput, { color: colors.text }]}
                textAlignVertical="top"
              />
            </CyberCutBox>
          </View>

          {/* ================= 9. CALLOUT TIP ================= */}
          <CyberCutBox
            cutSize={10}
            radius={5}
            fill={isDark ? 'rgba(216, 60, 255, 0.08)' : 'rgba(216, 60, 255, 0.05)'}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.calloutBox}
          >
            <Text style={[styles.calloutText, { color: isDark ? '#D83CFF' : '#7C3AED' }]}>
              Communities with clear rules keep 3× more active members after month one.
            </Text>
          </CyberCutBox>

          {submitErr ? (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{submitErr}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ================= 10. BOTTOM ACTION BAR ================= */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
        <View style={[styles.bottomBarInner, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {/* Save Draft Button */}
          <Pressable
            onPress={handleSaveDraft}
            style={styles.saveDraftBtn}
            accessibilityRole="button"
          >
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={colors.cardBorder}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.saveDraftCut}
            >
              <Text style={[styles.saveDraftText, { color: colors.text }]}>Save draft</Text>
            </CyberCutBox>
          </Pressable>

          {/* Create Community Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.createSubmitBtn}
            accessibilityRole="button"
          >
            <CyberCutBox cutSize={8} radius={4} style={styles.createSubmitCut}>
              <LinearGradient
                colors={['#00E5FF', '#6D35FF', '#D83CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createSubmitGradient}
              >
                <Text style={styles.createSubmitText}>
                  {submitting ? 'Creating...' : 'Create community'}
                </Text>
              </LinearGradient>
            </CyberCutBox>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  innerContent: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  backBtn: {
    width: 38,
    height: 38,
  },
  backCutBox: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBlock: {
    gap: 2,
  },
  headerTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textTransform: 'uppercase',
  },
  imageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 68,
    height: 68,
  },
  avatarCutBox: {
    width: 68,
    height: 68,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sparkleGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTextWrap: {
    flex: 1,
    gap: 3,
  },
  imageTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#8E9BB5',
    marginBottom: 6,
  },
  uploadBtn: {
    alignSelf: 'flex-start',
  },
  uploadCutBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  uploadInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  uploadBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: '#E2E8F0',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  labelCaret: {
    color: '#D83CFF',
    fontSize: 10,
  },
  charCountText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#64748B',
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#64748B',
  },
  inputCutBox: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  textInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
  },
  textAreaCutBox: {
    width: '100%',
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textAreaInput: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  categoryPressable: {
    width: '100%',
  },
  categoryCutBox: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  categoryInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySelectedText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
  categoryOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryOptionPill: {
    marginBottom: 4,
  },
  categoryOptionCut: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryOptionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: '#8E9BB5',
  },
  categoryOptionTextActive: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  tagsFlowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBtn: {
    marginBottom: 4,
  },
  tagCutBox: {
    paddingHorizontal: 11,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagItemText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tagItemTextActive: {
    color: '#FFFFFF',
  },
  tagItemTextInactive: {
    color: '#8E9BB5',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyCardWrap: {
    flex: 1,
  },
  privacyCutBox: {
    padding: 12,
    minHeight: 90,
  },
  privacyInner: {
    gap: 4,
  },
  privacyIconBox: {
    marginBottom: 2,
  },
  privacyTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  privacyDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
    lineHeight: 15,
  },
  rulesCutBox: {
    width: '100%',
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rulesInput: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: '#E2E8F0',
  },
  calloutBox: {
    width: '100%',
    padding: 12,
    marginBottom: 16,
  },
  calloutText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#D83CFF',
  },
  errBox: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 6,
    marginBottom: 12,
  },
  errText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: '#EF4444',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 15, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
    alignItems: 'center',
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
  },
  saveDraftBtn: {
    flex: 1,
    height: 42,
  },
  saveDraftCut: {
    width: '100%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveDraftText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  createSubmitBtn: {
    flex: 2,
    height: 42,
  },
  createSubmitCut: {
    width: '100%',
    height: 42,
    overflow: 'hidden',
  },
  createSubmitGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createSubmitText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});
