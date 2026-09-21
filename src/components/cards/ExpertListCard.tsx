import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { openExternalUrl } from '../../utils/openUrl';
import { EXPERT_GOLD, ExpertTick } from '../experts/ExpertBadge';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { resolveAvatarSource } from '../../data/cyberAvatars';
import { fonts, useTheme } from '../../theme';
import type { Expert } from '../../types/expert';
import { CutAvatar } from '../avatars/CutAvatar';

/** The real expert-directory list card, extracted so ExpertDirectoryScreen's curated sections
 * and the full ExpertsListScreen render identical, real cards instead of two copies of the
 * same markup drifting apart. Every stat here is sourced from the expert's own real data —
 * no hardcoded rating/session-count/experience/next-slot literals. */
export function ExpertListCard({ expert, sessionCount, onPress }: { expert: Expert; sessionCount?: number; onPress: () => void }) {
  const { colors, gradients, isLight } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.touch} accessibilityRole="button">
      <CyberCutBox cutSize={12} radius={8} fill="rgba(14, 20, 35, 0.85)" style={styles.cut}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <CutAvatar source={resolveAvatarSource(expert.avatar, expert.avatarId)} size={44} cut={11} borderWidth={expert.verified ? 2 : 1} borderColor={expert.verified ? EXPERT_GOLD : isLight ? colors.electricAccent : '#00F0FF'} />
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{expert.name}</Text>
                {expert.verified ? <ExpertTick size={15} /> : null}
              </View>
              <Text style={[styles.role, { color: colors.muted }]}>{expert.role}</Text>
            </View>
            <View style={styles.ratingWrap}>
              <Ionicons name="star" size={13} color="#FFB800" />
              <Text style={[styles.ratingNum, { color: colors.text }]}>{expert.rating > 0 ? expert.rating.toFixed(1) : '—'}</Text>
            </View>
          </View>

          {expert.specialties.length > 0 ? (
            <View style={styles.tagsRow}>
              {expert.specialties.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tagPill,
                    isLight && { backgroundColor: 'rgba(109, 53, 255, 0.1)' },
                  ]}
                >
                  <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noSpecialties, { color: colors.muted2 }]}>No specialties listed</Text>
          )}

          <View style={[styles.detailGrid, isLight && { backgroundColor: 'rgba(15, 23, 42, 0.04)' }]}>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: colors.muted2 }]}>EXPERIENCE</Text>
              <Text style={[styles.gridValue, { color: colors.text }]}>{expert.yearsExperience ? `${expert.yearsExperience} yrs` : 'Not listed'}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.gridLabel, { color: colors.muted2 }]}>SESSIONS</Text>
              <Text style={styles.gridSlotValue}>{sessionCount ?? expert.reviewCount ?? 0}</Text>
            </View>
          </View>

          {expert.linkedinUrl || expert.portfolioUrl ? (
            <View style={styles.cardFooterRow}>
              <View style={styles.linksWrap}>
                {expert.linkedinUrl ? (
                  <Pressable onPress={() => openExternalUrl(expert.linkedinUrl)} style={styles.linkItem} accessibilityRole="button">
                    <Ionicons name="logo-linkedin" size={12} color={colors.muted} />
                    <Text style={[styles.linkItemText, { color: colors.muted }]}>LinkedIn</Text>
                  </Pressable>
                ) : null}
                {expert.portfolioUrl ? (
                  <Pressable onPress={() => openExternalUrl(expert.portfolioUrl)} style={styles.linkItem} accessibilityRole="button">
                    <Ionicons name="globe-outline" size={12} color={colors.muted} />
                    <Text style={[styles.linkItemText, { color: colors.muted }]} numberOfLines={1}>
                      {expert.portfolioUrl.replace(/^https?:\/\//, '')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable onPress={onPress} style={styles.bookTouch} accessibilityRole="button">
                <CyberCutBox
                  cutSize={6}
                  radius={4}
                  fill="transparent"
                  borderColor={isLight ? colors.electricAccent : 'rgba(0, 240, 255, 0.6)'}
                  borderWidth={1}
                  style={styles.bookCutBox}
                >
                  <LinearGradient colors={gradients.cyber} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookGradient}>
                    <Text style={styles.bookText}>Book</Text>
                  </LinearGradient>
                </CyberCutBox>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={onPress} style={[styles.bookTouch, { alignSelf: 'flex-end' }]} accessibilityRole="button">
              <CyberCutBox
                cutSize={6}
                radius={4}
                fill="transparent"
                borderColor={isLight ? colors.electricAccent : 'rgba(0, 240, 255, 0.6)'}
                borderWidth={1}
                style={styles.bookCutBox}
              >
                <LinearGradient colors={gradients.cyber} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookGradient}>
                  <Text style={styles.bookText}>Book</Text>
                </LinearGradient>
              </CyberCutBox>
            </Pressable>
          )}
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { marginBottom: 14 },
  cut: { width: '100%' },
  inner: { padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: '#00F0FF', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  headerInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  role: { fontFamily: fonts.body, fontSize: 11.5, color: '#8E9BB5' },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingNum: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: { backgroundColor: 'rgba(109, 53, 255, 0.18)', borderWidth: 1, borderColor: 'rgba(109, 53, 255, 0.35)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontFamily: fonts.mono, fontSize: 9, fontWeight: '700', color: '#D83CFF', letterSpacing: 0.5 },
  noSpecialties: { fontFamily: fonts.body, fontSize: 11, color: '#60718F', fontStyle: 'italic' },
  detailGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(9, 15, 28, 0.6)', borderRadius: 6 },
  gridCol: { gap: 2 },
  gridLabel: { fontFamily: fonts.mono, fontSize: 9, fontWeight: '700', color: '#60718F', letterSpacing: 0.6 },
  gridValue: { fontFamily: fonts.body, fontSize: 12, color: '#A6B4CE' },
  gridSlotValue: { fontFamily: fonts.mono, fontSize: 12, fontWeight: '700', color: '#D83CFF' },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  linksWrap: { gap: 6 },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 20 },
  linkItemText: { fontFamily: fonts.body, fontSize: 11, color: '#8E9BB5', maxWidth: 160 },
  bookTouch: { height: 32 },
  bookCutBox: { height: 32 },
  bookGradient: { height: '100%', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  bookText: { fontFamily: fonts.mono, fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
});
