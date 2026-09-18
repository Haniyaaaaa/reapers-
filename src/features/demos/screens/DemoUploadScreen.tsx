import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { createVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { useAuth } from '../../../hooks/useAuth';
import { useDemoStore } from '../../../store/demoStore';
import { supabase } from '../../../services/supabase/client';
import { deleteObjectByPublicUrl, uploadDemoScreenshot, uploadDemoThumbnail, uploadDemoVideo } from '../../../services/supabase/storage';
import { fonts, useTheme } from '../../../theme';

// Matches the DB's demos_duration_range check constraint (0055 migration) — kept in sync so a
// too-long/too-short video is caught here, before uploading it, instead of failing at the
// final DB insert after the upload already completed.
const MIN_DEMO_DURATION_SEC = 30;
const MAX_DEMO_DURATION_SEC = 120;

const GENRES_LIST = ['Tactics', 'Action RPG', 'FPS', 'Platformer', 'Strategy', 'Puzzle', 'RPG', 'Simulation', 'Horror', 'Adventure'];
const ENGINES_LIST = ['Unity', 'Unreal Engine', 'Godot', 'Custom Engine', 'WebAssembly'];
const PLATFORMS_LIST = ['PC', 'MAC', 'LINUX', 'SWITCH', 'PS5', 'XBOX', 'WEB', 'MOBILE'];
const TAGS_LIST = ['TACTICS', 'SCI-FI', 'TURN-BASED', 'ROGUELIKE', 'CO-OP', 'UNITY'];

export function DemoUploadScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const createDemo = useDemoStore((s) => s.createDemo);

  // Free for everyone until an admin puts demo uploads in a plan (Admin -> Subscriptions);
  // then only subscribers on such a plan can upload. Resolved server-side by
  // effective_limits(), which the demos insert trigger also enforces — this just lets the UI
  // explain it up front instead of failing at the end of an upload.
  const [uploadAllowed, setUploadAllowed] = useState(true);
  useEffect(() => {
    if (!user) return;
    supabase
      .rpc('effective_limits', { uid: user.id })
      .then(({ data }) => setUploadAllowed(data?.[0]?.demo_upload_allowed ?? true));
  }, [user]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [pressKit, setPressKit] = useState('');
  const [genre, setGenre] = useState('Tactics');
  const [engine, setEngine] = useState('Unity');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['PC', 'MAC']);
  const [selectedTags, setSelectedTags] = useState<string[]>(['SCI-FI']);

  // Modals for Genre & Engine selection
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [showEnginePicker, setShowEnginePicker] = useState(false);

  // File & Upload State
  const [duration, setDuration] = useState<number | null>(null);
  const [videoUri, setVideoUri] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState('');
  const [titleErr, setTitleErr] = useState('');
  const [thumb, setThumb] = useState<string | undefined>();
  const [thumbIsCustom, setThumbIsCustom] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [screenshots, setScreenshots] = useState<string[]>([]);

  const addScreenshot = async () => {
    if (screenshots.length >= 5) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setScreenshots((s) => [...s, res.assets[0].uri]);
  };

  const removeScreenshot = (uri: string) => {
    setScreenshots((s) => s.filter((u) => u !== uri));
  };

  const getVideoDurationSec = (uri: string): Promise<number> =>
    new Promise((resolve, reject) => {
      const player = createVideoPlayer(uri);
      const timeout = setTimeout(() => {
        sub.remove();
        reject(new Error('Timed out reading this video'));
      }, 8000);
      const sub = player.addListener('sourceLoad', (payload) => {
        clearTimeout(timeout);
        sub.remove();
        resolve(payload.duration);
      });
    });

  const applyVideo = (sec: number, uri?: string, name?: string) => {
    setDuration(sec);
    setVideoUri(uri);
    setFileName(name ?? 'build_demo.mp4');
    setFailed(null);
    if (sec < MIN_DEMO_DURATION_SEC) {
      setVideoErr(`Video is too short — must be at least ${MIN_DEMO_DURATION_SEC}s.`);
    } else if (sec > MAX_DEMO_DURATION_SEC) {
      setVideoErr(`Video is too long — must be ${MAX_DEMO_DURATION_SEC / 60} minutes or less.`);
    } else {
      setVideoErr('');
    }
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (res.canceled) return;
    const asset = res.assets[0];
    setThumbIsCustom(false);
    setThumb(undefined);
    // ImagePicker reports duration in milliseconds (expo-video's sourceLoad, used for
    // "Choose File", is in seconds) — treating it as seconds read every gallery video as
    // thousands of seconds long and always tripped the max-length error.
    applyVideo(asset.duration != null ? Math.round(asset.duration / 1000) : 45, asset.uri, asset.fileName ?? 'video_build.mp4');
  };

  const pickFromFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setThumbIsCustom(false);
    setThumb(undefined);
    setVideoErr('');
    try {
      const sec = await getVideoDurationSec(asset.uri).catch(() => 45);
      applyVideo(Math.round(sec), asset.uri, asset.name);
    } catch {
      applyVideo(45, asset.uri, asset.name);
    }
  };

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter((x) => x !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const toggleTag = (t: string) => {
    if (selectedTags.includes(t)) {
      setSelectedTags(selectedTags.filter((x) => x !== t));
    } else {
      setSelectedTags([...selectedTags, t]);
    }
  };

  const upload = async () => {
    if (!uploadAllowed) {
      setFailed('Uploading demos requires a plan that includes demo uploads.');
      return;
    }
    if (title.trim().length < 3) {
      setTitleErr('Title is required (at least 3 characters)');
      return;
    }
    setTitleErr('');
    if (duration != null && (duration < MIN_DEMO_DURATION_SEC || duration > MAX_DEMO_DURATION_SEC)) {
      return;
    }

    setUploading(true);
    setFailed(null);
    setUploadProgress(0);
    let videoUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    try {
      const demoKey = `${Date.now()}`;
      if (videoUri) {
        setUploadStage('Uploading build / video…');
        videoUrl = await uploadDemoVideo(user!.id, demoKey, videoUri, setUploadProgress);

        setUploadStage('Preparing thumbnail…');
        if (thumb && thumbIsCustom) {
          thumbnailUrl = await uploadDemoThumbnail(user!.id, demoKey, thumb);
        } else {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
            thumbnailUrl = await uploadDemoThumbnail(user!.id, demoKey, uri);
          } catch {
            // Fallback thumbnail if extraction fails
          }
        }
      }

      let screenshotUrls: string[] = [];
      if (screenshots.length > 0) {
        setUploadStage('Uploading screenshots…');
        screenshotUrls = await Promise.all(screenshots.map((uri, i) => uploadDemoScreenshot(user!.id, demoKey, uri, i)));
      }

      setUploadStage('Saving demo details…');
      const demo = await createDemo({
        developerId: user!.id,
        title: title.trim(),
        genre: `${genre} · ${engine}`,
        description: description.trim() || 'New playable build.',
        thumbnailUrl,
        videoUrl,
        durationSec: duration ?? 45,
        externalUrl: link.trim() || undefined,
        isJamEntry: selectedTags.includes('JAM ENTRY'),
        screenshotUrls,
      });

      setUploading(false);
      Alert.alert('Success', 'Your demo build is now live!');
      nav.replace('DemoDetail', { id: demo.id });
    } catch (err) {
      setUploading(false);
      setFailed(err instanceof Error ? err.message : 'Upload failed');
      if (videoUrl) deleteObjectByPublicUrl('demo-videos', videoUrl).catch(() => undefined);
      if (thumbnailUrl) deleteObjectByPublicUrl('demo-thumbnails', thumbnailUrl).catch(() => undefined);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Screen Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtnTouch} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.backCutBox}
          >
            <View style={styles.backInner}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </View>
          </CyberCutBox>
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Upload demo</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>BUILD · METADATA · LINKS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {!uploadAllowed ? (
          <Pressable onPress={() => nav.navigate('Subscription')} style={styles.proBanner} accessibilityRole="button">
            <LinearGradient
              colors={['rgba(0, 240, 255, 0.15)', 'rgba(216, 60, 255, 0.25)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proBannerGradient}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.proBannerText}>Uploading demos requires a plan — tap to subscribe.</Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* Section 1: BUILD FILE */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>BUILD FILE</Text>
          <Pressable onPress={pickFromFiles} style={styles.buildDropTouch} accessibilityRole="button">
            <CyberCutBox
              cutSize={12}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.buildDropCutBox}
            >
              <View style={styles.buildDropInner}>
                <LinearGradient
                  colors={['#00F0FF', '#7928CA', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cloudIconGradient}
                >
                  <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                </LinearGradient>

                <Text style={[styles.dropTitleText, { color: colors.text }]}>
                  {fileName ? `File: ${fileName}` : 'Drop your build or browse'}
                </Text>
                <Text style={[styles.dropSubtext, { color: colors.muted }]}>
                  {duration ? `Video length: ${duration}s · Pick another file` : 'ZIP · WEBGL · APK · MAX 4 GB'}
                </Text>

                <View style={styles.fileSourceBtnsRow}>
                  <Pressable onPress={pick} style={styles.subSourceBtn}>
                    <Text style={[styles.subSourceText, { color: colors.primary }]}>Photos Library</Text>
                  </Pressable>
                  <Pressable onPress={pickFromFiles} style={styles.subSourceBtn}>
                    <Text style={[styles.subSourceText, { color: colors.primary }]}>Choose File</Text>
                  </Pressable>
                </View>
              </View>
            </CyberCutBox>
          </Pressable>
          {videoErr ? <InlineErrorText message={videoErr} /> : null}
        </View>

        {/* Section 2: DEMO TITLE */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              DEMO TITLE <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Text style={[styles.counterText, { color: colors.muted2 }]}>{title.length}/60</Text>
          </View>
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.inputFill}
            borderColor={titleErr ? '#FF3B30' : colors.inputBorder}
            borderWidth={1}
            style={styles.inputCutBox}
          >
            <TextInput
              value={title}
              onChangeText={(v) => setTitle(v.slice(0, 60))}
              placeholder="e.g. Salvage Run"
              placeholderTextColor={colors.muted2}
              style={[styles.textInput, { color: colors.text }]}
            />
          </CyberCutBox>
          {titleErr ? <InlineErrorText message={titleErr} /> : null}
        </View>

        {/* Section 3: DESCRIPTION */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              DESCRIPTION <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Text style={[styles.hintTagText, { color: colors.muted2 }]}>Shown on cards</Text>
          </View>
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.inputFill}
            borderColor={colors.inputBorder}
            borderWidth={1}
            style={styles.textareaCutBox}
          >
            <TextInput
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, 240))}
              placeholder="A tactics game about a salvage crew who keep taking the jobs nobody insures."
              placeholderTextColor={colors.muted2}
              multiline
              style={[styles.textareaInput, { color: colors.text }]}
            />
          </CyberCutBox>
        </View>

        {/* Section 4: GENRE & ENGINE (2 Column Row) */}
        <View style={styles.twoColumnRow}>
          {/* Genre Column */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              GENRE <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Pressable onPress={() => setShowGenrePicker(true)} accessibilityRole="button">
              <CyberCutBox
                cutSize={10}
                radius={6}
                fill={colors.inputFill}
                borderColor={colors.inputBorder}
                borderWidth={1}
                style={styles.selectCutBox}
              >
                <View style={styles.selectInner}>
                  <Text style={[styles.selectValueText, { color: colors.text }]}>{genre}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </View>
              </CyberCutBox>
            </Pressable>
          </View>

          {/* Engine Column */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              ENGINE <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Pressable onPress={() => setShowEnginePicker(true)} accessibilityRole="button">
              <CyberCutBox
                cutSize={10}
                radius={6}
                fill={colors.inputFill}
                borderColor={colors.inputBorder}
                borderWidth={1}
                style={styles.selectCutBox}
              >
                <View style={styles.selectInner}>
                  <Text style={[styles.selectValueText, { color: colors.text }]}>{engine}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </View>
              </CyberCutBox>
            </Pressable>
          </View>
        </View>

        {/* Section 5: PLATFORMS */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>PLATFORMS</Text>
            <Text style={[styles.counterText, { color: colors.muted2 }]}>{selectedPlatforms.length} selected</Text>
          </View>
          <View style={styles.pillsWrap}>
            {PLATFORMS_LIST.map((p) => {
              const active = selectedPlatforms.includes(p);
              return (
                <Pressable key={p} onPress={() => togglePlatform(p)} accessibilityRole="button">
                  {active ? (
                    <LinearGradient
                      colors={['#00F0FF', '#7928CA', '#D83CFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activePillGradient}
                    >
                      <Text style={styles.activePillText}>{p}</Text>
                    </LinearGradient>
                  ) : (
                    <CyberCutBox
                      cutSize={6}
                      radius={4}
                      fill={colors.cardBorder}
                      borderColor={colors.cardBorder}
                      borderWidth={1}
                      style={styles.inactivePillCut}
                    >
                      <View style={styles.inactivePillInner}>
                        <Text style={[styles.inactivePillText, { color: colors.muted }]}>{p}</Text>
                      </View>
                    </CyberCutBox>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 6: TAGS */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>TAGS</Text>
            <Text style={[styles.counterText, { color: colors.muted2 }]}>{selectedTags.length} selected</Text>
          </View>
          <View style={styles.pillsWrap}>
            {TAGS_LIST.map((t) => {
              const active = selectedTags.includes(t);
              return (
                <Pressable key={t} onPress={() => toggleTag(t)} accessibilityRole="button">
                  {active ? (
                    <LinearGradient
                      colors={['#00F0FF', '#7928CA', '#D83CFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activePillGradient}
                    >
                      <Text style={styles.activePillText}>✓ {t}</Text>
                    </LinearGradient>
                  ) : (
                    <CyberCutBox
                      cutSize={6}
                      radius={4}
                      fill={colors.cardBorder}
                      borderColor={colors.cardBorder}
                      borderWidth={1}
                      style={styles.inactivePillCut}
                    >
                      <View style={styles.inactivePillInner}>
                        <Text style={[styles.inactivePillText, { color: colors.muted }]}>{t}</Text>
                      </View>
                    </CyberCutBox>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 7: DEMO LINK */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            DEMO LINK <Text style={styles.requiredStar}>*</Text>
          </Text>
          <CyberCutBox
            cutSize={10}
            radius={6}
            fill={colors.inputFill}
            borderColor={colors.inputBorder}
            borderWidth={1}
            style={styles.inputCutBox}
          >
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="salvagerun.itch.io/vertical-slice"
              placeholderTextColor={colors.muted2}
              autoCapitalize="none"
              style={[styles.textInput, { color: colors.text }]}
            />
          </CyberCutBox>
        </View>

        {/* Section 8: PORTFOLIO & PRESS KIT (2 Column Row) */}
        <View style={styles.twoColumnRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>PORTFOLIO</Text>
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.inputFill}
              borderColor={colors.inputBorder}
              borderWidth={1}
              style={styles.inputCutBox}
            >
              <TextInput
                value={portfolio}
                onChangeText={setPortfolio}
                placeholder="kaimercer.dev"
                placeholderTextColor={colors.muted2}
                autoCapitalize="none"
                style={[styles.textInput, { color: colors.text }]}
              />
            </CyberCutBox>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>PRESS KIT</Text>
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.inputFill}
              borderColor={colors.inputBorder}
              borderWidth={1}
              style={styles.inputCutBox}
            >
              <TextInput
                value={pressKit}
                onChangeText={setPressKit}
                placeholder="optional"
                placeholderTextColor={colors.muted2}
                autoCapitalize="none"
                style={[styles.textInput, { color: colors.text }]}
              />
            </CyberCutBox>
          </View>
        </View>

        {/* Section 8.5: SCREENSHOTS */}
        <View style={styles.fieldSection}>
          <View style={styles.labelRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>SCREENSHOTS</Text>
            <Text style={[styles.counterText, { color: colors.muted2 }]}>{screenshots.length}/5</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenshotsRow}>
            {screenshots.map((uri) => (
              <View key={uri} style={styles.screenshotThumbWrap}>
                <Image source={{ uri }} style={styles.screenshotThumbImg} resizeMode="cover" />
                <Pressable onPress={() => removeScreenshot(uri)} style={styles.removeScreenshotBtn} accessibilityRole="button">
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {screenshots.length < 5 ? (
              <Pressable onPress={addScreenshot} style={[styles.addScreenshotBtn, { borderColor: colors.cardBorder }]} accessibilityRole="button">
                <Ionicons name="add" size={22} color={colors.primary} />
              </Pressable>
            ) : null}
          </ScrollView>
        </View>

        {/* Upload Progress & Errors */}
        {uploading ? (
          <View style={styles.uploadingBox}>
            <Text style={[styles.uploadStageText, { color: colors.primary }]}>
              {uploadStage}
              {uploadStage.includes('video') ? ` ${Math.round(uploadProgress * 100)}%` : ''}
            </Text>
            <View style={[styles.progressBg, { backgroundColor: colors.cardBorder }]}>
              <View style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
            </View>
          </View>
        ) : null}

        {failed ? <InlineErrorText message={failed} /> : null}
      </ScrollView>

      {/* Section 9: Sticky Bottom Action Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.draftBtnTouch} accessibilityRole="button">
          <CyberCutBox
            cutSize={10}
            radius={4}
            fill={colors.cardBorder}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.draftCutBox}
          >
            <View style={styles.draftBtnInner}>
              <Text style={[styles.draftBtnText, { color: colors.text }]}>Draft</Text>
            </View>
          </CyberCutBox>
        </Pressable>

        <Pressable
          onPress={upload}
          disabled={uploading || !uploadAllowed}
          style={styles.finishBtnTouch}
          accessibilityRole="button"
        >
          <CyberCutBox
            cutSize={10}
            radius={4}
            gradient
            style={styles.finishCutBox}
          >
            <View style={styles.finishInner}>
              <Text style={styles.finishBtnText}>
                {uploading ? 'Uploading…' : 'Finish Upload'}
              </Text>
            </View>
          </CyberCutBox>
        </Pressable>
      </View>

      {/* Genre Selection Modal */}
      <Modal visible={showGenrePicker} transparent animationType="fade">
        <Pressable onPress={() => setShowGenrePicker(false)} style={styles.modalOverlay}>
          <CyberCutBox
            cutSize={12}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Genre</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {GENRES_LIST.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => {
                    setGenre(g);
                    setShowGenrePicker(false);
                  }}
                  style={styles.modalOptionRow}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, genre === g && { color: colors.primary, fontWeight: '700' }]}>
                    {g}
                  </Text>
                  {genre === g ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </CyberCutBox>
        </Pressable>
      </Modal>

      {/* Engine Selection Modal */}
      <Modal visible={showEnginePicker} transparent animationType="fade">
        <Pressable onPress={() => setShowEnginePicker(false)} style={styles.modalOverlay}>
          <CyberCutBox
            cutSize={12}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.modalContent}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Engine</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {ENGINES_LIST.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    setEngine(e);
                    setShowEnginePicker(false);
                  }}
                  style={styles.modalOptionRow}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, engine === e && { color: colors.primary, fontWeight: '700' }]}>
                    {e}
                  </Text>
                  {engine === e ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </CyberCutBox>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtnTouch: {
    width: 38,
    height: 38,
  },
  backCutBox: {
    width: 38,
    height: 38,
  },
  backInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    gap: 2,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  proBanner: { borderRadius: 6, overflow: 'hidden' },
  proBannerGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  proBannerText: { fontFamily: fonts.bodyMed, fontSize: 12, color: '#00F0FF' },
  fieldSection: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#8E9BB5',
    letterSpacing: 0.8,
  },
  requiredStar: {
    color: '#D83CFF',
  },
  counterText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#60718F',
  },
  hintTagText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#60718F',
  },
  buildDropTouch: {
    width: '100%',
  },
  buildDropCutBox: {
    width: '100%',
  },
  buildDropInner: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  cloudIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dropTitleText: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dropSubtext: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#8E9BB5',
    letterSpacing: 0.5,
  },
  fileSourceBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  subSourceBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subSourceText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#00F0FF',
  },
  inputCutBox: {
    width: '100%',
    height: 44,
  },
  textInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: '100%',
  },
  textareaCutBox: {
    width: '100%',
    height: 90,
  },
  textareaInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: '100%',
    textAlignVertical: 'top',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectCutBox: {
    width: '100%',
    height: 44,
    marginTop: 6,
  },
  selectInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: '100%',
  },
  selectValueText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  activePillGradient: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  inactivePillCut: {
    height: 32,
  },
  inactivePillInner: {
    height: '100%',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactivePillText: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: '#8E9BB5',
    letterSpacing: 0.5,
  },
  screenshotsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  screenshotThumbWrap: { width: 90, height: 60, borderRadius: 6, overflow: 'hidden', position: 'relative' },
  screenshotThumbImg: { width: '100%', height: '100%' },
  removeScreenshotBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addScreenshotBtn: {
    width: 90,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingBox: {
    gap: 6,
    marginVertical: 4,
  },
  uploadStageText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#00F0FF',
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#00F0FF',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 15, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(109, 53, 255, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  draftBtnTouch: {
    width: 100,
    height: 44,
  },
  draftCutBox: {
    width: '100%',
    height: 44,
  },
  draftBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  finishBtnTouch: {
    flex: 1,
    height: 44,
  },
  finishCutBox: {
    width: '100%',
    height: 44,
  },
  finishInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    padding: 16,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalOptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#A6B4CE',
  },
});
