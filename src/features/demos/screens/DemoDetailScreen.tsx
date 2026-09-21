import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { DemoVideoPlayer } from '../../../components/media/DemoVideoPlayer';
import { openExternalUrl } from '../../../utils/openUrl';
import { normalizeUrl } from '../../../utils/validation';
import { ImageViewerModal } from '../../../components/media/ImageViewerModal';
import { ScreenshotCarousel } from '../../../components/media/ScreenshotCarousel';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { DEMO_ENGINES, DEMO_GENRES, DEMO_PLATFORMS, DEMO_TAGS, splitGenreEngine } from '../../../data/demoOptions';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRefreshControl } from '../../../hooks/useRefreshControl';
import type { MainStackParamList } from '../../../navigation/types';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { DemoThumb } from '../../../components/media/DemoThumb';
import { AvatarRing } from '../../../components/avatars/AvatarRing';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { CyberButton } from '../../../components/cyber/CyberButton';
import { RubricInput } from '../../../components/inputs/RubricInput';
import { resolveAvatarSourceLoose } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useDemoStore } from '../../../store/demoStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { createVideoPlayer } from 'expo-video';
import { deleteObjectByPublicUrl, uploadDemoScreenshot, uploadDemoThumbnail, uploadDemoVideo } from '../../../services/supabase/storage';
import { fonts, useTheme } from '../../../theme';
import { formatCount, formatDuration, formatTime } from '../../../utils/format';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import { CutAvatar } from '../../../components/avatars/CutAvatar';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function DemoDetailScreen() {
  const route = useRoute<RouteProp<MainStackParamList, 'DemoDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const id = route.params?.id;

  const demo = useDemoStore((s) => s.demos.find((d) => d.id === id));
  const comments = useDemoStore((s) => (id ? s.comments[id] ?? EMPTY_ARRAY : EMPTY_ARRAY));
  const commentsLoading = useDemoStore((s) => (id ? s.commentsLoading[id] ?? false : false));
  const myReview = useDemoStore((s) => (id ? s.myReviews[id] : undefined));
  const reviews = useDemoStore((s) => (id ? s.reviews[id] ?? EMPTY_ARRAY : EMPTY_ARRAY));
  const bookmarked = useDemoStore((s) => (id ? s.bookmarkedIds.has(id) : false));
  const fetchComments = useDemoStore((s) => s.fetchComments);
  const addCommentAction = useDemoStore((s) => s.addComment);
  const fetchMyReview = useDemoStore((s) => s.fetchMyReview);
  const submitReviewAction = useDemoStore((s) => s.submitReview);
  const fetchDemos = useDemoStore((s) => s.fetchDemos);
  const demosLoaded = useDemoStore((s) => s.demos.length > 0 || s.loading);
  const updateDemoAction = useDemoStore((s) => s.updateDemo);
  const deleteDemoAction = useDemoStore((s) => s.deleteDemo);
  const deleteReviewAction = useDemoStore((s) => s.deleteReview);
  const deleteCommentAction = useDemoStore((s) => s.deleteComment);
  const fetchReviews = useDemoStore((s) => s.fetchReviews);
  const voteOnReviewAction = useDemoStore((s) => s.voteOnReview);
  const ensureBookmarksLoaded = useDemoStore((s) => s.ensureBookmarksLoaded);
  const toggleBookmarkAction = useDemoStore((s) => s.toggleBookmark);
  const incrementPlayCount = useDemoStore((s) => s.incrementPlayCount);

  useEffect(() => {
    if (!demosLoaded) fetchDemos();
  }, [demosLoaded, fetchDemos]);

  const [playing, setPlaying] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [text, setText] = useState('');
  const [commentErr, setCommentErr] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editScreenshots, setEditScreenshots] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const hasCountedPlay = useRef(false);

  const [rubric, setRubric] = useState({ gameplay: 0, art: 0, concept: 0, polish: 0 });
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editExternalUrl, setEditExternalUrl] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editEngine, setEditEngine] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPortfolio, setEditPortfolio] = useState('');
  const [editPressKit, setEditPressKit] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteReviewConfirm, setDeleteReviewConfirm] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchComments(id);
    fetchReviews(id, user?.id);
    if (user) {
      fetchMyReview(id, user.id);
      ensureBookmarksLoaded(user.id);
    }
  }, [id, user, fetchComments, fetchMyReview, fetchReviews, ensureBookmarksLoaded]);

  const refreshControl = useRefreshControl(async () => {
    if (!id) return;
    await Promise.all([
      fetchDemos(),
      fetchComments(id),
      fetchReviews(id, user?.id),
      user ? fetchMyReview(id, user.id) : Promise.resolve(),
    ]);
  });

  useEffect(() => {
    if (myReview) {
      setRubric({
        gameplay: myReview.score_gameplay,
        art: myReview.score_art,
        concept: myReview.score_concept,
        polish: myReview.score_polish,
      });
      setReviewComment(myReview.comment);
    }
  }, [myReview]);

  const sorted = useMemo(() => comments, [comments]);

  const [videoBusy, setVideoBusy] = useState(false);
  const [videoErr, setVideoErr] = useState('');

  if (!id || !demo) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <CyberBackground showArtwork={false} />
        <View style={styles.topBackHeader}>
          <Pressable onPress={() => nav.goBack()} style={[styles.iconCircleBtn, { backgroundColor: colors.cardFill, borderColor: colors.cardBorder }]} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </View>
        <EmptyState
          title="This demo could not be opened."
          actionLabel="Go Back"
          onAction={() => nav.goBack()}
        />
      </View>
    );
  }

  const isOwnDemo = user?.id === demo.developerId;
  const rubricComplete = rubric.gameplay > 0 && rubric.art > 0 && rubric.concept > 0 && rubric.polish > 0;

  // Average score calculation
  const scores = demo.scores;
  const avgRating = scores
    ? (scores.gameplay + scores.art + scores.concept + scores.polish) / 4
    : 0;
  const hasReviews = demo.reviewCount > 0;
  const ratingDisplay = avgRating.toFixed(1);
  const starsCount = Math.min(5, Math.max(0, Math.round(avgRating)));
  const sliceBadge = demo.isJamEntry ? 'JAM ENTRY' : 'VERTICAL SLICE';

  const postComment = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setText('');
    setCommentErr('');
    try {
      await addCommentAction(demo.id, user.id, body);
    } catch (err) {
      setText(body);
      setCommentErr(err instanceof Error ? err.message : 'Could not post comment — try again.');
    }
  };

  const { run: runPostComment, pending: postingComment } = useSingleFlight(postComment);

  const startEditing = () => {
    setEditTitle(demo.title);
    setEditDescription(demo.description);
    setEditExternalUrl(demo.externalUrl ?? '');
    const { genre, engine } = splitGenreEngine(demo.genre);
    setEditGenre(genre);
    setEditEngine(engine);
    setEditPlatforms(demo.platforms ?? []);
    setEditTags(demo.tags ?? []);
    setEditPortfolio(demo.portfolioUrl ?? '');
    setEditPressKit(demo.pressKitUrl ?? '');
    setEditScreenshots(demo.screenshotUrls ?? []);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (editTitle.trim().length < 3) return;
    setEditSaving(true);
    try {
      await updateDemoAction(demo.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        externalUrl: normalizeUrl(editExternalUrl) || null,
        screenshotUrls: editScreenshots,
        genre: editEngine ? `${editGenre} · ${editEngine}` : editGenre,
        platforms: editPlatforms,
        tags: editTags,
        portfolioUrl: normalizeUrl(editPortfolio) || null,
        pressKitUrl: normalizeUrl(editPressKit) || null,
      });
      setEditing(false);
    } finally {
      setEditSaving(false);
    }
  };

  const addScreenshot = async () => {
    if (!user || editScreenshots.length >= 5) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setUploadingScreenshot(true);
    try {
      const url = await uploadDemoScreenshot(user.id, demo.id, res.assets[0].uri, editScreenshots.length);
      setEditScreenshots((s) => [...s, url]);
    } catch {
      // Best-effort — a failed screenshot upload just means nothing is added.
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // Adds or replaces the demo's video after the fact — a demo published without one (build
  // link only) previously had no way to ever get a video. Same up-to-1-minute limit as the upload
  // screen (demos_duration_range), committed immediately rather than waiting on "Save".
  const pickDemoVideo = async () => {
    if (!user || videoBusy) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (res.canceled || !res.assets[0]) return;
    await replaceDemoVideo(res.assets[0]);
  };

  // Same "Choose File" fallback the upload screen has — the photo library picker can be empty
  // (no videos in Photos / simulator) while the video still exists in Files/iCloud.
  const pickDemoVideoFromFiles = async () => {
    if (!user || videoBusy) return;
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    await replaceDemoVideo({ uri: res.assets[0].uri });
  };

  const replaceDemoVideo = async (asset: { uri: string; duration?: number | null }) => {
    if (!user) return;
    setVideoErr('');
    setVideoBusy(true);
    let newVideoUrl: string | undefined;
    let newThumbUrl: string | undefined;
    try {
      // ImagePicker duration is in milliseconds; fall back to reading it from the file.
      let sec = asset.duration != null ? asset.duration / 1000 : NaN;
      if (!Number.isFinite(sec)) {
        sec = await new Promise<number>((resolve, reject) => {
          const player = createVideoPlayer(asset.uri);
          const t = setTimeout(() => reject(new Error('Could not read this video.')), 8000);
          const sub = player.addListener('sourceLoad', (p) => {
            clearTimeout(t);
            sub.remove();
            resolve(p.duration);
          });
        });
      }
      sec = Math.round(sec);
      if (sec < 1) throw new Error('Could not read this video — pick a different file.');
      if (sec > 60) throw new Error('Video is too long — must be 1 minute or less.');

      newVideoUrl = await uploadDemoVideo(user.id, `${demo.id}-${Date.now()}`, asset.uri);
      // Always refresh the cover from the new video — keeping the old thumbnail made the demo
      // look like the replace hadn't worked (the cover is what the feed and hero show).
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
        newThumbUrl = await uploadDemoThumbnail(user.id, `${demo.id}-${Date.now()}`, uri);
      } catch {
        // no cover frame — keeps the existing cover
      }
      const oldVideo = demo.videoUrl;
      await updateDemoAction(demo.id, {
        videoUrl: newVideoUrl,
        durationSec: sec,
        ...(newThumbUrl ? { thumbnailUrl: newThumbUrl } : {}),
      });
      if (oldVideo) deleteObjectByPublicUrl('demo-videos', oldVideo).catch(() => undefined);
    } catch (e) {
      if (newVideoUrl) deleteObjectByPublicUrl('demo-videos', newVideoUrl).catch(() => undefined);
      if (newThumbUrl) deleteObjectByPublicUrl('demo-thumbnails', newThumbUrl).catch(() => undefined);
      setVideoErr(e instanceof Error ? e.message : 'Could not upload the video — try again.');
    } finally {
      setVideoBusy(false);
    }
  };

  const removeScreenshot = (url: string) => {
    setEditScreenshots((s) => s.filter((u) => u !== url));
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteDemoAction(demo.id);
      setDeleteConfirm(false);
      nav.goBack();
    } finally {
      setDeleting(false);
    }
  };

  const submitReview = async () => {
    if (!user || !rubricComplete) return;
    setReviewSubmitting(true);
    setReviewError('');
    setReviewSaved(false);
    try {
      await submitReviewAction(demo.id, user.id, rubric, reviewComment.trim());
      setReviewSaved(true);
      setShowReviewForm(false);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${demo.title} on Reapers: ${demo.externalUrl || 'https://reapers.gg'}`,
      });
    } catch {
      // Ignored
    }
  };

  const countPlayOnce = () => {
    if (hasCountedPlay.current) return;
    hasCountedPlay.current = true;
    incrementPlayCount(demo.id);
  };

  const startPlaying = () => {
    countPlayOnce();
    setVideoStarted(true);
    setPlaying(true);
  };

  // The uploaded video is what "Play demo" plays (and it toggles to Pause while running). The
  // external build link is only the action when there's no video — it used to win even when a
  // video existed, so the button never played it. The link is still reachable from the
  // developer card.
  const handlePlayAction = () => {
    if (demo.videoUrl) {
      if (playing) setPlaying(false);
      else startPlaying();
    } else if (demo.externalUrl) {
      countPlayOnce();
      openExternalUrl(demo.externalUrl);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner Area */}
        <View style={styles.heroContainer}>
          {videoStarted && demo.videoUrl ? (
            <View style={styles.videoPlayerWrap}>
              <DemoVideoPlayer uri={demo.videoUrl} playing={playing} onPlayingChange={setPlaying} height={280} />
            </View>
          ) : (
            <View style={styles.heroImageWrap}>
              <DemoThumb uri={demo.thumbnail} style={styles.heroImage} iconSize={56} />

              {/* Scrim Overlay */}
              <LinearGradient
                colors={['rgba(9, 15, 28, 0.65)', 'rgba(9, 15, 28, 0.25)', isDark ? '#090F1C' : colors.background]}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Center Glowing Play Button — only when there is actually a video to play */}
              {demo.videoUrl ? (
              <Pressable
                onPress={startPlaying}
                style={styles.centerPlayBtn}
                accessibilityRole="button"
                accessibilityLabel="Play trailer"
              >
                <LinearGradient
                  colors={['#00F0FF', '#7928CA', '#D83CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerPlayGradient}
                >
                  <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </LinearGradient>
              </Pressable>
              ) : null}

              {/* Badges on Hero Image */}
              <View style={styles.heroBadgesRow}>
                <View style={styles.sliceBadge}>
                  <Text style={styles.sliceBadgeText}>{sliceBadge}</Text>
                </View>
              </View>

              {/* Title at bottom of banner */}
              <View style={styles.heroBottomTitle}>
                <Text style={[styles.heroTitleText, !isDark && { color: colors.text }]}>{demo.title}</Text>
              </View>
            </View>
          )}

          {/* Top Floating Navigation Row */}
          <View style={[styles.topActionRow, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => nav.goBack()}
              style={[styles.iconCircleBtn, { backgroundColor: isDark ? 'rgba(14, 20, 35, 0.75)' : colors.cardFill, borderColor: colors.cardBorder }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>

            <View style={styles.topRightActions}>
              {isOwnDemo ? (
                <>
                  <Pressable
                    onPress={startEditing}
                    style={[styles.iconCircleBtn, { backgroundColor: isDark ? 'rgba(14, 20, 35, 0.75)' : colors.cardFill, borderColor: colors.cardBorder }]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit demo"
                  >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => setDeleteConfirm(true)}
                    style={[styles.iconCircleBtn, { backgroundColor: isDark ? 'rgba(14, 20, 35, 0.75)' : colors.cardFill, borderColor: colors.cardBorder }]}
                    accessibilityRole="button"
                    accessibilityLabel="Delete demo"
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </Pressable>
                </>
              ) : null}

              <Pressable
                onPress={() => user && toggleBookmarkAction(demo.id, user.id)}
                style={[styles.iconCircleBtn, { backgroundColor: isDark ? 'rgba(14, 20, 35, 0.75)' : colors.cardFill, borderColor: colors.cardBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Bookmark demo"
              >
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={bookmarked ? '#D83CFF' : colors.text}
                />
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={[styles.iconCircleBtn, { backgroundColor: isDark ? 'rgba(14, 20, 35, 0.75)' : colors.cardFill, borderColor: colors.cardBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Share demo"
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentWrap}>
          {/* Owner Edit Form */}
          {editing ? (
            <View style={styles.editCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Demo Details</Text>
              <AuthTextField label="Title" value={editTitle} onChangeText={setEditTitle} maxLength={60} />
              <AuthTextField
                label="Description"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                maxLength={240}
              />
              <AuthTextField
                label="External Link"
                value={editExternalUrl}
                onChangeText={setEditExternalUrl}
                autoCapitalize="none"
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <AuthTextField label="Portfolio" value={editPortfolio} onChangeText={setEditPortfolio} autoCapitalize="none" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthTextField label="Press kit" value={editPressKit} onChangeText={setEditPressKit} autoCapitalize="none" />
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Genre</Text>
              <ChipPicker options={DEMO_GENRES} selected={editGenre ? [editGenre] : []} onToggle={setEditGenre} allowCustom />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Engine</Text>
              <ChipPicker options={DEMO_ENGINES} selected={editEngine ? [editEngine] : []} onToggle={setEditEngine} allowCustom />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Platforms</Text>
              <ChipPicker
                options={DEMO_PLATFORMS}
                selected={editPlatforms}
                onToggle={(v) => setEditPlatforms((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
              />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
              <ChipPicker
                options={DEMO_TAGS}
                selected={editTags}
                allowCustom
                onToggle={(v) =>
                  setEditTags((p) => {
                    const t = v.toUpperCase();
                    return p.includes(t) ? p.filter((x) => x !== t) : [...p, t];
                  })
                }
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Demo video</Text>
              <Pressable onPress={pickDemoVideo} disabled={videoBusy} style={styles.videoBtnTouch} accessibilityRole="button">
                <CyberCutBox cutSize={10} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.cancelCut}>
                  <Text style={[styles.cancelBtnText, { color: colors.primary }]}>
                    {videoBusy ? 'Uploading video…' : demo.videoUrl ? 'Replace video (up to 1 min)' : 'Add video (up to 1 min)'}
                  </Text>
                </CyberCutBox>
              </Pressable>
              <Pressable onPress={pickDemoVideoFromFiles} disabled={videoBusy} style={styles.videoBtnTouch} accessibilityRole="button">
                <CyberCutBox cutSize={10} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.cancelCut}>
                  <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Choose from Files</Text>
                </CyberCutBox>
              </Pressable>
              {videoErr ? <InlineErrorText message={videoErr} /> : null}

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Screenshots</Text>
              <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenshotsScroll}>
                {editScreenshots.map((url) => (
                  <View key={url} style={styles.editScreenshotWrap}>
                    <Image source={{ uri: url }} style={styles.screenshotImg} resizeMode="cover" />
                    <Pressable onPress={() => removeScreenshot(url)} style={styles.removeScreenshotBtn} accessibilityRole="button">
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                {editScreenshots.length < 5 ? (
                  <Pressable onPress={addScreenshot} style={styles.addScreenshotBtn} accessibilityRole="button" disabled={uploadingScreenshot}>
                    <Ionicons name={uploadingScreenshot ? 'hourglass-outline' : 'add'} size={22} color={colors.primary} />
                  </Pressable>
                ) : null}
              </KeyboardAwareScrollView>

              <View style={styles.editBtnRow}>
                <CyberButton
                  label="Save"
                  onPress={saveEdit}
                  loading={editSaving}
                  disabled={editSaving || editTitle.trim().length < 3}
                  style={{ flex: 1 }}
                />
                <Pressable onPress={() => setEditing(false)} style={styles.cancelCutTouch} accessibilityRole="button">
                  <CyberCutBox cutSize={10} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.cancelCut}>
                    <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancel</Text>
                  </CyberCutBox>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Developer Identity Card */}
          <CyberCutBox
            cutSize={12}
            radius={6}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.developerCard}
          >
            <View style={styles.developerCardInner}>
              <CutAvatar source={resolveAvatarSourceLoose(demo.developerAvatar)} size={46} cut={12} borderColor={colors.primary} borderWidth={1.5} />

              <View style={styles.devInfoWrap}>
                <Text style={[styles.devTag, { color: colors.primary }]}>DEVELOPER</Text>
                <Text style={[styles.devName, { color: colors.text }]} numberOfLines={1}>
                  {demo.developerName || 'Independent Studio'}
                </Text>
                {demo.externalUrl ? (
                  <View style={styles.devLinksRow}>
                    <Pressable onPress={() => openExternalUrl(demo.externalUrl)}>
                      <Text style={[styles.devLinkText, { color: colors.muted2 }]}>{demo.externalUrl.replace(/^https?:\/\//, '').split('/')[0]}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={() => useProfilePreviewStore.getState().open(demo.developerId)}
                style={styles.profileBtnTouch}
                accessibilityRole="button"
              >
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill="transparent"
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.profileCutBox}
                >
                  <LinearGradient
                    colors={isDark ? ['rgba(0, 240, 255, 0.2)', 'rgba(216, 60, 255, 0.3)'] : ['rgba(14, 165, 233, 0.15)', 'rgba(216, 60, 255, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.profileBtnGradient}
                  >
                    <Text style={[styles.profileBtnText, { color: colors.primary }]}>Profile</Text>
                  </LinearGradient>
                </CyberCutBox>
              </Pressable>
            </View>
          </CyberCutBox>

          {/* Rating Stars & Stats Row */}
          <View style={styles.ratingStatsRow}>
            {hasReviews ? (
              <>
                <Text style={styles.starsText}>{'★'.repeat(starsCount)}</Text>
                <Text style={[styles.ratingScore, { color: colors.text }]}>{ratingDisplay}</Text>
                <Text style={[styles.statDot, { color: colors.muted2 }]}>·</Text>
                <Text style={[styles.statReviews, { color: colors.muted }]}>{demo.reviewCount} REVIEWS</Text>
              </>
            ) : (
              <Text style={[styles.statReviews, { color: colors.muted }]}>No reviews yet</Text>
            )}
            <Text style={[styles.statDot, { color: colors.muted2 }]}>·</Text>
            <Text style={[styles.statPlays, { color: colors.muted }]}>{formatCount(demo.playCount ?? 0)} PLAYS</Text>
          </View>

          {/* Description */}
          <Text style={[styles.descriptionText, { color: colors.text }]}>{demo.description}</Text>

          {/* Chamfered Tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tagPill, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{(demo.genre || 'GENRE').toUpperCase()}</Text>
            </View>
            {[...(demo.platforms ?? []), ...(demo.tags ?? [])].map((t, i) => (
              <View key={`${t}-${i}`} style={[styles.tagPill, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Screenshots Section */}
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Screenshots</Text>
            <LinearGradient
              colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowingLine}
            />
          </View>

          {(demo.screenshotUrls?.length ?? 0) > 0 ? (
            <ScreenshotCarousel urls={demo.screenshotUrls!} onOpen={setViewerIndex} paused={viewerIndex != null} />
          ) : (
            <Text style={[styles.noCommentsText, { color: colors.muted2 }]}>
              {isOwnDemo ? 'No screenshots yet — add some from the edit screen.' : 'No screenshots yet.'}
            </Text>
          )}

          {/* Reviews Section */}
          <View style={styles.sectionHeaderWrap}>
            <View style={styles.reviewsTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
              {!isOwnDemo && user ? (
                <Pressable
                  onPress={() => setShowReviewForm((v) => !v)}
                  style={styles.writeReviewTouch}
                  accessibilityRole="button"
                >
                  <Text style={[styles.writeReviewText, { color: colors.primary }]}>
                    {showReviewForm ? 'Close ✕' : myReview ? 'Edit Review >' : 'Write One >'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <LinearGradient
              colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowingLine}
            />
          </View>

          {/* Review Input Box (Collapsible / Dynamic) */}
          {showReviewForm && !isOwnDemo && user ? (
            <CyberCutBox
              cutSize={12}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.reviewFormBox}
            >
              <View style={styles.reviewFormInner}>
                <Text style={[styles.reviewFormHeader, { color: colors.text }]}>{myReview ? 'Update Your Review' : 'Rate this Demo'}</Text>
                <RubricInput value={rubric} onChange={setRubric} />
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="What stood out about the gameplay, art, or polish?"
                  placeholderTextColor={colors.muted2}
                  multiline
                  style={[styles.reviewCommentInput, { backgroundColor: colors.inputFill, borderColor: colors.inputBorder, color: colors.text }]}
                />
                {reviewError ? <InlineErrorText message={reviewError} /> : null}
                {reviewSaved ? <Text style={[styles.reviewSavedText, { color: colors.primary }]}>Review saved successfully!</Text> : null}
                <CyberButton
                  label={myReview ? 'Update review' : 'Submit review'}
                  onPress={submitReview}
                  loading={reviewSubmitting}
                  disabled={reviewSubmitting || !rubricComplete}
                />
              </View>
            </CyberCutBox>
          ) : null}

          {/* Existing User Review display */}
          {myReview ? (
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.myReviewCard}
            >
              <View style={styles.myReviewInner}>
                <View style={styles.myReviewHeader}>
                  <Text style={[styles.myReviewUser, { color: colors.text }]}>Your Review</Text>
                  <Text style={styles.starsText}>
                    {'★'.repeat(
                      Math.round(
                        (myReview.score_gameplay +
                          myReview.score_art +
                          myReview.score_concept +
                          myReview.score_polish) /
                          4,
                      ),
                    )}
                  </Text>
                </View>
                {myReview.comment ? <Text style={[styles.myReviewBody, { color: colors.muted }]}>{myReview.comment}</Text> : null}
                <Pressable onPress={() => setDeleteReviewConfirm(true)} accessibilityRole="button" style={{ marginTop: 8 }}>
                  <Text style={styles.deleteReviewText}>Delete Review</Text>
                </Pressable>
              </View>
            </CyberCutBox>
          ) : null}

          {/* Other reviewers' reviews — the viewer's own is shown separately above */}
          {reviews
            .filter((r) => r.reviewerId !== user?.id)
            .map((r) => {
              const myVote = r.myVote;
              return (
                <CyberCutBox
                  key={r.id}
                  cutSize={10}
                  radius={6}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={1}
                  style={styles.myReviewCard}
                >
                  <View style={styles.myReviewInner}>
                    <View style={styles.myReviewHeader}>
                      <Pressable onPress={() => useProfilePreviewStore.getState().open(r.reviewerId)} style={styles.reviewerRow}>
                        <AvatarRing name={r.reviewer} size={24} avatarId={r.avatarId} />
                        <Text style={[styles.myReviewUser, { color: colors.text }]}>{r.reviewer}</Text>
                      </Pressable>
                      <Text style={styles.starsText}>
                        {'★'.repeat(Math.round((r.scores.gameplay + r.scores.art + r.scores.concept + r.scores.polish) / 4))}
                      </Text>
                    </View>
                    {r.comment ? <Text style={[styles.myReviewBody, { color: colors.muted }]}>{r.comment}</Text> : null}
                    {user ? (
                      <View style={styles.voteRow}>
                        <Pressable
                          onPress={() => voteOnReviewAction(r.id, demo.id, myVote === 1 ? null : 1, user.id)}
                          style={styles.voteBtn}
                          accessibilityRole="button"
                        >
                          <Ionicons name="arrow-up" size={14} color={myVote === 1 ? colors.primary : colors.muted2} />
                          <Text style={[styles.voteCount, { color: colors.muted }, myVote === 1 && { color: colors.primary }]}>{r.upvotes}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => voteOnReviewAction(r.id, demo.id, myVote === -1 ? null : -1, user.id)}
                          style={styles.voteBtn}
                          accessibilityRole="button"
                        >
                          <Ionicons name="arrow-down" size={14} color={myVote === -1 ? '#FF3B30' : colors.muted2} />
                          <Text style={[styles.voteCount, { color: colors.muted }, myVote === -1 && styles.voteCountActiveDown]}>{r.downvotes}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </CyberCutBox>
              );
            })}

          {reviews.length === 0 && !showReviewForm ? (
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.emptyReviewsBox}
            >
              <View style={styles.emptyReviewsInner}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.muted2} />
                <Text style={[styles.emptyReviewsText, { color: colors.muted }]}>
                  No reviews submitted yet. Be the first to play and review!
                </Text>
              </View>
            </CyberCutBox>
          ) : null}

          {/* Comments Section */}
          <View style={styles.sectionHeaderWrap}>
            <View style={styles.reviewsTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Comments</Text>
              <Text style={[styles.commentCountText, { color: colors.muted }]}>{sorted.length}</Text>
            </View>
            <LinearGradient
              colors={[colors.primary, isDark ? 'rgba(216, 60, 255, 0.6)' : 'rgba(216, 60, 255, 0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowingLine}
            />
          </View>

          {sorted.length === 0 && !commentsLoading ? (
            <Text style={[styles.noCommentsText, { color: colors.muted2 }]}>No comments yet — say how the demo felt.</Text>
          ) : null}

          {sorted.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Pressable onPress={() => useProfilePreviewStore.getState().open(c.userId)}>
                <AvatarRing name={c.userName} size={36} avatarId={c.avatarId} />
              </Pressable>
              <View style={styles.commentBodyWrap}>
                <View style={styles.commentUserRow}>
                  <Text style={[styles.commentUser, { color: colors.text }]}>{c.userName}</Text>
                  <Text style={[styles.commentTime, { color: colors.muted2 }]}>{formatTime(c.createdAt)}</Text>
                  {c.userId === user?.id ? (
                    <Pressable onPress={() => setDeleteCommentId(c.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={14} color={colors.muted2} />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
              </View>
            </View>
          ))}

          {/* Comment Composer */}
          {commentErr ? <InlineErrorText message={commentErr} /> : null}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.composerBox}
            >
              <View style={styles.composerInner}>
                <AvatarRing
                  name={user?.displayName ?? 'You'}
                  size={30}
                  uri={user?.avatarUri}
                  avatarId={user?.avatarId}
                />
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="How did this demo feel?"
                  placeholderTextColor={colors.muted2}
                  style={[styles.composerInput, { color: colors.text }]}
                />
                <Pressable onPress={runPostComment} disabled={postingComment} style={styles.postBtn} accessibilityRole="button" accessibilityState={{ busy: postingComment }}>
                  <Text style={[styles.postBtnText, { color: colors.primary }]}>{postingComment ? 'Posting…' : 'Post'}</Text>
                </Pressable>
              </View>
            </CyberCutBox>
          </KeyboardAvoidingView>
        </View>
      </KeyboardAwareScrollView>

      {/* Docked Sticky Bottom Bar */}
      <View style={[styles.bottomDockedBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
        <Pressable
          onPress={startPlaying}
          disabled={!demo.videoUrl}
          style={[styles.previewBtnTouch, !demo.videoUrl && { opacity: 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel="Preview demo trailer"
        >
          <CyberCutBox
            cutSize={10}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.previewCutBox}
          >
            <View style={styles.previewBtnInner}>
              <Text style={[styles.previewBtnText, { color: colors.text }]}>Preview</Text>
            </View>
          </CyberCutBox>
        </Pressable>

        <Pressable
          onPress={handlePlayAction}
          disabled={!demo.videoUrl && !demo.externalUrl}
          style={[styles.playDockedTouch, !demo.videoUrl && !demo.externalUrl && { opacity: 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel={demo.videoUrl && playing ? 'Pause demo' : 'Play demo'}
        >
          <CyberCutBox
            cutSize={10}
            radius={4}
            fill="transparent"
            borderColor="rgba(0, 240, 255, 0.6)"
            borderWidth={1}
            style={styles.playDockedCutBox}
          >
            <LinearGradient
              colors={['#00F0FF', '#7928CA', '#D83CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.playDockedGradient}
            >
              <Ionicons name={demo.videoUrl && playing ? 'pause' : 'play'} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.playDockedText}>
                {demo.videoUrl && playing ? 'Pause' : `Play demo · ${formatDuration(demo.durationSec)}`}
              </Text>
            </LinearGradient>
          </CyberCutBox>
        </Pressable>
      </View>

      {/* Delete Confirmation Sheet */}
      <ConfirmSheet
        visible={deleteConfirm}
        title="Delete this demo?"
        body="This removes the demo, its reviews, and its comments. This can't be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />

      <ConfirmSheet
        visible={deleteReviewConfirm}
        title="Delete your review?"
        body="This can't be undone."
        confirmLabel={deletingReview ? 'Deleting…' : 'Delete'}
        onClose={() => setDeleteReviewConfirm(false)}
        onConfirm={async () => {
          if (!id || !user) return;
          setDeletingReview(true);
          try {
            await deleteReviewAction(id, user.id);
            setDeleteReviewConfirm(false);
          } finally {
            setDeletingReview(false);
          }
        }}
      />

      <ConfirmSheet
        visible={!!deleteCommentId}
        title="Delete this comment?"
        body="This can't be undone."
        confirmLabel="Delete"
        onClose={() => setDeleteCommentId(null)}
        onConfirm={() => {
          if (id && user && deleteCommentId) deleteCommentAction(id, deleteCommentId, user.id);
          setDeleteCommentId(null);
        }}
      />
      <ImageViewerModal urls={demo.screenshotUrls ?? []} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  scrollContent: {
    paddingTop: 0,
  },
  heroContainer: {
    width: '100%',
    position: 'relative',
  },
  videoPlayerWrap: {
    width: '100%',
    height: 280,
    backgroundColor: '#000000',
  },
  heroImageWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  centerPlayBtn: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    zIndex: 4,
  },
  centerPlayGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  heroBadgesRow: {
    position: 'absolute',
    bottom: 54,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  sliceBadge: {
    backgroundColor: 'rgba(216, 60, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(216, 60, 255, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sliceBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D83CFF',
    letterSpacing: 0.6,
  },
  heroBottomTitle: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 3,
  },
  heroTitleText: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  topActionRow: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 20, 35, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBackHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  developerCard: {
    width: '100%',
    marginBottom: 16,
  },
  developerCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  devAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F0FF',
    overflow: 'hidden',
  },
  devAvatarImg: {
    width: '100%',
    height: '100%',
  },
  devInfoWrap: {
    flex: 1,
  },
  devTag: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  devName: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  devLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devLinkText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
  },
  profileBtnTouch: {
    height: 32,
  },
  profileCutBox: {
    height: 32,
  },
  profileBtnGradient: {
    height: '100%',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  ratingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starsText: {
    color: '#FFB800',
    fontSize: 14,
    letterSpacing: 1,
  },
  ratingScore: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statDot: {
    color: '#60718F',
    fontSize: 12,
  },
  statReviews: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#8E9BB5',
  },
  statPlays: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#8E9BB5',
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: '#A6B4CE',
    lineHeight: 21,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagPill: {
    backgroundColor: 'rgba(109, 53, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(109, 53, 255, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  sectionHeaderWrap: {
    marginBottom: 14,
    marginTop: 8,
  },
  reviewsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  glowingLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  screenshotsScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  screenshotFrame: {
    width: 220,
    height: 125,
    overflow: 'hidden',
  },
  screenshotImg: {
    width: '100%',
    height: '100%',
  },
  writeReviewTouch: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  writeReviewText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#00F0FF',
  },
  reviewFormBox: {
    width: '100%',
    marginBottom: 16,
  },
  reviewFormInner: {
    padding: 16,
    gap: 12,
  },
  reviewFormHeader: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: '#FFFFFF',
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: 'rgba(109, 53, 255, 0.4)',
    borderRadius: 6,
    backgroundColor: 'rgba(9, 15, 28, 0.6)',
    padding: 12,
    color: '#FFFFFF',
    fontFamily: fonts.body,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewSavedText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: '#00F0FF',
  },
  myReviewCard: {
    width: '100%',
    marginBottom: 16,
  },
  myReviewInner: {
    padding: 14,
    gap: 6,
  },
  myReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myReviewUser: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: '#FFFFFF',
  },
  myReviewBody: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#A6B4CE',
    lineHeight: 18,
  },
  deleteReviewText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: '#FF4D6D',
  },
  reviewerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  voteCount: { fontFamily: fonts.mono, fontSize: 12, color: '#8E9BB5' },
  voteCountActive: { color: '#00F0FF' },
  voteCountActiveDown: { color: '#FF3B30' },
  emptyReviewsBox: {
    width: '100%',
    marginBottom: 16,
  },
  emptyReviewsInner: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyReviewsText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#8E9BB5',
    textAlign: 'center',
  },
  commentCountText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: '#8E9BB5',
  },
  noCommentsText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#60718F',
    marginVertical: 12,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  commentBodyWrap: {
    flex: 1,
    gap: 3,
  },
  commentUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUser: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
  commentTime: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: '#60718F',
  },
  commentText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#A6B4CE',
    lineHeight: 18,
  },
  composerBox: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#FFFFFF',
    minHeight: 38,
  },
  postBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postBtnText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#00F0FF',
  },
  editCard: {
    marginBottom: 16,
    gap: 10,
  },
  editScreenshotWrap: { width: 100, height: 70, borderRadius: 6, overflow: 'hidden', position: 'relative' },
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
    width: 100,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelCutTouch: { width: 110, height: 50 },
  videoBtnTouch: { height: 46, marginBottom: 6 },
  cancelCut: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodyMed,
    color: '#8E9BB5',
  },
  bottomDockedBar: {
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
  previewBtnTouch: {
    width: 100,
    height: 44,
  },
  previewCutBox: {
    width: '100%',
    height: 44,
  },
  previewBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  playDockedTouch: {
    flex: 1,
    height: 44,
  },
  playDockedCutBox: {
    width: '100%',
    height: 44,
  },
  playDockedGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDockedText: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
