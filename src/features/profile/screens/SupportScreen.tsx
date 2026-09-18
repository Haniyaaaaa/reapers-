import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { BladeCard } from '../../../components/cards/BladeCard';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useSupportStore } from '../../../store/supportStore';
import { fonts, useTheme } from '../../../theme';

const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export function SupportScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const tickets = useSupportStore((s) => s.tickets);
  const fetchMyTickets = useSupportStore((s) => s.fetchMyTickets);
  const createTicket = useSupportStore((s) => s.createTicket);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchMyTickets(user.id);
  }, [user, fetchMyTickets]);

  const submit = async () => {
    if (!subject.trim() || !message.trim() || !user) {
      setErr('Add a subject and a message.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const ticket = await createTicket(user.id, subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      nav.navigate('SupportTicketDetail', { id: ticket.id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Support" onBack={() => nav.goBack()} />

      <Text style={[styles.h, { color: colors.text }]}>New ticket</Text>
      <AuthTextField label="Subject" value={subject} onChangeText={setSubject} />
      <AuthTextField label="Message" value={message} onChangeText={setMessage} multiline />
      {err ? <InlineErrorText message={err} /> : null}
      <PrimaryButton label="Open ticket" onPress={submit} loading={submitting} disabled={submitting} />

      <Text style={[styles.h, { color: colors.text }]}>Your tickets</Text>
      {tickets.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No tickets yet.</Text> : null}
      {tickets.map((t) => (
        <Pressable key={t.id} onPress={() => nav.navigate('SupportTicketDetail', { id: t.id })} accessibilityRole="button">
          <BladeCard style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subject, { color: colors.text }]}>{t.subject}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>{new Date(t.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.status, { color: t.status === 'resolved' ? colors.cyan : colors.muted }]}>{STATUS_LABEL[t.status]}</Text>
          </BladeCard>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.display, fontSize: 18, marginTop: 22, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8 },
  subject: { fontFamily: fonts.bodySemi, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  status: { fontFamily: fonts.mono, fontSize: 12 },
});
