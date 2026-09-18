import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { MainStackParamList } from '../../../navigation/types';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { BladeCard } from '../../../components/cards/BladeCard';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { SearchBar } from '../../../components/inputs/SearchBar';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useChatStore } from '../../../store/chatStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { listConnectedPeople } from '../../../services/supabase/network';
import { fonts, radius, useTheme } from '../../../theme';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import type { RoomMember } from '../../../types/chat';
import type { PersonCard } from '../../../types/extra';

const ROLE_RANK: Record<RoomMember['role'], number> = { owner: 0, admin: 1, member: 2 };

export function RoomMembersScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'RoomMembers'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const room = useChatStore((s) => s.rooms.find((r) => r.id === params.roomId));
  const members = useChatStore((s) => s.members[params.roomId] ?? EMPTY_ARRAY);
  const fetchMembers = useChatStore((s) => s.fetchMembers);
  const setMemberRole = useChatStore((s) => s.setMemberRole);
  const removeMember = useChatStore((s) => s.removeMember);
  const inviteToRoom = useChatStore((s) => s.inviteToRoom);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);

  const [query, setQuery] = useState('');
  const [actionTarget, setActionTarget] = useState<RoomMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
  const [actionErr, setActionErr] = useState('');
  const [messaging, setMessaging] = useState(false);

  // Invite picker — a real searchable/paginated list (same listConnectedPeople RPC as
  // ChatDirectoryScreen's "New Message"), not the old ConfirmSheet-as-a-list hack, which
  // rendered every invitable connection as a stacked button and would fall over well before
  // reaching anywhere near "thousands of connections."
  const [inviting, setInviting] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const inviteSearchDq = useDebouncedValue(inviteSearch);
  const [invitable, setInvitable] = useState<PersonCard[]>([]);
  const [invitableLoading, setInvitableLoading] = useState(false);
  const [invitableHasMore, setInvitableHasMore] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [inviteErr, setInviteErr] = useState('');

  useEffect(() => {
    fetchMembers(params.roomId);
  }, [params.roomId, fetchMembers]);

  const isAdmin = room?.myRole === 'owner' || room?.myRole === 'admin';
  const memberIds = useMemo(() => members.map((m) => m.userId), [members]);

  const sortedMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...members]
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.name.localeCompare(b.name));
  }, [members, query]);

  const openInvite = () => {
    setInviteSearch('');
    setInvitedIds(new Set());
    setInviting(true);
    setInviteErr('');
  };

  useEffect(() => {
    if (!inviting || !user) return;
    let cancelled = false;
    setInvitableLoading(true);
    listConnectedPeople(user.id, { search: inviteSearchDq, excludeIds: memberIds })
      .then((page) => {
        if (cancelled) return;
        setInvitable(page.rows);
        setInvitableHasMore(page.hasMore);
      })
      .finally(() => {
        if (!cancelled) setInvitableLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // memberIds intentionally omitted — it's derived fresh from `members` each render and
    // would otherwise re-trigger this fetch on every unrelated members-store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviting, user, inviteSearchDq]);

  const loadMoreInvitable = async () => {
    if (!user || invitableLoading) return;
    setInvitableLoading(true);
    try {
      const page = await listConnectedPeople(user.id, { search: inviteSearchDq, offset: invitable.length, excludeIds: memberIds });
      setInvitable((prev) => [...prev, ...page.rows]);
      setInvitableHasMore(page.hasMore);
    } finally {
      setInvitableLoading(false);
    }
  };

  const invite = async (inviteeId: string) => {
    if (!user) return;
    try {
      await inviteToRoom(params.roomId, user.id, inviteeId);
      setInvitedIds((prev) => new Set(prev).add(inviteeId));
    } catch (e) {
      setInviteErr(e instanceof Error ? e.message : 'Could not send invite');
    }
  };

  const closeAction = () => setActionTarget(null);

  const messageMember = async () => {
    if (!user || !actionTarget || messaging) return;
    setMessaging(true);
    setActionErr('');
    try {
      const roomId = await startDirectMessage(user.id, actionTarget.userId, actionTarget.name);
      closeAction();
      nav.navigate('ChatDetail', { id: roomId });
    } catch {
      setActionErr('Could not open a chat with this member — try again.');
    } finally {
      setMessaging(false);
    }
  };

  const toggleAdmin = async () => {
    if (!actionTarget) return;
    const next = actionTarget.role === 'admin' ? 'member' : 'admin';
    closeAction();
    setActionErr('');
    try {
      await setMemberRole(params.roomId, actionTarget.userId, next);
    } catch {
      setActionErr(`Could not ${next === 'admin' ? 'make' : 'dismiss'} ${actionTarget.name} ${next === 'admin' ? 'an admin' : 'as admin'} — try again.`);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Members" onBack={() => nav.goBack()} />
      <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 12 }}>
        {members.length} member{members.length === 1 ? '' : 's'}
      </Text>

      {isAdmin ? <PrimaryButton label="Invite from connections" onPress={openInvite} style={{ marginBottom: 16 }} /> : null}

      {members.length > 5 ? <SearchBar value={query} onChangeText={setQuery} placeholder="Search members" /> : null}
      {actionErr ? <InlineErrorText message={actionErr} /> : null}

      <View style={{ gap: 10, marginTop: members.length > 5 ? 12 : 0 }}>
        {sortedMembers.map((m) => (
          <BladeCard key={m.userId} style={styles.row}>
            <Pressable onPress={() => useProfilePreviewStore.getState().open(m.userId)} style={styles.rowLeft}>
              <AvatarRing name={m.name} size={40} uri={m.avatarUri} avatarId={m.avatarId} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{m.name}</Text>
                {m.role !== 'member' ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: m.role === 'owner' ? colors.magentaDeep : colors.tealMuted },
                    ]}
                  >
                    <Ionicons
                      name={m.role === 'owner' ? 'star' : 'shield-checkmark-outline'}
                      size={11}
                      color={m.role === 'owner' ? colors.magenta : colors.cyan}
                    />
                    <Text style={{ color: m.role === 'owner' ? colors.magenta : colors.cyan, fontFamily: fonts.mono, fontSize: 11 }}>
                      {m.role === 'owner' ? 'Owner' : 'Admin'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
            {isAdmin && m.role !== 'owner' && user && m.userId !== user.id ? (
              <Pressable
                onPress={() => setActionTarget(m)}
                style={styles.moreBtn}
                accessibilityRole="button"
                accessibilityLabel={`Manage ${m.name}`}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </BladeCard>
        ))}
      </View>

      {members.length === 0 ? <EmptyState title="No members yet." /> : null}
      {members.length > 0 && sortedMembers.length === 0 ? <EmptyState title="No members match that search." /> : null}

      <Modal visible={inviting} transparent animationType="slide" onRequestClose={() => setInviting(false)}>
        <View style={styles.inviteBackdrop}>
          <View style={[styles.inviteSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.inviteHeaderRow}>
              <Text style={[styles.inviteTitle, { color: colors.text }]}>Invite from connections</Text>
              <Pressable onPress={() => setInviting(false)} accessibilityRole="button" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <SearchBar value={inviteSearch} onChangeText={setInviteSearch} placeholder="Search connections" />
            {inviteErr ? <InlineErrorText message={inviteErr} /> : null}

            <FlatList
              data={invitable}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 420, marginTop: 12 }}
              keyboardShouldPersistTaps="handled"
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (invitableHasMore) loadMoreInvitable();
              }}
              ListEmptyComponent={
                invitableLoading ? null : (
                  <EmptyState
                    title={
                      inviteSearchDq
                        ? 'No connections match that search.'
                        : "No connections available to invite — everyone you're connected to is already here."
                    }
                  />
                )
              }
              ListFooterComponent={invitableLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
              renderItem={({ item: p }) => (
                <View style={styles.inviteRow}>
                  <AvatarRing name={p.displayName} size={36} />
                  <Text style={[styles.inviteName, { color: colors.text }]} numberOfLines={1}>
                    {p.displayName}
                  </Text>
                  {invitedIds.has(p.id) ? (
                    <Text style={{ color: colors.online, fontFamily: fonts.bodyMed, fontSize: 13 }}>Invited</Text>
                  ) : (
                    <Pressable onPress={() => invite(p.id)} accessibilityRole="button">
                      <Text style={{ color: colors.electricAccent, fontFamily: fonts.bodySemi, fontSize: 13 }}>Invite</Text>
                    </Pressable>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <ConfirmSheet
        visible={!!actionTarget}
        title={actionTarget?.name ?? ''}
        body=""
        confirmLabel={messaging ? 'Opening…' : 'Message'}
        danger={false}
        onConfirm={messageMember}
        extraActions={
          actionTarget
            ? [
                { label: actionTarget.role === 'admin' ? 'Dismiss as admin' : 'Make admin', onPress: toggleAdmin },
                {
                  label: 'Remove from group',
                  onPress: () => {
                    if (actionTarget) setRemoveTarget({ userId: actionTarget.userId, name: actionTarget.name });
                    closeAction();
                  },
                },
              ]
            : []
        }
        onClose={closeAction}
      />

      <ConfirmSheet
        visible={!!removeTarget}
        title={`Remove ${removeTarget?.name ?? ''}?`}
        body="They'll be removed from this room immediately."
        confirmLabel="Remove"
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return;
          const target = removeTarget;
          setRemoveTarget(null);
          setActionErr('');
          try {
            await removeMember(params.roomId, target.userId);
          } catch {
            setActionErr(`Could not remove ${target.name} — try again.`);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  moreBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inviteBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  inviteSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  inviteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inviteTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  inviteName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14.5 },
});
