import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { genreOptions } from '../../../data/mock';
import { useAuth } from '../../../hooks/useAuth';
import { useCommunityStore } from '../../../store/communityStore';
import { colors, fonts, radius } from '../../../theme';

export function DemoUploadScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const addDemo = useCommunityStore((s) => s.addDemo);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState<string[]>(['Action']);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [videoErr, setVideoErr] = useState('');
  const [titleErr, setTitleErr] = useState('');
  const [thumb, setThumb] = useState<string | undefined>();

  const applyVideo = (sec: number, uri?: string) => {
    setDuration(sec);
    if (uri) setThumb(uri);
    if (sec < 30) setVideoErr('Demo must be at least 30 seconds');
    else if (sec > 60) {
      setVideoErr('Trim to 30–60 seconds');
      setTrimStart(0);
    } else setVideoErr('');
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (res.canceled) return;
    const asset = res.assets[0];
    applyVideo(Math.round(asset.duration ?? 45), asset.uri);
  };

  const record = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setVideoErr('Camera permission is needed to record');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] });
    if (res.canceled) return;
    const asset = res.assets[0];
    applyVideo(Math.round(asset.duration ?? 45), asset.uri);
  };

  const pickThumb = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!res.canceled) setThumb(res.assets[0]?.uri);
  };

  const upload = async () => {
    if (title.trim().length < 3) {
      setTitleErr('Title is required');
      return;
    }
    const clipped = duration != null && duration > 60 ? 60 : duration;
    if (clipped == null || clipped < 30) {
      setVideoErr('Pick a 30–60s clip');
      return;
    }
    setUploading(true);
    setFailed(false);
    setProgress(0);
    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 120));
      setProgress(i * 10);
    }
    if (title.toLowerCase().includes('fail')) {
      setUploading(false);
      setFailed(true);
      return;
    }
    const id = `d${Date.now()}`;
    addDemo({
      id,
      title: title.trim(),
      genre: genres[0] ?? 'Action',
      description: description.trim() || 'New demo drop.',
      thumbnail: thumb || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
      videoUrl: thumb,
      durationSec: Math.min(60, Math.max(30, clipped - trimStart)),
      developerId: user?.id ?? 'u1',
      developerName: user?.displayName ?? 'You',
      scores: { gameplay: 0, art: 0, concept: 0, polish: 0 },
      reviewCount: 0,
      externalUrl: link.trim() || undefined,
    });
    setUploading(false);
    Alert.alert('Uploaded', 'Your demo is live.');
    nav.replace('DemoDetail', { id });
  };

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Upload demo" onBack={() => nav.goBack()} />
      <PrimaryButton label={duration ? `Video · ${duration}s` : 'Pick video'} onPress={pick} />
      <Pressable onPress={record} style={styles.link} accessibilityRole="button">
        <Text style={styles.linkText}>Record instead</Text>
      </Pressable>
      {duration && duration > 60 ? (
        <>
          <Text style={styles.hint}>Trim start {trimStart}s — using 60 seconds from {trimStart}s.</Text>
          <Pressable onPress={() => setTrimStart((s) => Math.min(Math.max(0, duration - 60), s + 5))} style={styles.link} accessibilityRole="button">
            <Text style={styles.linkText}>Nudge trim +5s</Text>
          </Pressable>
        </>
      ) : null}
      {videoErr ? <InlineErrorText message={videoErr} /> : null}
      <Pressable onPress={pickThumb} style={styles.link} accessibilityRole="button">
        <Text style={styles.linkText}>{thumb ? 'Replace thumbnail' : 'Use custom thumbnail (auto frame ready)'}</Text>
      </Pressable>
      <AuthTextField
        label={`Title (${title.length}/60)`}
        value={title}
        onChangeText={(v) => setTitle(v.slice(0, 60))}
        error={titleErr}
        onBlur={() => setTitleErr(title.trim().length < 3 ? 'Title is required' : '')}
      />
      <AuthTextField label="External link (optional)" value={link} onChangeText={setLink} autoCapitalize="none" />
      <Text style={styles.hint}>Genre — pick one or type your own</Text>
      <ChipPicker options={genreOptions} selected={genres} searchable allowCustom onToggle={(v) => setGenres([v])} />
      <AuthTextField
        label={`Description (${description.length}/240)`}
        value={description}
        onChangeText={(v) => setDescription(v.slice(0, 240))}
        multiline
      />
      {uploading ? (
        <View style={styles.prog}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
      ) : null}
      <Text style={styles.hint}>{uploading ? `${progress}%` : failed ? 'Upload failed' : ''}</Text>
      <PrimaryButton label={failed ? 'Retry upload' : 'Upload'} onPress={upload} loading={uploading} disabled={uploading} />
      {uploading ? (
        <Pressable
          onPress={() => {
            setUploading(false);
            setProgress(0);
          }}
          style={styles.link}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Cancel upload</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginVertical: 8 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.cyan, fontFamily: fonts.bodyMed },
  prog: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden', marginTop: 12 },
  fill: { height: 8, backgroundColor: colors.magenta },
});
