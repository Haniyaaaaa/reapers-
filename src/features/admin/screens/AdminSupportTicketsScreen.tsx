import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AdminStackParamList } from '../../../navigation/types';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAdminStore } from '../../../store/adminStore';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { SupportTicketRow } from '../../../services/supabase/types';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';

const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const FILTERS: (SupportTicketRow['status'] | 'all')[] = ['all', 'open', 'in_progress', 'resolved'];

export function AdminSupportTicketsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors } = useTheme();
  const tickets = useAdminStore((s) => s.tickets);
  const ticketsHasMore = useAdminStore((s) => s.ticketsHasMore);
  const fetchTickets = useAdminStore((s) => s.fetchTickets);
  const loadMoreTickets = useAdminStore((s) => s.loadMoreTickets);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  useEffect(() => {
    fetchTickets(filter === 'all' ? undefined : filter);
  }, [filter, fetchTickets]);

  const refreshControl = useRefreshControl(() => fetchTickets(filter === 'all' ? undefined : filter));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <Screen refreshControl={refreshControl}>
        <ScreenHeader title="Support Tickets" />

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={styles.chipBtnTouch}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <CyberCutBox
                  gradient={on}
                  cutSize={6}
                  radius={4}
                  fill={on ? undefined : colors.cardFill}
                  borderColor={on ? undefined : colors.cardBorder}
                  borderWidth={0.88}
                  style={{ width: '100%', height: 36 }}
                >
                  <View style={styles.chipInner}>
                    <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.muted }, on && styles.chipTextActive]}>
                      {f === 'all' ? 'All' : STATUS_LABEL[f]}
                    </Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            );
          })}
        </View>

        {tickets.length === 0 ? <Text style={[styles.emptyText, { color: colors.muted }]}>No tickets.</Text> : null}
        {tickets.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => nav.navigate('AdminTicketDetail', { id: t.id })}
            accessibilityRole="button"
            style={{ marginBottom: 10 }}
          >
            <CyberCutBox
              cutSize={10}
              radius={8}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={{ width: '100%' }}
            >
              <View style={styles.cardInner}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectText, { color: colors.text }]}>{t.subject}</Text>
                  <Text style={[styles.metaText, { color: colors.muted }]}>{new Date(t.created_at).toLocaleDateString()}</Text>
                </View>
                <Text
                  style={[
                    styles.statusText,
                    { color: t.status === 'resolved' ? colors.primary : colors.muted },
                  ]}
                >
                  {STATUS_LABEL[t.status]}
                </Text>
              </View>
            </CyberCutBox>
          </Pressable>
        ))}
        <LoadMoreButton hasMore={ticketsHasMore} onPress={loadMoreTickets} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chipBtnTouch: {
    flex: 1,
    height: 36,
  },
  chipInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#8E9BB5',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: '#8E9BB5',
    fontFamily: fonts.body,
    paddingVertical: 12,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  subjectText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#8E9BB5',
    marginTop: 2,
  },
  statusText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
  },
});

