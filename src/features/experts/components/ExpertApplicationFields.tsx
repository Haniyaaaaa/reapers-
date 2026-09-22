import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { EXPERTISE_TAGS } from '../../../types/expert';

export type ExpertApplicationValue = {
  role: string;
  company: string;
  bio: string;
  portfolioUrl: string;
  linkedinUrl: string;
  tags: string[];
  calUsername: string;
  calEventSlug: string;
};

type Props = {
  value: ExpertApplicationValue;
  onChange: (next: ExpertApplicationValue) => void;
  bioError?: string;
  onBioBlur?: () => void;
};

/** Shared form body for "apply to become an Expert" — used by both BecomeExpertScreen
 * (apply/edit after the fact) and OnboardingScreen's Expert step (apply during signup),
 * so the two paths never drift apart. Profile image comes from the onboarding avatar
 * picker / the existing profile avatar — not duplicated here. */
export function ExpertApplicationFields({ value, onChange, bioError, onBioBlur }: Props) {
  const set = <K extends keyof ExpertApplicationValue>(key: K, v: ExpertApplicationValue[K]) => onChange({ ...value, [key]: v });

  return (
    <>
      <AuthTextField label="Role" value={value.role} onChangeText={(v) => set('role', v)} placeholder="Senior Gameplay Engineer" />
      <AuthTextField label="Company" value={value.company} onChangeText={(v) => set('company', v)} placeholder="Studio name" />
      <AuthTextField
        label="Credentials / bio"
        value={value.bio}
        onChangeText={(v) => set('bio', v)}
        error={bioError}
        multiline
        onBlur={onBioBlur}
      />
      <AuthTextField
        label="Website / portfolio"
        value={value.portfolioUrl}
        onChangeText={(v) => set('portfolioUrl', v)}
        placeholder="https://…"
        autoCapitalize="none"
        keyboardType="url"
      />
      <AuthTextField
        label="LinkedIn"
        value={value.linkedinUrl}
        onChangeText={(v) => set('linkedinUrl', v)}
        placeholder="https://linkedin.com/in/…"
        autoCapitalize="none"
        keyboardType="url"
      />
      <AuthTextField
        label="Cal.com username"
        value={value.calUsername}
        onChangeText={(v) => set('calUsername', v)}
        placeholder="e.g. janedoe"
        autoCapitalize="none"
        hint="Optional — links a Cal.com event so a booking's meeting link is generated automatically instead of you adding one by hand each time."
      />
      {value.calUsername.trim() ? (
        <AuthTextField
          label="Cal.com event type"
          value={value.calEventSlug}
          onChangeText={(v) => set('calEventSlug', v)}
          placeholder="e.g. 15min"
          autoCapitalize="none"
          hint="The slug from your Cal.com event link: cal.com/username/THIS-PART"
        />
      ) : null}
      <ChipPicker options={EXPERTISE_TAGS} selected={value.tags} onToggle={(v) => set('tags', value.tags.includes(v) ? value.tags.filter((x) => x !== v) : [...value.tags, v])} />
    </>
  );
}
