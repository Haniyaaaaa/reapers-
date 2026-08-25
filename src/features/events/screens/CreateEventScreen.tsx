import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import type { EventCategory, EventType } from '../../../types/event';

export function CreateEventScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const createEvent = useCommunityStore((s) => s.createEvent);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('0');
  const [type, setType] = useState<EventType[]>(['Online']);
  const [category, setCategory] = useState<EventCategory[]>(['Meetup']);
  const [cover, setCover] = useState<string | undefined>();
  const [hostAccountName, setHostAccountName] = useState(user?.displayName ?? '');
  const [hostBankName, setHostBankName] = useState('');
  const [hostAccountNumber, setHostAccountNumber] = useState('');
  const [hostIban, setHostIban] = useState('');
  const [err, setErr] = useState('');

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) setCover(res.assets[0]?.uri);
  };

  const submit = () => {
    if (title.trim().length < 3) {
      setErr('Title is required');
      return;
    }
    const amount = Number(price) || 0;
    const id = createEvent(
      {
        title: title.trim(),
        description: description.trim() || 'Community event',
        type: type[0] ?? 'Online',
        category: category[0] ?? 'Meetup',
        startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        location: location.trim() || 'TBA',
        cover: cover || 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=1200',
        paid: amount > 0,
        price: amount,
        currency: 'USD',
        hostAccountName: amount > 0 ? hostAccountName.trim() : undefined,
        hostBankName: amount > 0 ? hostBankName.trim() : undefined,
        hostAccountNumber: amount > 0 ? hostAccountNumber.trim() : undefined,
        hostIban: amount > 0 ? hostIban.trim() : undefined,
      },
      user?.displayName ?? 'You',
    );
    nav.replace('EventDetail', { id });
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Create event" onBack={() => nav.goBack()} />
      <Pressable onPress={pick} style={[styles.coverBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button">
        {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Upload cover image</Text>}
      </Pressable>
      <AuthTextField label="Title" value={title} onChangeText={setTitle} error={err} onBlur={() => setErr(title.trim().length < 3 ? 'Title is required' : '')} />
      <AuthTextField label="Description" value={description} onChangeText={setDescription} multiline />
      <AuthTextField label="Location or link" value={location} onChangeText={setLocation} />
      <AuthTextField label="Ticket price (USD, 0 = free)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      {Number(price) > 0 ? (
        <>
          <AuthTextField label="Host account name" value={hostAccountName} onChangeText={setHostAccountName} />
          <AuthTextField label="Bank name" value={hostBankName} onChangeText={setHostBankName} />
          <AuthTextField label="Account number" value={hostAccountNumber} onChangeText={setHostAccountNumber} />
          <AuthTextField label="IBAN (optional)" value={hostIban} onChangeText={setHostIban} autoCapitalize="characters" />
        </>
      ) : null}
      <ChipPicker options={['Online', 'Physical']} selected={type} onToggle={(v) => setType([v as EventType])} />
      <ChipPicker
        options={['Esports', 'Meetup', 'LAN', 'Workshop', 'Tournament', 'Watch party']}
        selected={category}
        onToggle={(v) => setCategory([v as EventCategory])}
      />
      <PrimaryButton label="Publish" onPress={submit} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverBtn: { minHeight: 140, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden' },
  cover: { width: '100%', height: 140 },
});
