import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import type { MainStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useSupportStore } from '../../../store/supportStore';
import { fonts, radius, useTheme } from '../../../theme';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';

const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export function SupportTicketDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'SupportTicketDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const ticket = useSupportStore((s) => s.tickets.find((t) => t.id === params.id));
  const messages = useSupportStore((s) => s.messagesByTicket[params.id] ?? EMPTY_ARRAY);
  const fetchTicket = useSupportStore((s) => s.fetchTicket);
  const fetchMessages = useSupportStore((s) => s.fetchMessages);
  const sendMessage = useSupportStore((s) => s.sendMessage);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');

  useEffect(() => {
    fetchTicket(params.id);
    fetchMessages(params.id);
  }, [params.id, fetchTicket, fetchMessages]);

  const refreshControl = useRefreshControl(async () => {
    await Promise.all([fetchTicket(params.id), fetchMessages(params.id)]);
  });

  const send = async () => {
    if (!reply.trim() || !user) return;
    setSending(true);
    setSendErr('');
    try {
      await sendMessage(params.id, user.id, reply.trim());
      setReply('');
    } catch (err) {
      setSendErr(err instanceof Error ? err.message : 'Could not send — try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader title={ticket?.subject ?? 'Ticket'} onBack={() => nav.goBack()} />
      {ticket ? <Text style={[styles.status, { color: colors.muted }]}>{STATUS_LABEL[ticket.status]}</Text> : null}

      {messages.map((m) => {
        const mine = m.sender_id === user?.id;
        return (
          <View key={m.id} style={[styles.bubble, { backgroundColor: mine ? colors.magentaDeep : colors.surface, alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.body }}>{m.message}</Text>
            <Text style={{ color: colors.muted2, fontFamily: fonts.mono, fontSize: 10, marginTop: 4 }}>
              {new Date(m.created_at).toLocaleString()}
            </Text>
          </View>
        );
      })}

      <View style={{ height: 12 }} />
      <AuthTextField label="Reply" value={reply} onChangeText={setReply} multiline />
      {sendErr ? <InlineErrorText message={sendErr} /> : null}
      <PrimaryButton label="Send" onPress={send} loading={sending} disabled={sending || !reply.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: fonts.mono, fontSize: 12, marginBottom: 12 },
  bubble: { maxWidth: '85%', borderRadius: radius.md, padding: 12, marginBottom: 8 },
});
