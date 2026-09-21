import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ChipPicker } from '../../../components/inputs/ChipPicker';
import { COMMUNITY_TAGS } from '../../../data/communityTags';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { GuidelinesSheet } from '../../../components/feedback/GuidelinesSheet';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useCommunitiesStore } from '../../../store/communitiesStore';
import { useChatStore } from '../../../store/chatStore';
import { useUiStore } from '../../../store/uiStore';
import { uploadImage } from '../../../services/supabase/storage';
import type { MainStackParamList } from '../../../navigation/types';
import { fonts, useTheme } from '../../../theme';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

export function CommunityDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'CommunityDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const community = useCommunitiesStore((s) => s.communities.find((c) => c.id === params.id));
  const fetchCommunities = useCommunitiesStore((s) => s.fetchCommunities);
  const rooms = useChatStore((s) => s.rooms);
  const fetchRooms = useChatStore((s) => s.fetchRooms);
  const joinCommunity = useCommunitiesStore((s) => s.joinCommunity);
  const updateCommunity = useCommunitiesStore((s) => s.updateCommunity);
  const deleteCommunity = useCommunitiesStore((s) => s.deleteCommunity);
  const joinRoom = useChatStore((s) => s.joinRoom);
  const createRoom = useChatStore((s) => s.createRoom);
  const room = rooms.find((r) => r.communityId === params.id);

  const [joinErr, setJoinErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const seenGuidelines = useUiStore((s) => s.seenGuidelines);
  const markGuidelinesSeen = useUiStore((s) => s.markGuidelinesSeen);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editLocation, setEditLocation] = useState('');
  const [editLogoUri, setEditLogoUri] = useState<string | undefined>();
  const [editLogoChanged, setEditLogoChanged] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user && rooms.length === 0) fetchRooms(user.id);
  }, [user, rooms.length, fetchRooms]);

  const refreshControl = useRefreshControl(async () => {
    if (!user) return;
    await Promise.all([fetchCommunities(user.id), fetchRooms(user.id)]);
  });

  if (!community) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CyberBackground showArtwork={false} />
        <View style={[styles.innerContent, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Community not found.</Text>
          <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isOwnCommunity = !!user && community.createdBy === user.id;

  const startEditing = () => {
    setEditName(community.name);
    setEditDescription(community.description);
    setEditTags(community.tags ?? []);
    setEditLocation(community.location ?? '');
    setEditLogoUri(community.logoUrl);
    setEditLogoChanged(false);
    setEditErr('');
    setEditing(true);
  };

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setEditLogoUri(res.assets[0].uri);
      setEditLogoChanged(true);
    }
  };

  const saveEdit = async () => {
    if (!user || editName.trim().length < 2) {
      setEditErr('Name is required (minimum 2 characters)');
      return;
    }
    setEditSaving(true);
    setEditErr('');
    try {
      const logoUrl = editLogoChanged && editLogoUri ? await uploadImage('community-logos', user.id, editLogoUri) : undefined;
      await updateCommunity(community.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        location: editLocation.trim() || undefined,
        tags: editTags,
        ...(logoUrl ? { logoUrl } : {}),
      });
      setEditing(false);
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteCommunity = async () => {
    setDeleting(true);
    try {
      await deleteCommunity(community.id);
      setDeleteConfirm(false);
      nav.goBack();
    } catch {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${community.name} (${community.shortName}) on Reapers! ${community.description}`,
      });
    } catch {}
  };

  const doOpenRoom = async () => {
    if (!user) return;
    setJoining(true);
    setJoinErr('');
    try {
      if (!community.joined) await joinCommunity(user.id, community.id);
      if (room && !room.joined) await joinRoom(user.id, room.id);
      let roomId = room?.id;
      if (!roomId) {
        roomId = await createRoom(user.id, {
          name: community.name,
          description: community.description,
          tag: community.shortName,
          kind: 'room',
          isPrivate: false,
          communityId: community.id,
        });
      }
      nav.navigate('ChatDetail', { id: roomId });
    } catch (err) {
      setJoinErr(err instanceof Error ? err.message : 'Could not join — try again.');
    } finally {
      setJoining(false);
    }
  };

  const openRoom = () => {
    if (!community.joined && !seenGuidelines[community.id]) {
      setShowGuidelines(true);
      return;
    }
    doOpenRoom();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.headerBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.headerCutBox}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{community.shortName}</Text>

        <View style={styles.headerRightRow}>
          <Pressable onPress={handleShare} style={styles.headerBtn} accessibilityRole="button">
            <CyberCutBox
              cutSize={8}
              radius={4}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.headerCutBox}
            >
              <Ionicons name="share-social-outline" size={17} color={colors.text} />
            </CyberCutBox>
          </Pressable>

          {isOwnCommunity && (
            <Pressable onPress={startEditing} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Edit community">
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={0.88}
                style={styles.headerCutBox}
              >
                <Ionicons name="create-outline" size={17} color={colors.text} />
              </CyberCutBox>
            </Pressable>
          )}

          {isOwnCommunity && (
            <Pressable onPress={() => setDeleteConfirm(true)} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Delete community">
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={0.88}
                style={styles.headerCutBox}
              >
                <Ionicons name="trash-outline" size={17} color="#FF4D6D" />
              </CyberCutBox>
            </Pressable>
          )}
        </View>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {editing ? (
          <View style={styles.editCard}>
            <Text style={[styles.sectionTitleText, { color: colors.text }]}>Edit Community</Text>

            <Pressable onPress={pickLogo} style={styles.editLogoWrap} accessibilityRole="button">
              <CyberCutBox cutSize={12} radius={8} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.editLogoCutBox}>
                {editLogoUri ? (
                  <Image source={{ uri: editLogoUri }} style={styles.logoImg} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={22} color={colors.electricAccent} />
                  </View>
                )}
              </CyberCutBox>
            </Pressable>

            <AuthTextField label="Name" value={editName} onChangeText={setEditName} maxLength={80} />
            <AuthTextField label="Description" value={editDescription} onChangeText={setEditDescription} multiline maxLength={300} />
            <Text style={[styles.metaText, { color: colors.muted, marginTop: 4, marginBottom: 6 }]}>TAGS</Text>
            <ChipPicker
              options={COMMUNITY_TAGS}
              selected={editTags}
              allowCustom
              onToggle={(v) =>
                setEditTags((p) => {
                  const t = v.toUpperCase();
                  return p.includes(t) ? p.filter((x) => x !== t) : [...p, t];
                })
              }
            />
            <AuthTextField label="Location" value={editLocation} onChangeText={setEditLocation} />

            {editErr ? <InlineErrorText message={editErr} /> : null}

            <View style={styles.editBtnRow}>
              <PrimaryButton label="Save" onPress={saveEdit} loading={editSaving} disabled={editSaving || editName.trim().length < 2} style={{ flex: 1 }} />
              <Pressable onPress={() => setEditing(false)} style={styles.cancelBtn} accessibilityRole="button">
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <CyberCutBox
            cutSize={16}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={1}
            style={styles.logoCutBox}
          >
            <Image source={community.logo} style={styles.logoImg} accessibilityIgnoresInvertColors />
          </CyberCutBox>

          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>{community.shortName.toUpperCase()}</Text>
          </View>

          <Text style={[styles.communityTitle, { color: colors.text }]}>{community.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <View style={styles.liveDot} />
              <Text style={[styles.metaText, { color: colors.muted }]}>{community.memberCount.toLocaleString()} MEMBERS</Text>
            </View>
            {community.location ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.muted }]}>{community.location.toUpperCase()}</Text>
                </View>
              </>
            ) : null}
          </View>

          <Text style={[styles.descriptionText, { color: colors.text }]}>{community.description}</Text>

          {(community.tags ?? []).length > 0 ? (
            <View style={styles.tagsWrap}>
              {community.tags.map((t) => (
                <View key={t} style={[styles.userTagPill, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.userTagPillText, { color: colors.primary }]}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* MAIN CTA BUTTON */}
          <Pressable
            onPress={openRoom}
            disabled={joining}
            style={styles.ctaWrapper}
            accessibilityRole="button"
          >
            <CyberCutBox gradient cutSize={10} radius={6} style={styles.ctaCutBox}>
              <View style={styles.ctaInner}>
                <Ionicons
                  name={community.joined ? 'chatbubbles-outline' : 'person-add-outline'}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.ctaText}>
                  {joining
                    ? 'CONNECTING...'
                    : community.joined
                    ? 'OPEN CHATROOM'
                    : 'JOIN COMMUNITY'}
                </Text>
              </View>
            </CyberCutBox>
          </Pressable>

          {!community.joined && (
            <Text style={[styles.hintText, { color: colors.muted2 }]}>
              Joining adds you to the official {community.shortName} chatroom and member directory.
            </Text>
          )}
        </View>

        {joinErr ? (
          <View style={styles.errBox}>
            <InlineErrorText message={joinErr} />
          </View>
        ) : null}

        {/* LOGISTICS / COMMUNITY INFO CARD */}
        <CyberCutBox
          cutSize={14}
          radius={8}
          fill={colors.cardFill}
          borderColor={colors.cardBorder}
          borderWidth={0.88}
          style={styles.infoCardBox}
        >
          <View style={styles.infoCardInner}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="people-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.muted2 }]}>MEMBERSHIP</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>Open Community · Free Access</Text>
              </View>
            </View>

            <View style={[styles.infoRow, styles.infoBorder, { borderTopColor: colors.cardBorder }]}>
              <View style={[styles.infoIconBox, { backgroundColor: 'rgba(109, 53, 255, 0.15)' }]}>
                <Ionicons name="location-outline" size={17} color="#6D35FF" />
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.muted2 }]}>REGION</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{community.location || 'Global / Remote'}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, styles.infoBorder, { borderTopColor: colors.cardBorder }]}>
              <View style={[styles.infoIconBox, { backgroundColor: 'rgba(216, 60, 255, 0.15)' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color="#D83CFF" />
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: colors.muted2 }]}>OFFICIAL CHATROOM</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {room ? `#${room.name}` : `#${community.shortName}-lounge`}
                </Text>
              </View>
            </View>
          </View>
        </CyberCutBox>

        {/* COMMUNITY HUB SECTION */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={[styles.sectionTitleText, { color: colors.text }]}>COMMUNITY HUB</Text>
          <View style={styles.accentLineContainer}>
            <LinearGradient
              colors={['#00E5FF', '#D83CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />
          </View>
        </View>

        {/* COMMUNITY HUB TILES */}
        <View style={styles.hubGrid}>
          <Pressable onPress={openRoom} style={styles.hubTileBtn} accessibilityRole="button">
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.hubTileCutBox}
            >
              <View style={styles.hubTileInner}>
                <Ionicons name="chatbubbles" size={22} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.hubTileTitle, { color: colors.text }]}>Chatroom</Text>
                <Text style={[styles.hubTileSub, { color: colors.muted }]}>Live discussion</Text>
              </View>
            </CyberCutBox>
          </Pressable>

          <View style={styles.hubTileBtn}>
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.hubTileCutBox}
            >
              <View style={styles.hubTileInner}>
                <Ionicons name="calendar" size={22} color="#D83CFF" style={{ marginBottom: 6 }} />
                <Text style={[styles.hubTileTitle, { color: colors.text }]}>Events</Text>
                <Text style={[styles.hubTileSub, { color: colors.muted }]}>Meetups & LANs</Text>
              </View>
            </CyberCutBox>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <ConfirmSheet
        visible={deleteConfirm}
        title="Delete this community?"
        body={
          community.memberCount > 1
            ? `This will remove ${community.memberCount - 1} other member${community.memberCount - 1 === 1 ? '' : 's'} from the community. Its chatroom will remain but no longer be linked to it. This can't be undone.`
            : "This can't be undone."
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={confirmDeleteCommunity}
      />

      <GuidelinesSheet
        visible={showGuidelines}
        onAccept={() => {
          markGuidelinesSeen(community.id);
          setShowGuidelines(false);
          doOpenRoom();
        }}
        onClose={() => setShowGuidelines(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  userTagPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1 },
  userTagPillText: { fontFamily: fonts.mono, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5 },
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  innerContent: {
    width: '100%',
    paddingHorizontal: 16,
  },
  notFoundText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: '#E2E8F0',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
  },
  headerCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editCard: {
    marginBottom: 20,
    gap: 4,
  },
  editLogoWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  editLogoCutBox: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  editBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: '#8E9BB5',
  },
  logoCutBox: {
    width: 100,
    height: 100,
    marginBottom: 14,
    overflow: 'hidden',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  tagPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.16)',
    borderColor: 'rgba(0, 229, 255, 0.45)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  tagPillText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#00E5FF',
  },
  communityTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3DDC84',
  },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#8E9BB5',
  },
  metaDot: {
    color: '#8E9BB5',
    fontSize: 12,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  ctaWrapper: {
    width: '100%',
    height: 48,
  },
  ctaCutBox: {
    width: '100%',
    height: '100%',
  },
  ctaInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: '#8E9BB5',
    textAlign: 'center',
    marginTop: 10,
  },
  errBox: {
    marginBottom: 14,
  },
  infoCardBox: {
    width: '100%',
    marginBottom: 20,
  },
  infoCardInner: {
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  infoBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  infoValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  sectionHeaderWrap: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  sectionTitleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  accentLineContainer: {
    marginTop: 4,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  accentLine: {
    width: 36,
    height: 2,
    borderRadius: 1,
  },
  hubGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  hubTileBtn: {
    flex: 1,
    height: 84,
  },
  hubTileCutBox: {
    width: '100%',
    height: '100%',
  },
  hubTileInner: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  hubTileTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hubTileSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
  },
});
