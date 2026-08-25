import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList, TabParamList } from '../../../navigation/types';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { ChatroomRow } from '../../../components/cards/ChatroomRow';
import { CommunityRow } from '../../../components/cards/CommunityRow';
import { DemoCard } from '../../../components/cards/DemoCard';
import { EventRow } from '../../../components/cards/EventRow';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { RetryBanner } from '../../../components/feedback/RetryBanner';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { OfflineBanner } from '../../../components/feedback/OfflineBanner';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { StatPill } from '../../../components/layout/StatPill';
import { brandLogo } from '../../../data/brand';
import { categories, onlineUsers } from '../../../data/mock';
import { useAuth } from '../../../hooks/useAuth';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useOffline } from '../../../hooks/useOffline';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, space, useTheme } from '../../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'HomeTab'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: themeColors, gradients } = useTheme();
  const offline = useOffline();
  const { phase, reload, setError } = useFakeLoad();
  const [refreshing, setRefreshing] = useState(false);
  const demos = useCommunityStore((s) => s.demos);
  const events = useCommunityStore((s) => s.events);
  const rooms = useCommunityStore((s) => s.rooms);
  const communities = useCommunityStore((s) => s.communities);
  const joinCommunity = useCommunityStore((s) => s.joinCommunity);
  const going = events.filter((e) => e.rsvp === 'going').length;
  const empty = demos.length + events.length + rooms.length === 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    reload();
    setRefreshing(false);
  };

  return (
    <LinearGradient colors={gradients.background} style={styles.fill}>
      {offline ? <OfflineBanner /> : null}
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Image source={brandLogo} style={styles.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.hello, { color: themeColors.text }]}>Hey {user?.displayName ?? 'player'}</Text>
              <Text style={[styles.muted, { color: themeColors.muted }]}>Who’s online tonight</Text>
            </View>
          </View>
          <View style={styles.icons}>
            <Pressable onPress={() => nav.navigate('Notifications')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={22} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => nav.navigate('Network')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Network">
              <Ionicons name="people-outline" size={22} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => nav.navigate('Profile', {})} accessibilityRole="button" accessibilityLabel="Profile">
              <AvatarRing name={user?.displayName ?? 'R'} size={48} uri={user?.avatarUri} avatarId={user?.avatarId} look={user?.avatarLook} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }} contentContainerStyle={{ gap: 12 }}>
          {onlineUsers.map((u) => (
              <AvatarRing
                key={u.id}
                name={u.name}
                online={u.online}
                size={56}
                avatarId={u.avatarId}
                showName
              />
          ))}
        </ScrollView>

        <View style={styles.pills}>
          <StatPill label="Invites" value="2" />
          <StatPill label="Credibility" value={String(user?.credibility ?? 0)} />
          <StatPill label="RSVPs" value={String(going)} />
        </View>

        <SectionHeader title="Game categories" onSeeAll={() => nav.navigate('DemosTab')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginBottom: 20 }}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => nav.navigate('DemosTab')}
              style={styles.cat}
              accessibilityRole="button"
              accessibilityLabel={c.name}
            >
              <View style={[styles.catIcon, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Ionicons name="game-controller" size={22} color={themeColors.cyan} />
              </View>
              <Text style={[styles.catLabel, { color: themeColors.muted }]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {phase === 'error' ? <RetryBanner onRetry={reload} /> : null}

        {phase === 'loading' ? (
          <View style={{ gap: 12, marginTop: 16 }}>
            <Skeleton width="100%" height={24} />
            <ScrollView horizontal>
              <Skeleton width={220} height={180} />
            </ScrollView>
            <Skeleton width="100%" height={72} />
          </View>
        ) : null}

        {phase === 'ready' && empty ? (
          <EmptyState title="No activity yet — follow a demo, join a room, or RSVP to an event." actionLabel="Discover rooms" onAction={() => nav.navigate('ChatTab')} />
        ) : null}

        {phase === 'ready' && !empty ? (
          <>
            <SectionHeader title="Communities" onSeeAll={() => nav.navigate('Communities')} />
            <View style={{ gap: 10, marginBottom: 20 }}>
              {communities.map((c) => (
                <CommunityRow
                  key={c.id}
                  community={c}
                  onPress={() => nav.navigate('CommunityDetail', { id: c.id })}
                  onJoin={() => {
                    if (c.joined) {
                      nav.navigate('CommunityDetail', { id: c.id });
                      return;
                    }
                    joinCommunity(c.id);
                    nav.navigate('CommunityDetail', { id: c.id });
                  }}
                />
              ))}
            </View>
            <SectionHeader title="Trending demos" onSeeAll={() => nav.navigate('DemosTab')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginBottom: 20 }}>
              {demos.map((d) => (
                <DemoCard key={d.id} demo={d} onPress={() => nav.navigate('DemoDetail', { id: d.id })} />
              ))}
            </ScrollView>
            <SectionHeader title="Upcoming events" onSeeAll={() => nav.navigate('EventHub')} />
            <View style={{ gap: 10, marginBottom: 20 }}>
              {events
                .filter((e) => new Date(e.startsAt).getTime() > Date.now())
                .map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    onPress={() => nav.navigate('EventDetail', { id: e.id })}
                  />
                ))}
            </View>
            <SectionHeader title="Active chatrooms" onSeeAll={() => nav.navigate('ChatTab')} />
            {rooms
              .filter((r) => r.joined)
              .map((r) => (
                <ChatroomRow key={r.id} room={r} onPress={() => nav.navigate('ChatDetail', { id: r.id })} />
              ))}
          </>
        ) : null}

        {phase === 'ready' ? (
          <Pressable onPress={setError} style={styles.dev} accessibilityRole="button">
            <Text style={[styles.devText, { color: themeColors.muted2 }]}>Simulate feed error</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  brand: { width: 44, height: 44, borderRadius: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hello: { fontFamily: fonts.display, fontSize: 28 },
  muted: { fontFamily: fonts.body, marginTop: 4 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  cat: { alignItems: 'center', width: 76, gap: 8 },
  catIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  dev: { minHeight: 44, justifyContent: 'center', marginTop: 8 },
  devText: { fontFamily: fonts.mono, fontSize: 11, textAlign: 'center' },
});
