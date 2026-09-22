import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { resolveAvatarSource } from '../../data/cyberAvatars';
import { fonts, useTheme } from '../../theme';
import type { PersonCard } from '../../types/extra';
import { CutAvatar } from '../avatars/CutAvatar';

/** Full-width network directory row — real card, no fabricated stats: name/role/skills all
 * come straight off the person's own profile, and the connect button reflects their actual
 * connection status (same 3-state convention as CyberDeveloperCard). */
export function PersonListCard({
  person,
  matchScore,
  onPress,
  onConnect,
}: {
  person: PersonCard;
  matchScore: number;
  onPress: () => void;
  onConnect: () => void;
}) {
  const { colors, isLight } = useTheme();
  const status = person.connect;
  const matchTone = matchScore >= 80 ? '#3DDC84' : matchScore >= 60 ? colors.cyan : isLight ? colors.primary : '#C084FC';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.touch, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <CyberCutBox cutSize={12} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={0.88} style={styles.cut}>
        <View style={styles.inner}>
          <View style={[styles.avatarRing, { borderColor: `${matchTone}55` }]}>
            <CutAvatar source={resolveAvatarSource(person.avatarUri, person.avatarId)} size={48} cut={12} borderWidth={1} fill={isLight ? colors.surfaceElevated : '#161B2E'} />
          </View>

          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{person.displayName}</Text>
            <Text style={[styles.role, { color: colors.muted }]} numberOfLines={1}>{person.roles.join(' · ') || 'Member'}</Text>
            {person.skills.length > 0 ? (
              <View style={styles.tagsRow}>
                {person.skills.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.tagPill, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}12` }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.rightCol}>
            <View style={[styles.matchPill, { borderColor: `${matchTone}66`, backgroundColor: `${matchTone}1A` }]}>
              <Text style={[styles.matchText, { color: matchTone }]}>{matchScore}%</Text>
              <Text style={[styles.matchCaption, { color: matchTone }]}>MATCH</Text>
            </View>
            <Pressable onPress={onConnect} disabled={status !== 'connect'} accessibilityRole="button">
              {status === 'connect' ? (
                <CyberCutBox gradient cutSize={6} radius={3} style={styles.connectCut}>
                  <Text style={styles.connectTextActive}>Connect</Text>
                </CyberCutBox>
              ) : (
                <CyberCutBox
                  cutSize={6}
                  radius={3}
                  fill={status === 'connected' ? 'rgba(61, 220, 132, 0.14)' : colors.cardBorder}
                  borderColor={status === 'connected' ? 'rgba(61, 220, 132, 0.5)' : colors.cardBorder}
                  borderWidth={1}
                  style={styles.connectCut}
                >
                  <Text style={[styles.connectText, { color: status === 'connected' ? '#3DDC84' : colors.muted }]}>
                    {status === 'connected' ? '✓ Connected' : 'Pending'}
                  </Text>
                </CyberCutBox>
              )}
            </Pressable>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { marginBottom: 12 },
  cut: { width: '100%' },
  inner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  avatarRing: { borderRadius: 14, borderWidth: 1.5, padding: 1 },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodySemi, fontSize: 14.5, fontWeight: '700' },
  role: { fontFamily: fonts.body, fontSize: 11.5 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  tagPill: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2.5 },
  tagText: { fontFamily: fonts.mono, fontSize: 8.5, fontWeight: '700' },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  matchPill: { alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  matchText: { fontFamily: fonts.display, fontSize: 13, fontWeight: '700' },
  matchCaption: { fontFamily: fonts.mono, fontSize: 7, letterSpacing: 1 },
  connectCut: { height: 30, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  connectText: { fontFamily: fonts.bodySemi, fontSize: 11, fontWeight: '700' },
  connectTextActive: { fontFamily: fonts.bodySemi, fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
