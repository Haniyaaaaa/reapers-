import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BladeCard } from '../../../components/cards/BladeCard';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAdminStore } from '../../../store/adminStore';
import { fonts, useTheme } from '../../../theme';
import { EXPERTISE_TAGS } from '../../../types/expert';
import type { AdminStackParamList } from '../../../navigation/types';

export function ManualOnboardExpertScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors } = useTheme();
  const manualOnboardExpert = useAdminStore((s) => s.manualOnboardExpert);
  const fetchVerifiedExperts = useAdminStore((s) => s.fetchVerifiedExperts);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const onboard = async () => {
    if (!email.trim() || !username.trim() || !role.trim() || !bio.trim()) {
      setErr('Email, username, role, and bio are required.');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const result = await manualOnboardExpert({
        email: email.trim(),
        username: username.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role: role.trim(),
        company: company.trim() || undefined,
        bio: bio.trim(),
        specialties: tags,
        portfolioUrl: portfolioUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
      });
      setCredentials(result);
      setEmail('');
      setUsername('');
      setFirstName('');
      setLastName('');
      setRole('');
      setCompany('');
      setBio('');
      setPortfolioUrl('');
      setLinkedinUrl('');
      setTags([]);
      fetchVerifiedExperts();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not onboard expert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Manually onboard an expert" onBack={() => nav.goBack()} />
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 16 }}>
        Pre-verified and skips the queue — you're vouching for them directly.
      </Text>
      {credentials ? (
        <BladeCard style={styles.credCard}>
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, marginBottom: 6 }}>Share these once — not stored anywhere:</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.mono }}>{credentials.email}</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.mono }}>{credentials.temporaryPassword}</Text>
        </BladeCard>
      ) : null}
      <AuthTextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <AuthTextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <AuthTextField label="First name" value={firstName} onChangeText={setFirstName} />
      <AuthTextField label="Last name" value={lastName} onChangeText={setLastName} />
      <AuthTextField label="Role" value={role} onChangeText={setRole} placeholder="Senior Gameplay Engineer" />
      <AuthTextField label="Company" value={company} onChangeText={setCompany} placeholder="Studio name" />
      <AuthTextField label="Credentials / bio" value={bio} onChangeText={setBio} multiline />
      <AuthTextField
        label="Website / portfolio"
        value={portfolioUrl}
        onChangeText={setPortfolioUrl}
        placeholder="https://…"
        autoCapitalize="none"
        keyboardType="url"
      />
      <AuthTextField
        label="LinkedIn"
        value={linkedinUrl}
        onChangeText={setLinkedinUrl}
        placeholder="https://linkedin.com/in/…"
        autoCapitalize="none"
        keyboardType="url"
      />
      <ChipPicker options={EXPERTISE_TAGS} selected={tags} onToggle={(v) => setTags((t) => (t.includes(v) ? t.filter((x) => x !== v) : [...t, v]))} />
      {err ? <InlineErrorText message={err} /> : null}
      <PrimaryButton label="Create expert account" onPress={onboard} loading={submitting} disabled={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  credCard: { padding: 14, marginBottom: 12 },
});
