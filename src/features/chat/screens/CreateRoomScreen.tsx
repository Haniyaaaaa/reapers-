import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { FormDivider, FormSection } from '../../../components/layout/FormSection';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { useAuth } from '../../../hooks/useAuth';
import { useChatStore } from '../../../store/chatStore';
import { uploadImage } from '../../../services/supabase/storage';
import { fonts, radius, useTheme } from '../../../theme';

const TAG_IDEAS = ['Valorant', 'Dev', 'Jam', 'Art', 'Esports', 'Unity', 'Unreal', 'Music'];

export function CreateRoomScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const createRoom = useChatStore((s) => s.createRoom);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const valid = name.trim().length >= 3;

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) setAvatar(res.assets[0]?.uri);
  };

  const submit = async () => {
    if (!valid || !user) {
      setErr('Name is required');
      return;
    }
    setSubmitting(true);
    setSubmitErr('');
    try {
      const avatarUrl = avatar ? await uploadImage('community-logos', user.id, avatar) : undefined;
      const id = await createRoom(user.id, {
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        requiresApproval: !isPrivate && requiresApproval,
        avatar: avatarUrl,
        kind: 'room',
        tag: tag.trim() || 'Dev',
      });
      nav.replace('ChatDetail', { id });
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Create room" onBack={() => nav.goBack()} />

      <Text style={[styles.blurb, { color: colors.muted }]}>A room is a single chat channel for one topic, squad, or game.</Text>

      <FormSection title="Room identity" style={{ paddingBottom: 2 }}>
        <View style={styles.imageRow}>
          <Pressable
            onPress={pick}
            style={[styles.tile, { borderColor: avatar ? colors.magenta : colors.border, backgroundColor: colors.surfaceElevated }]}
            accessibilityRole="button"
            accessibilityLabel={avatar ? 'Change image' : 'Upload image'}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.tileImg} />
            ) : (
              <Ionicons name="camera-outline" size={24} color={colors.muted2} />
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.tileTitle, { color: colors.text }]}>Room image</Text>
            <Text style={[styles.tileHint, { color: colors.muted2 }]}>A square PNG or JPG looks best.</Text>
            <View style={styles.tileActions}>
              <Pressable onPress={pick} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.link, { color: colors.cyan }]}>{avatar ? 'Change' : 'Upload'}</Text>
              </Pressable>
              {avatar ? (
                <Pressable onPress={() => setAvatar(undefined)} hitSlop={8} accessibilityRole="button">
                  <Text style={[styles.link, { color: colors.muted }]}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <FormDivider />

        <AuthTextField
          label="Name"
          value={name}
          onChangeText={setName}
          error={err}
          maxLength={30}
          showCount
          placeholder="valorant-ranked"
          onBlur={() => setErr(name.trim().length < 3 ? 'Name is required' : '')}
        />

        <AuthTextField label="Tag" value={tag} onChangeText={setTag} maxLength={16} placeholder="Dev" />
        <View style={styles.ideas}>
          {TAG_IDEAS.map((t) => {
            const on = tag.trim().toLowerCase() === t.toLowerCase();
            return (
              <Pressable
                key={t}
                onPress={() => setTag(on ? '' : t)}
                style={[
                  styles.idea,
                  { borderColor: colors.border },
                  on && { borderColor: colors.magenta, backgroundColor: colors.magentaDeep },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={{ color: on ? colors.text : colors.muted, fontFamily: fonts.bodyMed, fontSize: 12 }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </FormSection>

      <FormSection title="About" style={{ paddingBottom: 2 }}>
        <AuthTextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={240}
          showCount
          placeholder="What happens in this room?"
        />
      </FormSection>

      <FormSection title="Visibility">
        <View style={styles.toggleRow}>
          <View style={[styles.toggleIcon, { backgroundColor: isPrivate ? colors.magentaDeep : colors.surfaceElevated }]}>
            <Ionicons
              name={isPrivate ? 'lock-closed-outline' : 'earth-outline'}
              size={18}
              color={isPrivate ? colors.magenta : colors.cyan}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>{isPrivate ? 'Private' : 'Public'}</Text>
            <Text style={[styles.toggleSub, { color: colors.muted }]}>
              {isPrivate ? 'Invite only. Hidden from browse and search.' : 'Anyone in Reapers can find and join.'}
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: colors.surfaceElevated, true: colors.magentaDeep }}
            thumbColor={isPrivate ? colors.magenta : colors.muted2}
            ios_backgroundColor={colors.surfaceElevated}
            accessibilityLabel="Private"
          />
        </View>

        {!isPrivate ? (
          <>
            <FormDivider />
            <View style={styles.toggleRow}>
              <View style={[styles.toggleIcon, { backgroundColor: requiresApproval ? colors.magentaDeep : colors.surfaceElevated }]}>
                <Ionicons name="checkmark-done-outline" size={18} color={requiresApproval ? colors.magenta : colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Require approval to join</Text>
                <Text style={[styles.toggleSub, { color: colors.muted }]}>
                  {requiresApproval
                    ? "Tapping Join sends a request you approve or reject."
                    : 'Anyone can tap Join and be in immediately.'}
                </Text>
              </View>
              <Switch
                value={requiresApproval}
                onValueChange={setRequiresApproval}
                trackColor={{ false: colors.surfaceElevated, true: colors.magentaDeep }}
                thumbColor={requiresApproval ? colors.magenta : colors.muted2}
                ios_backgroundColor={colors.surfaceElevated}
                accessibilityLabel="Require approval to join"
              />
            </View>
          </>
        ) : null}
      </FormSection>

      {submitErr ? <InlineErrorText message={submitErr} /> : null}
      <PrimaryButton label="Create room" onPress={submit} loading={submitting} disabled={!valid || submitting} />
      <Pressable onPress={() => nav.goBack()} style={[styles.cancel, { borderColor: colors.border }]} accessibilityRole="button">
        <Text style={{ color: colors.muted, fontFamily: fonts.bodyMed }}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blurb: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 18, paddingHorizontal: 4 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  tile: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileImg: { width: '100%', height: '100%' },
  tileTitle: { fontFamily: fonts.bodySemi, fontSize: 15 },
  tileHint: { fontFamily: fonts.body, fontSize: 12 },
  tileActions: { flexDirection: 'row', gap: 16, marginTop: 2 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13 },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  idea: { paddingHorizontal: 12, minHeight: 32, borderRadius: radius.pill, borderWidth: 1, justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontFamily: fonts.bodySemi, fontSize: 15 },
  toggleSub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  cancel: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
