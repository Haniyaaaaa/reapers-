import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import { ChatroomRow } from '../../../components/cards/ChatroomRow';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { SearchBar } from '../../../components/inputs/SearchBar';
import { Screen } from '../../../components/layout/Screen';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import type { Chatroom } from '../../../types/chat';
import { brandLogo } from '../../../data/brand';
import { communityLogos } from '../../../data/communityLogos';
import { avatarUriFor } from '../../../data/gamerAvatars';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'ChatTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

type Guild = { id: string; name: string; logo?: Chatroom['logo']; uri?: string };

export function ChatDirectoryScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const { phase } = useFakeLoad();
  const rooms = useCommunityStore((s) => s.rooms);
  const joinRoom = useCommunityStore((s) => s.joinRoom);
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q);
  const [guild, setGuild] = useState('reapers');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const guilds: Guild[] = useMemo(
    () => [
      { id: 'reapers', name: 'Reapers', logo: brandLogo },
      { id: 'dms', name: 'DMs' },
      ...rooms.filter((r) => r.kind === 'server').map((r) => ({ id: r.id, name: r.name, uri: avatarUriFor(undefined, r.name) })),
      ...rooms
        .filter((r) => r.communityId)
        .map((r) => ({
          id: r.id,
          name: r.name,
          logo: r.logo ?? communityLogos.cega,
        })),
    ],
    [rooms],
  );

  const filtered = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchQ =
        !needle ||
        r.name.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        (r.serverRegion?.toLowerCase().includes(needle) ?? false);
      if (!matchQ) return false;
      if (guild === 'reapers') return r.kind === 'global' || r.kind === 'room';
      if (guild === 'dms') return r.kind === 'dm';
      return r.id === guild;
    });
  }, [rooms, dq, guild]);

  const pending = rooms.find((r) => r.id === pendingId);
  const open = (r: Chatroom) => {
    if (r.joined) nav.navigate('ChatDetail', { id: r.id });
    else setPendingId(r.id);
  };

  return (
    <Screen>
      <View style={styles.top}>
        <View>
          <Text style={[styles.h, { color: colors.text }]}>Chat</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, marginTop: 4 }}>Servers, communities, and general</Text>
        </View>
        <Pressable
          onPress={() => nav.navigate('CreateRoom')}
          style={[styles.fab, { backgroundColor: colors.magenta }]}
          accessibilityRole="button"
          accessibilityLabel="Create server"
        >
          <Ionicons name="add" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guilds}>
        {guilds.map((g) => {
          const on = guild === g.id;
          return (
            <Pressable key={g.id} onPress={() => setGuild(g.id)} style={styles.guild} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View
                style={[
                  styles.guildIcon,
                  { borderColor: on ? colors.magenta : colors.border, backgroundColor: colors.surface },
                ]}
              >
                {g.logo ? (
                  <Image source={g.logo} style={styles.guildImg} />
                ) : g.uri ? (
                  <Image source={{ uri: g.uri }} style={styles.guildImg} />
                ) : (
                  <Ionicons name="chatbubbles" size={20} color={colors.cyan} />
                )}
              </View>
              <Text style={{ color: on ? colors.text : colors.muted, fontFamily: fonts.bodyMed, fontSize: 10 }} numberOfLines={1}>
                {g.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SearchBar value={q} onChangeText={setQ} placeholder="Search channels" />
      <Text style={[styles.channelLabel, { color: colors.muted }]}>
        {guild === 'reapers' ? '#  CHANNELS' : guild === 'dms' ? 'DIRECT MESSAGES' : 'SERVER CHAT'}
      </Text>

      {phase === 'loading' ? (
        <View style={{ gap: 12 }}>
          <Skeleton width="100%" height={72} />
          <Skeleton width="100%" height={72} />
        </View>
      ) : null}

      {phase === 'ready' && filtered.length === 0 ? (
        <EmptyState title="Nothing in this server yet." actionLabel="Create a channel" onAction={() => nav.navigate('CreateRoom')} />
      ) : null}

      {phase === 'ready'
        ? filtered.map((r) => <ChatroomRow key={r.id} room={r} onPress={() => open(r)} />)
        : null}

      <ConfirmSheet
        visible={!!pending}
        title={`Join ${pending?.name ?? ''}`}
        body={pending?.description ?? ''}
        confirmLabel="Join"
        onClose={() => setPendingId(null)}
        onConfirm={() => {
          if (pending) {
            joinRoom(pending.id);
            setPendingId(null);
            nav.navigate('ChatDetail', { id: pending.id });
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h: { fontFamily: fonts.display, fontSize: 28 },
  fab: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  guilds: { gap: 12, paddingVertical: 12, paddingRight: 8 },
  guild: { width: 64, alignItems: 'center', gap: 6 },
  guildIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  guildImg: { width: '100%', height: '100%' },
  channelLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, marginTop: 14, marginBottom: 8 },
});
