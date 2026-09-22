import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useExpertStore } from '../../../store/expertStore';
import { colors, fonts } from '../../../theme';
import { ExpertStatusView } from '../components/ExpertStatusView';
import { ExpertApplicationFields, type ExpertApplicationValue } from '../components/ExpertApplicationFields';

const EMPTY: ExpertApplicationValue = { role: '', company: '', bio: '', portfolioUrl: '', linkedinUrl: '', tags: [], calUsername: '', calEventSlug: '' };

export function BecomeExpertScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const myApplication = useExpertStore((s) => s.myApplication);
  const fetchMyApplication = useExpertStore((s) => s.fetchMyApplication);
  const applyAsExpert = useExpertStore((s) => s.applyAsExpert);
  const updateExpertProfile = useExpertStore((s) => s.updateExpertProfile);
  const [value, setValue] = useState<ExpertApplicationValue>(EMPTY);
  const [bioErr, setBioErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) fetchMyApplication(user.id);
  }, [user, fetchMyApplication]);

  const startEditing = () => {
    if (!myApplication) return;
    setValue({
      role: myApplication.role,
      company: myApplication.company,
      bio: myApplication.bio,
      portfolioUrl: myApplication.portfolio_url ?? '',
      linkedinUrl: myApplication.linkedin_url ?? '',
      tags: myApplication.specialties,
      calUsername: myApplication.cal_username ?? '',
      calEventSlug: myApplication.cal_event_slug ?? '',
    });
    setEditing(true);
  };

  const submit = async () => {
    if (value.bio.trim().length < 12 || !user) {
      setBioErr('Tell us a bit more about your practice');
      return;
    }
    setSubmitting(true);
    setSubmitErr('');
    try {
      const patch = {
        role: value.role.trim() || 'Industry professional',
        company: value.company.trim(),
        bio: value.bio.trim(),
        specialties: value.tags,
        portfolioUrl: value.portfolioUrl.trim(),
        linkedinUrl: value.linkedinUrl.trim(),
        calUsername: value.calUsername.trim(),
        calEventSlug: value.calEventSlug.trim(),
      };
      if (myApplication) {
        await updateExpertProfile(user.id, patch);
        setEditing(false);
      } else {
        await applyAsExpert(user.id, patch);
        nav.goBack();
      }
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  };

  if (myApplication && !editing) {
    return (
      <Screen footerPad={false}>
        <ScreenHeader title={myApplication.verified ? 'Expert profile' : 'Become an Expert'} onBack={() => nav.goBack()} />
        <ExpertStatusView
          application={myApplication}
          onEdit={startEditing}
          onAvailability={() => nav.navigate('ExpertAvailability')}
          onViewPublic={() => nav.navigate('ExpertProfile', { id: myApplication.id })}
        />
      </Screen>
    );
  }

  return (
    <Screen footerPad={false}>
      <ScreenHeader title={myApplication ? 'Edit expert profile' : 'Become an Expert'} onBack={() => (editing ? setEditing(false) : nav.goBack())} />
      {!myApplication ? (
        <Text style={styles.p}>Office hours are 15-minute booked calls. Applications are reviewed by the Reapers team before your profile goes live.</Text>
      ) : null}
      <ExpertApplicationFields
        value={value}
        onChange={setValue}
        bioError={bioErr}
        onBioBlur={() => setBioErr(value.bio.trim().length < 12 ? 'Tell us a bit more about your practice' : '')}
      />
      {submitErr ? <InlineErrorText message={submitErr} /> : null}
      <PrimaryButton label={myApplication ? 'Save changes' : 'Submit application'} onPress={submit} loading={submitting} disabled={submitting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  p: { color: colors.muted, fontFamily: fonts.body, marginBottom: 16 },
});
