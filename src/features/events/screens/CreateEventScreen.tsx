import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberTextField } from '../../../components/cyber/CyberTextField';
import { EventDateTimePicker } from '../../../components/inputs/EventDateTimePicker';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { useAuth } from '../../../hooks/useAuth';
import { useEventStore } from '../../../store/eventStore';
import { uploadImage } from '../../../services/supabase/storage';
import type { MainStackParamList } from '../../../navigation/types';
import { fonts, useTheme } from '../../../theme';
import type { EventCategory, EventType } from '../../../types/event';

type DraftAccount = { bankName: string; accountTitle: string; accountNumber: string; iban: string };
const EMPTY_ACCOUNT: DraftAccount = { bankName: '', accountTitle: '', accountNumber: '', iban: '' };

const EVENT_TYPES: EventType[] = ['Online', 'Physical'];
const EVENT_CATEGORIES: EventCategory[] = ['Esports', 'Meetup', 'LAN', 'Workshop', 'Tournament', 'Watch party'];

export function CreateEventScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'CreateEvent'>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const createEvent = useEventStore((s) => s.createEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);
  const editingEvent = useEventStore((s) => s.events.find((e) => e.id === params?.eventId));
  const isEditing = !!params?.eventId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('0');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [selectedType, setSelectedType] = useState<EventType>('Online');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('Meetup');
  const [cover, setCover] = useState<string | undefined>();
  const [coverChanged, setCoverChanged] = useState(false);
  const [payoutContactNote, setPayoutContactNote] = useState('');
  const [accounts, setAccounts] = useState<DraftAccount[]>([{ ...EMPTY_ACCOUNT }]);
  const [startsAt, setStartsAt] = useState<Date>(() => {
    const d = new Date(Date.now() + 86400000 * 3);
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  useEffect(() => {
    if (!editingEvent) return;
    setTitle(editingEvent.title);
    setDescription(editingEvent.description);
    setLocation(editingEvent.location);
    setMaxAttendees(editingEvent.maxAttendees ? String(editingEvent.maxAttendees) : '');
    setCover(editingEvent.cover);
    setStartsAt(new Date(editingEvent.startsAt));
  }, [editingEvent]);

  const pickCoverImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setCover(res.assets[0].uri);
      setCoverChanged(true);
    }
  };

  const submitEdit = async () => {
    if (title.trim().length < 3 || !user || !editingEvent) {
      setErr('Title is required (minimum 3 characters)');
      return;
    }
    if (startsAt.getTime() < Date.now()) {
      setSubmitErr('Please pick a date and time in the future.');
      return;
    }
    setSubmitting(true);
    setSubmitErr('');
    try {
      const maxAttendeesNum = maxAttendees.trim() ? Math.max(1, Math.round(Number(maxAttendees))) : null;
      const coverUrl = coverChanged && cover ? await uploadImage('event-covers', user.id, cover) : undefined;
      await updateEvent(editingEvent.id, {
        title: title.trim(),
        description: description.trim() || 'Community event',
        location: location.trim() || (selectedType === 'Online' ? 'Online' : 'TBA'),
        startsAt: startsAt.toISOString(),
        maxAttendees: maxAttendeesNum,
        ...(coverUrl ? { coverUrl } : {}),
      });
      nav.replace('EventDetail', { id: editingEvent.id });
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSubmitting(false);
    }
  };

  // Real coordinates for the "within 50km" event filter — there's no geocoding service wired
  // up to turn the free-text location into coordinates, so this uses the host's own device
  // location at creation time as a stand-in (a reasonable proxy: hosts are usually creating
  // the event at or near the venue). Best-effort: permission denial or failure never blocks
  // publishing the event, it just leaves lat/lng unset (excluded from distance filtering).
  const captureEventCoords = async (): Promise<{ lat?: number; lng?: number }> => {
    if (selectedType !== 'Physical') return {};
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return {};
      const pos = await Location.getCurrentPositionAsync({});
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return {};
    }
  };

  const submit = async () => {
    if (isEditing) return submitEdit();
    if (title.trim().length < 3 || !user) {
      setErr('Title is required (minimum 3 characters)');
      return;
    }
    if (startsAt.getTime() < Date.now()) {
      setSubmitErr('Please pick a date and time in the future.');
      return;
    }
    const amount = Number(price) || 0;
    const validAccounts = accounts
      .filter((a) => a.bankName.trim() && a.accountTitle.trim() && a.accountNumber.trim())
      .map((a) => ({
        bankName: a.bankName.trim(),
        accountTitle: a.accountTitle.trim(),
        accountNumber: a.accountNumber.trim(),
        iban: a.iban.trim() || undefined,
      }));

    if (amount > 0 && validAccounts.length === 0) {
      setSubmitErr('Add at least one bank account so attendees know where to send payment.');
      return;
    }

    setSubmitting(true);
    setSubmitErr('');
    try {
      const maxAttendeesNum = maxAttendees.trim() ? Math.max(1, Math.round(Number(maxAttendees))) : undefined;
      const coverUrl = cover ? await uploadImage('event-covers', user.id, cover) : undefined;
      const coords = await captureEventCoords();
      const event = await createEvent({
        hostId: user.id,
        title: title.trim(),
        description: description.trim() || 'Community event',
        type: selectedType,
        category: selectedCategory,
        startsAt: startsAt.toISOString(),
        location: location.trim() || (selectedType === 'Online' ? 'Online' : 'TBA'),
        lat: coords.lat,
        lng: coords.lng,
        coverUrl,
        maxAttendees: maxAttendeesNum,
        paid: amount > 0,
        price: amount,
        currency: 'PKR',
        payoutContactNote: payoutContactNote.trim() || undefined,
        payoutAccounts: validAccounts.length ? validAccounts : undefined,
      });
      nav.replace('EventDetail', { id: event.id });
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'Could not create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn} accessibilityRole="button">
          <CyberCutBox
            cutSize={8}
            radius={4}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.backCutBox}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </CyberCutBox>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditing ? 'Edit event' : 'Create event'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* 1. COVER IMAGE UPLOAD */}
        <Pressable onPress={pickCoverImage} accessibilityRole="button" style={styles.coverWrapper}>
          <CyberCutBox
            cutSize={14}
            radius={8}
            fill={colors.cardFill}
            borderColor={colors.cardBorder}
            borderWidth={0.88}
            style={styles.coverCutBox}
          >
            {cover ? (
              <Image source={{ uri: cover }} style={styles.coverImg} resizeMode="cover" />
            ) : (
              <View style={styles.coverPlaceholder}>
                <View style={[styles.uploadIconCircle, { backgroundColor: isDark ? 'rgba(0, 229, 255, 0.12)' : 'rgba(14, 165, 233, 0.12)' }]}>
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.coverText, { color: colors.primary }]}>Upload cover image</Text>
                <Text style={[styles.coverSubtext, { color: colors.muted }]}>JPG or PNG (Recommended: 16:9 ratio)</Text>
              </View>
            )}
          </CyberCutBox>
        </Pressable>

        {/* 2. TITLE */}
        <CyberTextField
          label="TITLE"
          required
          placeholder="e.g. Niagara Falls Community Meetup"
          value={title}
          onChangeText={setTitle}
          error={err}
          onBlur={() => setErr(title.trim().length < 3 ? 'Title is required (minimum 3 characters)' : '')}
        />

        {/* 3. DATE & TIME PICKER */}
        <EventDateTimePicker value={startsAt} onChange={setStartsAt} />

        {/* 4. DESCRIPTION */}
        <CyberTextField
          label="DESCRIPTION"
          placeholder="Tell attendees what your event is about..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          containerStyle={{ marginBottom: 16 }}
        />

        {/* 5. LOCATION OR LINK */}
        <CyberTextField
          label="LOCATION OR LINK"
          placeholder="e.g. Canada / Online Discord channel"
          value={location}
          onChangeText={setLocation}
        />

        {/* 6. TICKET PRICE — fixed at creation, not editable afterward */}
        {!isEditing && (
          <CyberTextField
            label="TICKET PRICE (PKR, 0 = FREE)"
            placeholder="0"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            hint="Above 0, attendees pay into your bank account(s) below and submit proof for your approval."
          />
        )}

        {/* 7. MAX ATTENDEES */}
        <CyberTextField
          label="MAX ATTENDEES (OPTIONAL)"
          placeholder="Unlimited"
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          keyboardType="number-pad"
        />

        {/* 8. EVENT FORMAT (ONLINE / PHYSICAL) — fixed at creation, not editable afterward */}
        {!isEditing && (
          <View style={styles.pickerSection}>
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>EVENT FORMAT</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPES.map((t) => {
                const active = selectedType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setSelectedType(t)}
                    accessibilityRole="button"
                    style={[styles.typeChip, active ? styles.typeChipActive : [styles.chipInactive, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]]}
                  >
                    <Text style={[styles.chipText, { color: colors.muted }, active && styles.chipTextActive]}>
                      {t.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 9. EVENT CATEGORY — fixed at creation, not editable afterward */}
        {!isEditing && (
          <View style={styles.pickerSection}>
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {EVENT_CATEGORIES.map((c) => {
                const active = selectedCategory === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedCategory(c)}
                    accessibilityRole="button"
                    style={[styles.categoryChip, active ? styles.categoryChipActive : [styles.chipInactive, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]]}
                  >
                    <Text style={[styles.chipText, { color: colors.muted }, active && styles.chipTextActive]}>
                      {c.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 10. PAYOUT BANK ACCOUNTS SECTION — only relevant when first creating a paid event */}
        {!isEditing && (
        <View style={styles.payoutSection}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.primary }]}>WHERE ATTENDEES SHOULD PAY YOU</Text>
            <Text style={[styles.sectionHeaderHint, { color: colors.muted }]}>
              Reapers never processes payments directly — attendees transfer directly to your bank account and submit proof for you to review.
            </Text>
          </View>

          {accounts.map((acc, idx) => (
            <CyberCutBox
              key={idx}
              cutSize={12}
              radius={8}
              fill={colors.cardFill}
              borderColor={colors.cardBorder}
              borderWidth={0.88}
              style={styles.accountCardBox}
            >
              <View style={styles.accountCardInner}>
                <View style={styles.accountCardHeader}>
                  <Text style={styles.accountCardTitle}>ACCOUNT #{idx + 1}</Text>
                  {accounts.length > 1 && (
                    <Pressable
                      onPress={() => setAccounts((prev) => prev.filter((_, i) => i !== idx))}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#FF4D6D" />
                    </Pressable>
                  )}
                </View>

                <CyberTextField
                  label="BANK NAME"
                  placeholder="e.g. Meezan Bank / EasyPaisa / JazzCash"
                  value={acc.bankName}
                  onChangeText={(v) =>
                    setAccounts((prev) => prev.map((a, i) => (i === idx ? { ...a, bankName: v } : a)))
                  }
                />
                <CyberTextField
                  label="ACCOUNT TITLE"
                  placeholder="e.g. John Doe"
                  value={acc.accountTitle}
                  onChangeText={(v) =>
                    setAccounts((prev) => prev.map((a, i) => (i === idx ? { ...a, accountTitle: v } : a)))
                  }
                />
                <CyberTextField
                  label="ACCOUNT NUMBER"
                  placeholder="e.g. 03001234567"
                  value={acc.accountNumber}
                  onChangeText={(v) =>
                    setAccounts((prev) => prev.map((a, i) => (i === idx ? { ...a, accountNumber: v } : a)))
                  }
                  keyboardType="number-pad"
                />
                <CyberTextField
                  label="IBAN (OPTIONAL)"
                  placeholder="PK00MEZN0000000000000000"
                  value={acc.iban}
                  onChangeText={(v) =>
                    setAccounts((prev) => prev.map((a, i) => (i === idx ? { ...a, iban: v } : a)))
                  }
                  autoCapitalize="characters"
                />
              </View>
            </CyberCutBox>
          ))}

          <Pressable
            onPress={() => setAccounts((prev) => [...prev, { ...EMPTY_ACCOUNT }])}
            style={styles.addAccountBtn}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.addAccountBtnText, { color: colors.primary }]}>Add Another Account</Text>
          </Pressable>

          <CyberTextField
            label="EXTRA PAYMENT INSTRUCTIONS (OPTIONAL)"
            placeholder="e.g. Please mention your username in the transfer note"
            value={payoutContactNote}
            onChangeText={setPayoutContactNote}
            multiline
          />
        </View>
        )}

        {submitErr ? <InlineErrorText message={submitErr} /> : null}

        {/* 11. PUBLISH / SAVE BUTTON */}
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={styles.submitBtnWrap}
          accessibilityRole="button"
        >
          <CyberCutBox gradient cutSize={10} radius={6} style={styles.submitCutBox}>
            <View style={styles.submitInner}>
              <Text style={styles.submitBtnText}>
                {submitting ? (isEditing ? 'SAVING...' : 'PUBLISHING...') : isEditing ? 'SAVE CHANGES' : 'PUBLISH EVENT'}
              </Text>
            </View>
          </CyberCutBox>
        </Pressable>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
  },
  backCutBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  coverWrapper: {
    width: '100%',
    height: 165,
    marginBottom: 18,
  },
  coverCutBox: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  coverText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: '#00E5FF',
  },
  coverSubtext: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#8E9BB5',
  },
  pickerSection: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: '#00E5FF',
  },
  categoryChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(216, 60, 255, 0.25)',
    borderColor: '#D83CFF',
  },
  chipInactive: {
    backgroundColor: 'rgba(14, 20, 35, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    letterSpacing: 0.5,
    color: '#A6B4CE',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  payoutSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeaderWrap: {
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#00E5FF',
    marginBottom: 4,
  },
  sectionHeaderHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: '#8E9BB5',
  },
  accountCardBox: {
    width: '100%',
    marginBottom: 14,
  },
  accountCardInner: {
    padding: 14,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  accountCardTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#D83CFF',
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 14,
  },
  addAccountBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: '#00E5FF',
  },
  submitBtnWrap: {
    width: '100%',
    height: 50,
    marginTop: 12,
    marginBottom: 24,
  },
  submitCutBox: {
    width: '100%',
    height: '100%',
  },
  submitInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
