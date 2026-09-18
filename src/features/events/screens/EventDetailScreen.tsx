import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EventPassCard } from '../../../components/events/EventPassCard';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { useAuth } from '../../../hooks/useAuth';
import { useEventStore } from '../../../store/eventStore';
import { uploadPaymentProof } from '../../../services/supabase/storage';
import type { MainStackParamList } from '../../../navigation/types';
import { EMPTY_ARRAY } from '../../../utils/emptyArray';
import { fonts, useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 430);

export function EventDetailScreen() {
  const { params } = useRoute<RouteProp<MainStackParamList, 'EventDetail'>>();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const events = useEventStore((s) => s.events);
  const fetchEvents = useEventStore((s) => s.fetchEvents);
  const setRsvp = useEventStore((s) => s.setRsvp);
  const attendees = useEventStore((s) => (params?.id ? s.attendees[params.id] ?? EMPTY_ARRAY : EMPTY_ARRAY));
  const fetchAttendees = useEventStore((s) => s.fetchAttendees);
  const payoutAccounts = useEventStore((s) => (params?.id ? s.payoutAccounts[params.id] ?? EMPTY_ARRAY : EMPTY_ARRAY));
  const fetchPayoutAccounts = useEventStore((s) => s.fetchPayoutAccounts);
  const myApplication = useEventStore((s) => (params?.id ? s.myApplication[params.id] : undefined));
  const fetchMyApplication = useEventStore((s) => s.fetchMyApplication);
  const submitApplication = useEventStore((s) => s.submitApplication);
  const resubmitApplication = useEventStore((s) => s.resubmitApplication);
  const deleteEventAction = useEventStore((s) => s.deleteEvent);

  const event = events.find((e) => e.id === params?.id);
  const isOwn = !!user && event?.hostId === user.id;

  const [bookmarked, setBookmarked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rsvpErr, setRsvpErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Paid event application modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [proofUri, setProofUri] = useState<string | undefined>();

  // Downloadable pass modal state
  const [showPassModal, setShowPassModal] = useState(false);
  const [sharingPass, setSharingPass] = useState(false);
  const passRef = useRef<ViewShotRef>(null);

  useEffect(() => {
    if (events.length === 0 && user) fetchEvents(user.id);
  }, [events.length, user, fetchEvents]);

  useEffect(() => {
    if (event?.id) fetchAttendees(event.id);
  }, [event?.id, fetchAttendees]);

  useEffect(() => {
    if (event?.paid && !isOwn && user) {
      fetchPayoutAccounts(event.id);
      fetchMyApplication(event.id, user.id);
    }
  }, [event?.paid, event?.id, isOwn, user, fetchPayoutAccounts, fetchMyApplication]);

  // Re-check application status whenever this screen regains focus (e.g. coming back from
  // tapping an "application approved" notification) so the pass button appears without
  // requiring a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (event?.paid && !isOwn && user) fetchMyApplication(event.id, user.id);
    }, [event?.paid, event?.id, isOwn, user, fetchMyApplication]),
  );

  const confirmDeleteEvent = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      await deleteEventAction(event.id);
      setDeleteConfirm(false);
      nav.goBack();
    } catch {
      setDeleting(false);
    }
  };

  const onRefresh = async () => {
    if (!user || !event) return;
    setRefreshing(true);
    try {
      await fetchEvents(user.id);
      await fetchAttendees(event.id);
      if (event.paid && !isOwn) {
        await Promise.all([fetchPayoutAccounts(event.id), fetchMyApplication(event.id, user.id)]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CyberBackground showArtwork={false} />
        <View style={[styles.innerContent, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>Event not found.</Text>
          <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const past = new Date(event.startsAt).getTime() < Date.now();
  const paid = !!event.paid && (event.price ?? 0) > 0;
  const isGoing = event.rsvp === 'going';
  const applicationStatus = paid ? myApplication?.status : undefined;
  const showPass = paid && applicationStatus === 'approved';

  const handleToggleRsvp = async () => {
    if (past || !user) return;
    if (isGoing) {
      // Cancel RSVP
      setBusy(true);
      try {
        await setRsvp(event.id, user.id, 'not_going');
      } catch (err) {
        setRsvpErr(err instanceof Error ? err.message : 'Could not cancel RSVP');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (paid) {
      setShowPayModal(true);
      return;
    }

    setBusy(true);
    setRsvpErr('');
    try {
      await setRsvp(event.id, user.id, 'going');
    } catch (err) {
      setRsvpErr(err instanceof Error ? err.message : 'Could not RSVP — try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${event.title} on Reapers! ${event.description || ''}`,
      });
    } catch {}
  };

  const pickProofImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setProofUri(res.assets[0].uri);
    }
  };

  const handlePaidApplication = async () => {
    if (!user || !proofUri) return;
    setBusy(true);
    setRsvpErr('');
    try {
      const path = await uploadPaymentProof(user.id, event.id, proofUri);
      if (myApplication?.status === 'rejected') {
        await resubmitApplication(event.id, myApplication.id, {
          payoutAccountId: selectedAccountId,
          proofScreenshotPath: path,
        });
      } else {
        await submitApplication({
          eventId: event.id,
          applicantId: user.id,
          payoutAccountId: selectedAccountId,
          proofScreenshotPath: path,
        });
      }
      setShowPayModal(false);
      setProofUri(undefined);
    } catch (e) {
      setRsvpErr(e instanceof Error ? e.message : 'Could not submit payment application');
    } finally {
      setBusy(false);
    }
  };

  const handleSharePass = async () => {
    if (sharingPass) return;
    setSharingPass(true);
    try {
      const uri = await passRef.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${event.title} — Pass` });
      }
    } catch {
      // Sharing sheet dismissal/cancellation also rejects — nothing actionable to show the user.
    } finally {
      setSharingPass(false);
    }
  };

  // Format date & time strings from real event
  const eventDate = new Date(event.startsAt);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Karachi',
  });
  const startTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi',
  });
  const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi',
  });

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeaderWrap}>
      <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
      <View style={styles.accentLineContainer}>
        <LinearGradient
          colors={['#00E5FF', '#D83CFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={['#00E5FF', '#D83CFF']}
          />
        }
      >
        {/* ================= 1. HERO COVER IMAGE ================= */}
        <View style={styles.heroContainer}>
          <Image
            source={
              event.cover
                ? { uri: event.cover }
                : getCyberAvatarSource('male_1')
            }
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Scrim gradient overlay */}
          <LinearGradient
            colors={['rgba(9, 15, 28, 0.25)', 'rgba(9, 15, 28, 0.65)', '#090F1C']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Floating Action Bar */}
          <View style={[styles.topActionBar, { top: insets.top + 8 }]}>
            <Pressable
              onPress={() => nav.goBack()}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <CyberCutBox
                cutSize={8}
                radius={4}
                fill={colors.cardFill}
                borderColor={colors.cardBorder}
                borderWidth={0.88}
                style={styles.navCutBox}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </CyberCutBox>
            </Pressable>

            <View style={styles.rightActionsRow}>
              <Pressable
                onPress={() => setBookmarked((prev) => !prev)}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel="Bookmark"
              >
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={0.88}
                  style={styles.navCutBox}
                >
                  <Ionicons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={17}
                    color={bookmarked ? colors.electricAccent : colors.text}
                  />
                </CyberCutBox>
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <CyberCutBox
                  cutSize={8}
                  radius={4}
                  fill={colors.cardFill}
                  borderColor={colors.cardBorder}
                  borderWidth={0.88}
                  style={styles.navCutBox}
                >
                  <Ionicons name="share-social-outline" size={17} color={colors.text} />
                </CyberCutBox>
              </Pressable>

              {isOwn && (
                <Pressable
                  onPress={() => nav.navigate('CreateEvent', { eventId: event.id })}
                  style={styles.navBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Edit event"
                >
                  <CyberCutBox
                    cutSize={8}
                    radius={4}
                    fill={colors.cardFill}
                    borderColor={colors.cardBorder}
                    borderWidth={0.88}
                    style={styles.navCutBox}
                  >
                    <Ionicons name="create-outline" size={17} color={colors.text} />
                  </CyberCutBox>
                </Pressable>
              )}

              {isOwn && (
                <Pressable
                  onPress={() => setDeleteConfirm(true)}
                  style={styles.navBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete event"
                >
                  <CyberCutBox
                    cutSize={8}
                    radius={4}
                    fill={colors.cardFill}
                    borderColor={colors.cardBorder}
                    borderWidth={0.88}
                    style={styles.navCutBox}
                  >
                    <Ionicons name="trash-outline" size={17} color="#FF4D6D" />
                  </CyberCutBox>
                </Pressable>
              )}
            </View>
          </View>

          {/* Floating Badges & Event Title */}
          <View style={styles.heroContentWrap}>
            <View style={styles.heroBadgesRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>
                  {(event.category || event.type || 'MEETUP').toUpperCase()}
                </Text>
              </View>

              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>
                  {paid ? `${event.currency || 'PKR'} ${event.price}` : 'FREE'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitleText}>{event.title}</Text>
          </View>
        </View>

        <View style={[styles.mainBody, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {/* ================= 2. ORGANISED BY ================= */}
          <View style={styles.organisedByRow}>
            <CyberCutBox
              cutSize={10}
              radius={6}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={1}
              style={styles.hostAvatarCutBox}
            >
              <Image
                source={getCyberAvatarSource('male_5')}
                style={styles.hostAvatarImg}
              />
            </CyberCutBox>

            <View style={styles.hostInfoCol}>
              <Text style={[styles.organisedByLabel, { color: colors.primary }]}>ORGANISED BY</Text>
              <View style={styles.hostNameRow}>
                <Text style={[styles.hostNameText, { color: colors.text }]}>{event.posterName || 'Admin'}</Text>
                <View style={styles.hostBadgePill}>
                  <Text style={styles.hostBadgeText}>HOST</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ================= 3. LOGISTICS CHAMFER CARD ================= */}
          <CyberCutBox
            cutSize={14}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.logisticsCard}
          >
            <View style={styles.logisticsInner}>
              {/* Row 1: Date */}
              <View style={styles.logisticsRow}>
                <View style={[styles.logisticsIconBox, { backgroundColor: isDark ? 'rgba(0, 229, 255, 0.12)' : 'rgba(14, 165, 233, 0.12)' }]}>
                  <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                </View>
                <View style={styles.logisticsTextCol}>
                  <Text style={[styles.logisticsLabel, { color: colors.muted2 }]}>DATE</Text>
                  <Text style={[styles.logisticsValue, { color: colors.text }]}>{formattedDate}</Text>
                </View>
              </View>

              {/* Row 2: Time */}
              <View style={[styles.logisticsRow, styles.logisticsBorder, { borderTopColor: colors.cardBorder }]}>
                <View style={[styles.logisticsIconBox, { backgroundColor: isDark ? 'rgba(109, 53, 255, 0.15)' : 'rgba(109, 53, 255, 0.1)' }]}>
                  <Ionicons name="time-outline" size={17} color="#6D35FF" />
                </View>
                <View style={styles.logisticsTextCol}>
                  <Text style={[styles.logisticsLabel, { color: colors.muted2 }]}>TIME</Text>
                  <Text style={[styles.logisticsValue, { color: colors.text }]}>
                    {startTime} – {endTime} PKT
                  </Text>
                </View>
              </View>

              {/* Row 3: Location / Online */}
              <View style={[styles.logisticsRow, styles.logisticsBorder, { borderTopColor: colors.cardBorder }]}>
                <View style={[styles.logisticsIconBox, { backgroundColor: isDark ? 'rgba(216, 60, 255, 0.15)' : 'rgba(216, 60, 255, 0.1)' }]}>
                  <Ionicons
                    name={event.type.toLowerCase() === 'online' ? 'globe-outline' : 'location-outline'}
                    size={17}
                    color="#D83CFF"
                  />
                </View>
                <View style={styles.logisticsTextCol}>
                  <Text style={[styles.logisticsLabel, { color: colors.muted2 }]}>{event.type.toUpperCase()}</Text>
                  <Text style={[styles.logisticsValue, { color: colors.text }]}>
                    {event.location || (event.type.toLowerCase() === 'online' ? 'Canada / Online' : 'Physical Venue')}
                  </Text>
                </View>
              </View>
            </View>
          </CyberCutBox>

          {/* ================= 4. ABOUT EVENT ================= */}
          {renderSectionHeader('About Event')}
          <Text style={[styles.aboutText, { color: colors.text }]}>
            {event.description || 'Niagra Falls tour in cohort of Canada.'}
          </Text>

          {/* ================= 5. ATTENDEES ================= */}
          {renderSectionHeader('Attendees')}
          <Text style={[styles.attendeesSubtext, { color: colors.muted }]}>
            {attendees.length > 0
              ? `${attendees.length} ${attendees.length === 1 ? 'person' : 'people'} attending`
              : 'Be the first to RSVP for this event!'}
          </Text>

          {attendees.length > 0 && (
            <View style={styles.attendeesRow}>
              <View style={styles.avatarStack}>
                {attendees.slice(0, 4).map((att, i) => (
                  <View
                    key={att.userId}
                    style={[styles.miniAvatarBox, { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i, borderColor: colors.background }]}
                  >
                    <Image
                      source={
                        att.avatarUri
                          ? { uri: att.avatarUri }
                          : getCyberAvatarSource(att.avatarId || 'male_1')
                      }
                      style={styles.miniAvatarImg}
                    />
                  </View>
                ))}
              </View>
              <Text style={[styles.attendeeCountText, { color: colors.muted }]}>
                {attendees.length} {attendees.length === 1 ? 'MEMBER' : 'MEMBERS'}
              </Text>
            </View>
          )}

          <View style={styles.tagsRow}>
            {[event.category || event.type || 'MEETUP', paid ? 'PAID' : 'FREE'].map((t, idx) => (
              <View key={idx} style={[styles.tagPill, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]}>
                <Text style={[styles.tagPillText, { color: colors.muted }]}>{t.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {rsvpErr ? (
            <View style={styles.errBox}>
              <Text style={styles.errText}>{rsvpErr}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ================= 6. DOCKED STICKY BOTTOM RSVP BAR ================= */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
        <View style={[styles.bottomBarInner, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <View style={styles.bottomMetaCol}>
            <Text style={[styles.bottomPriceText, { color: colors.primary }]}>
              {paid ? `${event.currency || 'PKR'} ${event.price}` : 'FREE · RSVP OPEN'}
            </Text>
            <Text style={[styles.bottomDateText, { color: colors.text }]}>{formattedDate}</Text>
          </View>

          {isOwn ? (
            <View style={styles.hostingBadge}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={[styles.hostingBadgeText, { color: colors.primary }]}>You're hosting</Text>
            </View>
          ) : (
            <Pressable
              onPress={showPass ? () => setShowPassModal(true) : handleToggleRsvp}
              disabled={busy || past || applicationStatus === 'pending'}
              style={styles.rsvpBtn}
              accessibilityRole="button"
            >
              <CyberCutBox
                cutSize={8}
                radius={4}
                style={styles.rsvpCutBox}
                gradient={!isGoing && applicationStatus !== 'pending'}
              >
                <View style={styles.rsvpGradient}>
                  <Text style={styles.rsvpBtnText}>
                    {busy
                      ? 'Processing...'
                      : showPass
                      ? 'Download Pass'
                      : applicationStatus === 'pending'
                      ? 'Pending Approval'
                      : applicationStatus === 'rejected'
                      ? 'Reapply'
                      : isGoing
                      ? '✓ Joined'
                      : paid
                      ? 'Apply to Join'
                      : 'RSVP Now'}
                  </Text>
                </View>
              </CyberCutBox>
            </Pressable>
          )}
        </View>
      </View>

      {/* ================= PAID RSVP MODAL ================= */}
      <Modal visible={showPayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <CyberCutBox
            cutSize={16}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.modalBox}
          >
            <View style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {myApplication?.status === 'rejected' ? 'Reapply for Event Access' : 'Apply for Event Access'}
                </Text>
                <Pressable onPress={() => setShowPayModal(false)}>
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>

              {myApplication?.status === 'rejected' && myApplication.rejectionReason ? (
                <View style={styles.errBox}>
                  <Text style={styles.errText}>Previous application rejected: {myApplication.rejectionReason}</Text>
                </View>
              ) : null}

              <Text style={[styles.modalSub, { color: colors.muted }]}>
                This is a paid event ({event.currency || 'PKR'} {event.price}). Upload your payment proof below to request access.
              </Text>

              <Pressable onPress={pickProofImage} style={[styles.uploadBox, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'transparent' : 'rgba(0,0,0,0.02)' }]}>
                {proofUri ? (
                  <Image source={{ uri: proofUri }} style={styles.proofPreviewImg} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                    <Text style={[styles.uploadText, { color: colors.primary }]}>Select Payment Screenshot</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={handlePaidApplication}
                disabled={!proofUri || busy}
                style={[styles.modalSubmitBtn, (!proofUri || busy) && { opacity: 0.5 }]}
              >
                <CyberCutBox gradient cutSize={8} radius={4} style={{ width: '100%', height: 44 }}>
                  <View style={styles.rsvpGradient}>
                    <Text style={styles.rsvpBtnText}>{myApplication?.status === 'rejected' ? 'Resubmit Application' : 'Submit Application'}</Text>
                  </View>
                </CyberCutBox>
              </Pressable>
            </View>
          </CyberCutBox>
        </View>
      </Modal>

      {/* ================= DOWNLOADABLE PASS MODAL ================= */}
      <Modal visible={showPassModal} transparent animationType="fade">
        <View style={styles.passModalOverlay}>
          <Pressable
            onPress={() => setShowPassModal(false)}
            style={styles.passCloseBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </Pressable>

          <ViewShot ref={passRef} options={{ format: 'png', quality: 1 }}>
            <EventPassCard
              event={event}
              attendeeName={user?.displayName ?? 'Attendee'}
              attendeeAvatarSource={user?.avatarUri ? { uri: user.avatarUri } : getCyberAvatarSource(user?.avatarId)}
              reservationCode={myApplication?.reservationCode ?? '—'}
              formattedDate={formattedDate}
              startTime={startTime}
              endTime={endTime}
            />
          </ViewShot>

          <Pressable onPress={handleSharePass} disabled={sharingPass} style={styles.passShareBtn} accessibilityRole="button">
            <CyberCutBox gradient cutSize={8} radius={4} style={{ width: '100%', height: '100%' }}>
              <View style={styles.rsvpGradient}>
                <Text style={styles.rsvpBtnText}>{sharingPass ? 'Preparing…' : 'Download / Share Pass'}</Text>
              </View>
            </CyberCutBox>
          </Pressable>
        </View>
      </Modal>

      <ConfirmSheet
        visible={deleteConfirm}
        title="Delete this event?"
        body={
          event.attendeeCount > 1
            ? `This event has ${event.attendeeCount - 1} other attendee${event.attendeeCount - 1 === 1 ? '' : 's'} going — deleting it will notify them and cannot be undone. Reapers does not process refunds automatically for any payments already made outside the app.`
            : "This can't be undone."
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={confirmDeleteEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 290,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topActionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  navBtn: {
    width: 36,
    height: 36,
  },
  navCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroContentWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.16)',
    borderColor: 'rgba(0, 229, 255, 0.45)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryPillText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#00E5FF',
  },
  pricePill: {
    backgroundColor: 'rgba(216, 60, 255, 0.16)',
    borderColor: 'rgba(216, 60, 255, 0.45)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pricePillText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#D83CFF',
  },
  heroTitleText: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  mainBody: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  organisedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  hostAvatarCutBox: {
    width: 48,
    height: 48,
    overflow: 'hidden',
  },
  hostAvatarImg: {
    width: '100%',
    height: '100%',
  },
  hostInfoCol: {
    gap: 2,
  },
  organisedByLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#00E5FF',
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostNameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hostBadgePill: {
    backgroundColor: 'rgba(216, 60, 255, 0.18)',
    borderColor: 'rgba(216, 60, 255, 0.45)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hostBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: '#D83CFF',
    letterSpacing: 0.6,
  },
  logisticsCard: {
    width: '100%',
    marginBottom: 20,
  },
  logisticsInner: {
    width: '100%',
    padding: 14,
  },
  logisticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  logisticsBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  logisticsIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logisticsTextCol: {
    flex: 1,
    gap: 1,
  },
  logisticsLabel: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  logisticsValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sectionHeaderWrap: {
    marginTop: 6,
    marginBottom: 10,
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
  aboutText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: '#CBD5E1',
    marginBottom: 20,
  },
  attendeesSubtext: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#8E9BB5',
    marginBottom: 10,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatarBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#090F1C',
    overflow: 'hidden',
  },
  miniAvatarImg: {
    width: '100%',
    height: '100%',
  },
  attendeeCountText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#CBD5E1',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagPillText: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: '#8E9BB5',
  },
  errBox: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 6,
    marginBottom: 12,
  },
  errText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: '#EF4444',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 15, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 10,
    alignItems: 'center',
  },
  bottomBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  bottomMetaCol: {
    gap: 2,
  },
  bottomPriceText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#00F0FF',
  },
  bottomDateText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rsvpBtn: {
    height: 44,
  },
  rsvpCutBox: {
    height: 44,
    overflow: 'hidden',
  },
  rsvpGradient: {
    paddingHorizontal: 24,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rsvpBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  hostingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
  },
  hostingBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    fontWeight: '700',
  },
  passModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  passCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  passShareBtn: {
    width: 220,
    height: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
  },
  modalInner: {
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#A6B4CE',
    lineHeight: 18,
  },
  uploadBox: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 6,
  },
  uploadText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#00E5FF',
  },
  proofPreviewImg: {
    width: '100%',
    height: '100%',
  },
  modalSubmitBtn: {
    width: '100%',
    marginTop: 6,
  },
});
