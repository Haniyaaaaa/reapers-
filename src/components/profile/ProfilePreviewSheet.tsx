import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { navigationRef } from '../../navigation/navigationRef';
import { AvatarRing } from '../avatars/AvatarRing';
import { LinearGradient } from 'expo-linear-gradient';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { useAuth } from '../../hooks/useAuth';
import { useChatStore } from '../../store/chatStore';
import { useNetworkStore } from '../../store/networkStore';
import { useProfilePreviewStore } from '../../store/profilePreviewStore';
import { getProfile, profileRowToUser } from '../../services/supabase/profiles';
import { fonts, radius, useTheme } from '../../theme';
import type { User } from '../../types/user';

/** Chamfered action button matching the rest of the app's CTAs: brand gradient when primary,
 * a cyan-outlined ghost when secondary, and a muted translucent state once the action is done. */
function SheetButton({
  label,
  variant,
  onPress,
  disabled,
}: {
  label: string;
  variant: 'primary' | 'outline' | 'muted';
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.sheetBtn, disabled && variant !== 'muted' && { opacity: 0.6 }]}>
      <CyberCutBox
        cutSize={10}
        radius={6}
        gradient={variant === 'primary'}
        fill={variant === 'muted' ? 'rgba(255, 255, 255, 0.08)' : variant === 'outline' ? 'transparent' : undefined}
        borderColor={variant === 'muted' ? 'rgba(255, 255, 255, 0.2)' : variant === 'outline' ? 'rgba(0, 229, 255, 0.55)' : undefined}
        borderWidth={variant === 'primary' ? 0 : 1}
        style={styles.sheetBtnCut}
      >
        <View style={styles.sheetBtnInner}>
          <Text style={[styles.sheetBtnText, { color: variant === 'primary' ? '#FFFFFF' : variant === 'outline' ? colors.text : colors.muted }]}>{label}</Text>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

export function ProfilePreviewSheet() {
  const { colors } = useTheme();
  const userId = useProfilePreviewStore((s) => s.userId);
  const close = useProfilePreviewStore((s) => s.close);
  const { user } = useAuth();
  const peopleCards = useNetworkStore((s) => s.people);
  const connectPerson = useNetworkStore((s) => s.connectPerson);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getProfile(userId)
      .then((row) => {
        if (!cancelled) setProfile(profileRowToUser(row, ''));
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openLink = (url: string) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(href);
  };

  const conn = peopleCards.find((p) => p.id === userId)?.connect ?? 'connect';

  return (
    <Modal visible={!!userId} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
          <LinearGradient
            colors={['#00E5FF', '#6D35FF', '#D83CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sheetAccent}
          />
          {loading ? (
            <Text style={{ color: colors.muted, fontFamily: fonts.body, textAlign: 'center', paddingVertical: 20 }}>Loading…</Text>
          ) : !profile ? (
            <Text style={{ color: colors.muted, fontFamily: fonts.body, textAlign: 'center', paddingVertical: 20 }}>This profile could not be found.</Text>
          ) : (
            <>
              <View style={styles.header}>
                <AvatarRing name={profile.displayName} size={72} uri={profile.avatarUri} avatarId={profile.avatarId} look={profile.avatarLook} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{profile.displayName}</Text>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body }}>@{profile.username}</Text>
                  <View style={styles.badges}>
                    {profile.roles.map((r) => (
                      <View key={r} style={[styles.badge, { backgroundColor: colors.tealMuted }]}>
                        <Text style={{ color: colors.cyan, fontFamily: fonts.mono, fontSize: 11 }}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <Text style={{ color: colors.text, fontFamily: fonts.monoBold, fontSize: 13, marginBottom: 10 }}>
                Credibility {profile.credibility}
              </Text>
              {profile.bio ? (
                <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginBottom: 12 }}>{profile.bio}</Text>
              ) : null}
              {(profile.skills ?? []).length ? (
                <View style={styles.badges}>
                  {profile.skills.map((t) => (
                    <View key={t} style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontFamily: fonts.bodyMed, fontSize: 12 }}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {profile.portfolioUrl ? (
                <Pressable onPress={() => openLink(profile.portfolioUrl!)} style={styles.linkRow} accessibilityRole="link">
                  <Ionicons name="globe-outline" size={18} color={colors.cyan} />
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Portfolio</Text>
                </Pressable>
              ) : null}
              {profile.linkedinUrl ? (
                <Pressable onPress={() => openLink(profile.linkedinUrl!)} style={styles.linkRow} accessibilityRole="link">
                  <Ionicons name="logo-linkedin" size={18} color={colors.cyan} />
                  <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>LinkedIn</Text>
                </Pressable>
              ) : null}

              <View style={styles.actions}>
                <SheetButton
                  label={conn === 'connect' ? 'CONNECT' : conn === 'pending' ? 'PENDING' : 'CONNECTED'}
                  variant={conn === 'connect' ? 'primary' : 'muted'}
                  disabled={conn === 'connected'}
                  onPress={() => user && userId && connectPerson(user.id, userId)}
                />
                <SheetButton
                  label={messaging ? 'OPENING…' : 'MESSAGE'}
                  variant="outline"
                  disabled={messaging}
                  onPress={async () => {
                    if (!user || !userId || messaging) return;
                    setMessaging(true);
                    try {
                      const roomId = await startDirectMessage(user.id, userId, profile.displayName);
                      close();
                      navigationRef.navigate('Main', { screen: 'ChatDetail', params: { id: roomId } });
                    } catch {
                      // startDirectMessage already reports to Sentry; nothing further to do here.
                    } finally {
                      setMessaging(false);
                    }
                  }}
                />
              </View>

              <Pressable
                onPress={() => {
                  close();
                  navigationRef.navigate('Main', { screen: 'Profile', params: { id: userId! } });
                }}
                style={styles.viewProfile}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.cyan, fontFamily: fonts.bodySemi }}>View full profile</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={close} style={styles.cancel} accessibilityRole="button">
            <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 24,
  },
  header: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  name: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  linkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  sheetBtn: { flex: 1, height: 46 },
  sheetBtnCut: { width: '100%', height: '100%' },
  sheetBtnInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontFamily: fonts.display, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  sheetAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  viewProfile: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
