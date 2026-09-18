import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { navigationRef } from '../../navigation/navigationRef';
import { AvatarRing } from '../avatars/AvatarRing';
import { ConnectButton } from '../buttons/ConnectButton';
import { useAuth } from '../../hooks/useAuth';
import { useChatStore } from '../../store/chatStore';
import { useNetworkStore } from '../../store/networkStore';
import { useProfilePreviewStore } from '../../store/profilePreviewStore';
import { getProfile, profileRowToUser } from '../../services/supabase/profiles';
import { fonts, radius, useTheme } from '../../theme';
import type { User } from '../../types/user';

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
                <ConnectButton state={conn} onPress={() => user && userId && connectPerson(user.id, userId)} />
                <Pressable
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
                  disabled={messaging}
                  style={[styles.msg, { borderColor: colors.border }, messaging && { opacity: 0.6 }]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{messaging ? 'Opening…' : 'Message'}</Text>
                </Pressable>
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
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: 24,
  },
  header: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  name: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  linkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  msg: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  viewProfile: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
