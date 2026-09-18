import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { getCyberAvatarSource } from '../../data/cyberAvatars';
import { fonts, useTheme } from '../../theme';
import type { PersonCard } from '../../types/extra';

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
  return (
    <Pressable onPress={onPress} style={styles.touch} accessibilityRole="button">
      <CyberCutBox cutSize={12} radius={8} fill="rgba(14, 20, 35, 0.85)" style={styles.cut}>
        <View style={styles.inner}>
          <View style={[styles.avatarBox, isLight && { backgroundColor: colors.surfaceElevated }]}>
            <Image source={getCyberAvatarSource(person.id)} style={styles.avatarImg} />
          </View>

          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{person.displayName}</Text>
            <Text style={[styles.role, { color: colors.muted }]} numberOfLines={1}>{person.roles.join(' · ') || 'Member'}</Text>
            {person.skills.length > 0 ? (
              <View style={styles.tagsRow}>
                {person.skills.slice(0, 3).map((tag) => (
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
            ) : null}
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.matchText, isLight && { color: colors.electricAccent }]}>{matchScore}% MATCH</Text>
            <Pressable onPress={onConnect} disabled={status !== 'connect'} accessibilityRole="button">
              <CyberCutBox
                cutSize={6}
                radius={3}
                fill={
                  status === 'connect'
                    ? (isLight ? colors.primary : '#FFFFFF')
                    : status === 'connected'
                    ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 230, 153, 0.15)')
                    : (isLight ? 'rgba(109, 53, 255, 0.10)' : 'rgba(9, 15, 28, 0.55)')
                }
                borderColor={
                  status === 'connect'
                    ? 'transparent'
                    : status === 'connected'
                    ? (isLight ? 'rgba(16, 185, 129, 0.40)' : 'rgba(0, 230, 153, 0.40)')
                    : (isLight ? 'rgba(109, 53, 255, 0.35)' : 'rgba(255, 255, 255, 0.35)')
                }
                borderWidth={status === 'connect' ? 0 : 1}
                style={styles.connectCut}
              >
                <Text
                  style={[
                    styles.connectText,
                    status === 'connect' && isLight && { color: '#FFFFFF' },
                    status === 'connected' && (isLight ? { color: '#059669' } : { color: '#00E699' }),
                    status === 'pending' && (isLight ? { color: '#6D35FF' } : styles.connectTextInactive),
                  ]}
                >
                  {status === 'connected' ? '✓ Connected' : status === 'pending' ? 'Pending' : 'Connect'}
                </Text>
              </CyberCutBox>
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
  avatarBox: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: '#161B2E' },
  avatarImg: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodySemi, fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  role: { fontFamily: fonts.body, fontSize: 11.5, color: '#8E9BB5' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tagPill: { backgroundColor: 'rgba(109, 53, 255, 0.18)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: fonts.mono, fontSize: 8.5, fontWeight: '700', color: '#D83CFF' },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  matchText: { fontFamily: fonts.mono, fontSize: 9.5, color: '#00E5FF', letterSpacing: 0.4 },
  connectCut: { height: 30, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  connectText: { fontFamily: fonts.bodySemi, fontSize: 11, fontWeight: '700', color: '#6D35FF' },
  connectTextInactive: { color: '#FFFFFF' },
});
