import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useCommunityStore } from '../../../store/communityStore';
import { colors, fonts } from '../../../theme';

export function BecomeExpertScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const becomeExpert = useCommunityStore((s) => s.becomeExpert);
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const submit = () => {
    if (bio.trim().length < 12) {
      setErr('Tell us a bit more about your practice');
      return;
    }
    becomeExpert();
    nav.goBack();
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Become an Expert" onBack={() => nav.goBack()} />
      <Text style={styles.p}>Office hours are 10-minute booked calls. Applications are reviewed async in v1 mock.</Text>
      <AuthTextField label="Credentials / bio" value={bio} onChangeText={setBio} error={err} multiline onBlur={() => setErr(bio.trim().length < 12 ? 'Tell us a bit more about your practice' : '')} />
      <ChipPicker options={['Systems', 'Live ops', 'Shaders', 'VFX', 'Narrative']} selected={tags} onToggle={(v) => setTags((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))} />
      <PrimaryButton label="Submit application" onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  p: { color: colors.muted, fontFamily: fonts.body, marginBottom: 16 },
});
