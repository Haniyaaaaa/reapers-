import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { FormSection } from '../../../components/layout/FormSection';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { skillOptions } from '../../../data/mock';
import { useCommunityStore } from '../../../store/communityStore';
import { fonts, radius, useTheme } from '../../../theme';

export function PostTeamRequestScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const postTeam = useCommunityStore((s) => s.postTeam);
  const [project, setProject] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const valid = project.trim().length >= 3;

  const submit = () => {
    if (!valid) {
      setErr('Project name is required');
      return;
    }
    postTeam({
      project: project.trim(),
      excerpt: excerpt.trim() || 'Looking for collaborators.',
      roles: roles.length ? roles : ['Gameplay'],
    });
    nav.goBack();
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Post team request" onBack={() => nav.goBack()} />
      <Text style={[styles.blurb, { color: colors.muted }]}>
        Tell the community what you are building and which teammates you still need. Your post lands in Network under Team requests.
      </Text>

      <FormSection title="Project" style={{ paddingBottom: 2 }}>
        <AuthTextField
          label="Project name"
          value={project}
          onChangeText={setProject}
          error={err}
          maxLength={60}
          showCount
          placeholder="Neon Drift"
          onBlur={() => setErr(project.trim().length < 3 ? 'Project name is required' : '')}
        />
        <AuthTextField
          label="Pitch"
          value={excerpt}
          onChangeText={setExcerpt}
          multiline
          maxLength={280}
          showCount
          placeholder="A co-op racer built in Unity. Prototype is playable, aiming for a demo in 8 weeks."
          hint="Mention the engine, the stage you are at, and the time commitment."
        />
      </FormSection>

      <FormSection
        title="Roles you need"
        right={
          <Text style={[styles.count, { color: roles.length ? colors.cyan : colors.muted2 }]}>
            {roles.length ? `${roles.length} selected` : 'Optional'}
          </Text>
        }
      >
        <ChipPicker
          options={skillOptions}
          selected={roles}
          onToggle={(v) => setRoles((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))}
          allowCustom
        />
        {roles.length === 0 ? (
          <Text style={[styles.note, { color: colors.muted2 }]}>Nothing picked yet, so we will tag your post as Gameplay.</Text>
        ) : null}
      </FormSection>

      <PrimaryButton label="Publish request" onPress={submit} disabled={!valid} />
      <Pressable onPress={() => nav.goBack()} style={[styles.cancel, { borderColor: colors.border }]} accessibilityRole="button">
        <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed }}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blurb: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 18, paddingHorizontal: 4 },
  count: { fontFamily: fonts.mono, fontSize: 11 },
  note: { fontFamily: fonts.body, fontSize: 12, marginTop: 12 },
  cancel: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
