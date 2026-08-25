import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useFakeLoad } from '../../../hooks/useFakeLoad';
import { useCommunityStore } from '../../../store/communityStore';
import { colors, fonts, radius } from '../../../theme';

function dayKey(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

export function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { phase } = useFakeLoad(250);
  const notes = useCommunityStore((s) => s.notes);
  const markNoteRead = useCommunityStore((s) => s.markNoteRead);
  const markAllRead = useCommunityStore((s) => s.markAllRead);

  const groups = notes.reduce<Record<string, typeof notes>>((acc, n) => {
    const k = dayKey(n.createdAt);
    acc[k] = acc[k] ? [...acc[k], n] : [n];
    return acc;
  }, {});

  const open = (n: (typeof notes)[0]) => {
    markNoteRead(n.id);
    switch (n.target.screen) {
      case 'Network':
        nav.navigate('Network');
        break;
      case 'Profile':
        nav.navigate('Profile', { id: n.target.id });
        break;
      case 'ChatDetail':
        nav.navigate('ChatDetail', { id: n.target.id });
        break;
      case 'EventDetail':
        nav.navigate('EventDetail', { id: n.target.id });
        break;
      case 'DemoDetail':
        nav.navigate('DemoDetail', { id: n.target.id });
        break;
      case 'ExpertProfile':
        nav.navigate('ExpertProfile', { id: n.target.id });
        break;
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        onBack={() => nav.goBack()}
        right={
          <Pressable onPress={markAllRead} style={styles.mark} accessibilityRole="button">
            <Text style={styles.link}>Mark all read</Text>
          </Pressable>
        }
      />
      {phase === 'loading' ? <Skeleton width="100%" height={64} /> : null}
      {phase === 'ready' && notes.length === 0 ? <EmptyState title="No notifications yet." /> : null}
      {phase === 'ready'
        ? Object.entries(groups).map(([day, list]) => (
            <View key={day} style={{ marginBottom: 16 }}>
              <Text style={styles.day}>{day}</Text>
              {list.map((n) => (
                <Pressable key={n.id} onPress={() => open(n)} style={[styles.row, !n.read && styles.unread]} accessibilityRole="button">
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                </Pressable>
              ))}
            </View>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.cyan, fontFamily: fonts.bodyMed, fontSize: 12 },
  day: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, marginBottom: 8 },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.magenta, backgroundColor: colors.magentaDeep },
  title: { color: colors.text, fontFamily: fonts.bodySemi },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
});
