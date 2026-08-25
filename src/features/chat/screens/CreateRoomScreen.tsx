import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';
import { ChipPicker } from '../../../components/inputs/ChipPicker';

export function CreateRoomScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const createRoom = useCommunityStore((s) => s.createRoom);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [kind, setKind] = useState<string[]>(['room']);
  const [err, setErr] = useState('');

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) setAvatar(res.assets[0]?.uri);
  };

  const submit = () => {
    if (name.trim().length < 3) {
      setErr('Name is required');
      return;
    }
    const id = createRoom({
      name: name.trim(),
      description: description.trim(),
      isPrivate,
      avatar,
      kind: kind[0] === 'server' ? 'server' : 'room',
      tag: kind[0] === 'server' ? 'Server' : tag.trim() || 'Dev',
      serverRegion: kind[0] === 'server' ? name.trim() : undefined,
    });
    nav.replace('ChatDetail', { id });
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Create server or channel" onBack={() => nav.goBack()} />
      <ChipPicker options={['room', 'server']} selected={kind} onToggle={(v) => setKind([v])} />
      <Pressable onPress={pick} style={styles.avatarBtn} accessibilityRole="button">
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]} />}
        <Text style={{ color: colors.cyan, fontFamily: fonts.bodyMed }}>Upload room image</Text>
      </Pressable>
      <AuthTextField label="Name" value={name} onChangeText={setName} error={err} onBlur={() => setErr(name.trim().length < 3 ? 'Name is required' : '')} />
      <AuthTextField label="Tag" value={tag} onChangeText={setTag} placeholder="Valorant, Dev, Jam" />
      <AuthTextField label="Description" value={description} onChangeText={setDescription} multiline />
      <View style={styles.row}>
        <Text style={{ color: colors.text, fontFamily: fonts.bodyMed }}>Private</Text>
        <Switch value={isPrivate} onValueChange={setIsPrivate} thumbColor={colors.cyan} />
      </View>
      <PrimaryButton label="Create" onPress={submit} />
      <Pressable onPress={() => nav.goBack()} style={styles.cancel} accessibilityRole="button">
        <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed }}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: radius.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, marginBottom: 16 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
