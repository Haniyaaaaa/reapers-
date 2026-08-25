import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { skillOptions } from '../../../data/mock';
import { useCommunityStore } from '../../../store/communityStore';

export function PostTeamRequestScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const postTeam = useCommunityStore((s) => s.postTeam);
  const [project, setProject] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const submit = () => {
    if (project.trim().length < 3) {
      setErr('Project name is required');
      return;
    }
    postTeam({ project: project.trim(), excerpt: excerpt.trim() || 'Looking for collaborators.', roles: roles.length ? roles : ['Gameplay'] });
    nav.goBack();
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Post team request" onBack={() => nav.goBack()} />
      <AuthTextField label="Project" value={project} onChangeText={setProject} error={err} onBlur={() => setErr(project.trim().length < 3 ? 'Project name is required' : '')} />
      <AuthTextField label="Description" value={excerpt} onChangeText={setExcerpt} multiline />
      <ChipPicker options={skillOptions} selected={roles} onToggle={(v) => setRoles((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))} />
      <PrimaryButton label="Publish" onPress={submit} />
    </Screen>
  );
}
