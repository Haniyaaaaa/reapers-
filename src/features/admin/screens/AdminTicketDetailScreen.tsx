import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AdminStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useAuth } from '../../../hooks/useAuth';
import { useAdminStore } from '../../../store/adminStore';
import { useSupportStore } from '../../../store/supportStore';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { SupportTicketRow } from '../../../services/supabase/types';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';

const STATUSES: SupportTicketRow['status'][] = ['open', 'in_progress', 'resolved'];
const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export function AdminTicketDetailScreen() {
  const { params } = useRoute<RouteProp<AdminStackParamList, 'AdminTicketDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const ticket = useAdminStore((s) => s.tickets.find((t) => t.id === params.id));
  const fetchTickets = useAdminStore((s) => s.fetchTickets);
  const setTicketStatus = useAdminStore((s) => s.setTicketStatus);
  const messages = useSupportStore((s) => s.messagesByTicket[params.id] ?? EMPTY_ARRAY);
  const fetchMessages = useSupportStore((s) => s.fetchMessages);
  const sendMessage = useSupportStore((s) => s.sendMessage);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages(params.id);
    if (!ticket) fetchTickets();
  }, [params.id, ticket, fetchMessages, fetchTickets]);

  const send = async () => {
    if (!reply.trim() || !user) return;
    setSending(true);
    try {
      await sendMessage(params.id, user.id, reply.trim());
      setReply('');
    } finally {
      setSending(false);
    }
  };

  const setStatus = (status: SupportTicketRow['status']) => setTicketStatus(params.id, status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <Screen>
        <ScreenHeader title={ticket?.subject ?? 'Ticket'} onBack={() => nav.goBack()} />

        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const on = ticket?.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
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
                    <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.muted }, on && styles.chipTextActive]}>{STATUS_LABEL[s]}</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            );
          })}
        </View>

        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <View
              key={m.id}
              style={[
                styles.bubbleWrap,
                { alignSelf: mine ? 'flex-end' : 'flex-start' },
              ]}
            >
              <CyberCutBox
                cutSize={8}
                radius={6}
                fill={mine ? (isDark ? 'rgba(15, 60, 75, 0.9)' : 'rgba(8, 145, 178, 0.15)') : colors.cardFill}
                borderColor={mine ? (isDark ? 'rgba(0, 229, 255, 0.4)' : 'rgba(8, 145, 178, 0.4)') : colors.cardBorder}
                borderWidth={0.88}
                style={{ width: '100%' }}
              >
                <View style={styles.bubbleInner}>
                  <Text style={[styles.messageText, { color: colors.text }]}>{m.message}</Text>
                  <Text style={[styles.timeText, { color: colors.muted2 }]}>{new Date(m.created_at).toLocaleString()}</Text>
                </View>
              </CyberCutBox>
            </View>
          );
        })}

        <View style={{ height: 16 }} />
        <AuthTextField label="Reply" value={reply} onChangeText={setReply} multiline />
        <View style={{ marginTop: 12 }}>
          <PrimaryButton label="Send" onPress={send} loading={sending} disabled={sending || !reply.trim()} />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  statusRow: {
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
  bubbleWrap: {
    maxWidth: '85%',
    marginBottom: 10,
  },
  bubbleInner: {
    padding: 12,
  },
  messageText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  timeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
    marginTop: 4,
  },
});

