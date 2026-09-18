import React, { useState } from 'react';
import {
  Dimensions,
  Image,
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
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import {
  CYBER_AVATARS,
  CyberAvatarItem,
  DEFAULT_AVATAR_ID,
  getCyberAvatarById,
} from '../../../data/cyberAvatars';
import { fonts, useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);
const GRID_COLUMNS = 5;
const THUMB_SIZE = Math.floor((CONTENT_MAX_WIDTH - (GRID_COLUMNS - 1) * 10) / GRID_COLUMNS);

interface AvatarBuilderProps {
  initialAvatarId?: string;
  userName?: string;
  stepLabel?: string;
  progressPercent?: string;
  showHeader?: boolean;
  onSaveAvatar?: (avatar: CyberAvatarItem) => void;
  onClose?: () => void;
}

export function AvatarBuilderScreen({
  initialAvatarId = DEFAULT_AVATAR_ID,
  userName = 'Kade Rourke',
  stepLabel = 'STEP 1 OF 5 · AVATAR',
  progressPercent = '100%',
  showHeader = true,
  onSaveAvatar,
  onClose,
}: AvatarBuilderProps) {
  const { colors, isLight } = useTheme();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(initialAvatarId);
  const currentAvatar = getCyberAvatarById(selectedAvatarId);

  // Randomize button picks an arbitrary avatar from the 22 options
  const handleRandomize = () => {
    const remaining = CYBER_AVATARS.filter((a) => a.id !== selectedAvatarId);
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    if (random) setSelectedAvatarId(random.id);
  };

  // Suggest set picks an avatar from the opposite or featured set
  const handleSuggestSet = () => {
    const isFemale = currentAvatar.gender === 'female';
    const oppositeSet = CYBER_AVATARS.filter((a) => (isFemale ? a.gender === 'male' : a.gender === 'female'));
    const pick = oppositeSet[Math.floor(Math.random() * oppositeSet.length)];
    if (pick) setSelectedAvatarId(pick.id);
  };

  const handleSave = () => {
    onSaveAvatar?.(currentAvatar);
    onClose?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      {/* Cyberpunk Artwork Background with ground reflections */}
      <CyberBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.innerContent, { maxWidth: CONTENT_MAX_WIDTH }]}>
            {showHeader && (
              <>
                {/* Step Header: STEP 1 OF 5 · AVATAR and 100% */}
                <View style={styles.stepHeader}>
                  <View style={styles.topActionRow}>
                    <Text style={[styles.stepText, { color: colors.muted }]}>{stepLabel}</Text>
                    <Text style={styles.percentageText}>{progressPercent}</Text>
                  </View>

                  <View style={[styles.progressTrack, { backgroundColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
                    <LinearGradient
                      colors={['#00E5FF', '#D83CFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressFill}
                    />
                  </View>
                </View>

                {/* Header Title */}
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]}>Avatar Builder</Text>
                  <View style={styles.accentLineContainer}>
                    <LinearGradient
                      colors={['#00E5FF', '#D83CFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.accentLine}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Center Hero Avatar Showcase */}
            <View style={styles.heroSection}>
              {/* Outer Golden/Orange Glowing Aura Ring */}
              <View style={styles.auraRingOuter}>
                <LinearGradient
                  colors={['#FF9900', '#FF3366', '#7928CA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.auraRingGradient}
                >
                  <Image source={currentAvatar.source} style={styles.heroImage} />
                </LinearGradient>

                {/* Floating LVL 1 Chamfer Pill */}
                <View style={styles.lvlBadgeWrap}>
                  <CyberCutBox
                    cutSize={6}
                    radius={3}
                    gradient
                    style={styles.lvlCutBox}
                  >
                    <Text style={styles.lvlText}>LVL 1</Text>
                  </CyberCutBox>
                </View>
              </View>

              {/* User Name */}
              <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>

              {/* Traits Subtitle */}
              <Text style={[styles.traitsText, { color: colors.muted }]}>{currentAvatar.traits}</Text>

              {/* Action Buttons: RANDOMIZE & SUGGEST SET */}
              <View style={styles.actionRow}>
                <Pressable onPress={handleRandomize} style={styles.actionPressable}>
                  <CyberCutBox
                    cutSize={8}
                    radius={4}
                    fill={isLight ? colors.cardFill : 'rgba(18, 24, 42, 0.85)'}
                    borderColor={isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.15)'}
                    borderWidth={1}
                    style={styles.actionCutBox}
                  >
                    <View style={styles.actionInner}>
                      <Ionicons name="shuffle" size={13} color={isLight ? colors.muted : '#8E9BB5'} />
                      <Text style={[styles.actionText, { color: colors.text }]}>RANDOMIZE</Text>
                    </View>
                  </CyberCutBox>
                </Pressable>

                <Pressable onPress={handleSuggestSet} style={styles.actionPressable}>
                  <CyberCutBox
                    cutSize={8}
                    radius={4}
                    fill={isLight ? 'rgba(216, 60, 255, 0.1)' : 'rgba(45, 25, 75, 0.85)'}
                    borderColor="#D83CFF"
                    borderWidth={1}
                    style={styles.actionCutBox}
                  >
                    <View style={styles.actionInner}>
                      <Ionicons name="sparkles" size={13} color="#D83CFF" />
                      <Text style={[styles.actionText, styles.suggestText]}>SUGGEST SET</Text>
                    </View>
                  </CyberCutBox>
                </Pressable>
              </View>
            </View>

            {/* CHOOSE MORE Section */}
            <View style={styles.gridSection}>
              <Text style={[styles.sectionHeader, { color: colors.muted2 }]}>CHOOSE MORE</Text>

              {/* 5-Column Avatars Grid */}
              <View style={styles.avatarGrid}>
                {CYBER_AVATARS.map((item) => {
                  const isSelected = item.id === selectedAvatarId;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedAvatarId(item.id)}
                      style={[
                        styles.thumbPressable,
                        { width: THUMB_SIZE, height: THUMB_SIZE },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select avatar ${item.name}`}
                    >
                      <View
                        style={[
                          styles.thumbCircle,
                          { borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.1)' },
                          isSelected && (isLight ? { borderColor: '#6D35FF', shadowColor: '#6D35FF' } : styles.thumbCircleSelected),
                        ]}
                      >
                        <Image source={item.source} style={styles.thumbImage} />
                      </View>

                      {/* Selected White Checkmark Bubble */}
                      {isSelected && (
                        <View style={styles.checkBubble}>
                          <Ionicons name="checkmark-sharp" size={11} color="#6D35FF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Bottom Save Avatar Button */}
            <CyberButton
              label="Save Avatar"
              onPress={handleSave}
              style={styles.saveButton}
            />

            {onClose && (
              <Pressable onPress={onClose} style={styles.cancelBtn} accessibilityRole="button">
                <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
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
    marginBottom: 20,
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
  percentageText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    fontWeight: '700',
    color: '#D83CFF',
  },
  progressTrack: {
    width: '100%',
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  accentLineContainer: {
    marginVertical: 8,
    alignSelf: 'flex-start',
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
  heroSection: {
    alignItems: 'center',
    marginBottom: 26,
    width: '100%',
  },
  auraRingOuter: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 12,
  },
  auraRingGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9900',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  heroImage: {
    width: 134,
    height: 134,
    borderRadius: 67,
  },
  lvlBadgeWrap: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    shadowColor: '#6D35FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  lvlCutBox: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lvlText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  traitsText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8E9BB5',
    textTransform: 'uppercase',
    marginBottom: 14,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionPressable: {
    height: 36,
  },
  actionCutBox: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  suggestText: {
    color: '#D83CFF',
  },
  gridSection: {
    width: '100%',
    marginBottom: 26,
  },
  sectionHeader: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8E9BB5',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  thumbPressable: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  thumbCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  checkBubble: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 4,
  },
  saveButton: {
    marginBottom: 14,
    width: '100%',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: '#8E9BB5',
  },
});
