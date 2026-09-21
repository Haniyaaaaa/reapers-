import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { errorMessage } from '../../../utils/errorMessage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { CyberTextField } from '../../../components/cyber/CyberTextField';
import { EventSchedulePicker } from '../../../components/inputs/EventSchedulePicker';
import { getEventVenue } from '../../../services/supabase/events';
import { InlineErrorText } from '../../../components/feedback/InlineErrorText';
import { useAuth } from '../../../hooks/useAuth';
import { useEventStore } from '../../../store/eventStore';
import { uploadImage } from '../../../services/supabase/storage';
import type { MainStackParamList } from '../../../navigation/types';
import { fonts, useTheme } from '../../../theme';
import type { EventCategory, EventType } from '../../../types/event';
import { KeyboardAwareScrollView } from '../../../components/layout/KeyboardAwareScrollView';

type DraftAccount = { bankName: string; accountTitle: string; accountNumber: string; iban: string };
const EMPTY_ACCOUNT: DraftAccount = { bankName: '', accountTitle: '', accountNumber: '', iban: '' };

const EVENT_TYPES: EventType[] = ['Online', 'Physical', 'Hybrid'];
// Physical is shown as "Onsite" to match the Online / Onsite / Hybrid wording used in filters.
const EVENT_TYPE_LABEL: Record<EventType, string> = { Online: 'ONLINE', Physical: 'ONSITE', Hybrid: 'HYBRID' };
const EVENT_CATEGORIES: EventCategory[] = ['Esports', 'Meetup', 'Tournament'];

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

  const removeCustomCategory = (c: string) => {
    setCustomCategories((prev) => prev.filter((x) => x !== c));
    if (selectedCategory === c) setSelectedCategory('Meetup');
  };

  // Long-press a custom chip to rename it: it moves into the input, ready to retype and re-add.
  const editCustomCategory = (c: string) => {
    removeCustomCategory(c);
    setCustomCategory(c);
  };

  const addCustomCategory = () => {
    const c = customCategory.trim().replace(/\s+/g, ' ');
    if (!c) return;
    const existing = [...EVENT_CATEGORIES, ...customCategories].find((x) => x.toLowerCase() === c.toLowerCase());
    if (existing) {
      setSelectedCategory(existing);
    } else {
      setCustomCategories((prev) => [...prev, c]);
      setSelectedCategory(c);
    }
    setCustomCategory('');
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [venue, setVenue] = useState('');
  // Ticket plans: one row = one plan people can pick when booking. All prices 0 (the default) means a free event.
  const [plans, setPlans] = useState<{ name: string; price: string }[]>([{ name: 'Standard ticket', price: '0' }]);
  const [maxAttendees, setMaxAttendees] = useState('');
  // Registration closes N hours/days before the start; stored as minutes. Blank/0 = when it starts.
  const [closeAmount, setCloseAmount] = useState('');
  const [closeUnit, setCloseUnit] = useState<'hours' | 'days'>('hours');
  const closeMinRaw = Math.round((Number(closeAmount) || 0) * (closeUnit === 'days' ? 1440 : 60));
  const MAX_CLOSE_MIN = 14 * 1440;
  const closeTooLong = closeMinRaw > MAX_CLOSE_MIN;
  const closeMin = Math.min(closeMinRaw, MAX_CLOSE_MIN);
  const [selectedType, setSelectedType] = useState<EventType>('Online');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('Meetup');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [cover, setCover] = useState<string | undefined>();
  const [coverChanged, setCoverChanged] = useState(false);
  const [payoutContactNote, setPayoutContactNote] = useState('');
  const [accounts, setAccounts] = useState<DraftAccount[]>([{ ...EMPTY_ACCOUNT }]);
  const [startsAt, setStartsAt] = useState<Date>(() => {
    const d = new Date(Date.now() + 86400000 * 3);
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [endsAt, setEndsAt] = useState<Date>(() => {
    const d = new Date(Date.now() + 86400000 * 3);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() + 2 * 3600000);
  });
  const [scheduleErr, setScheduleErr] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  useEffect(() => {
    if (!editingEvent) return;
    setTitle(editingEvent.title);
    setDescription(editingEvent.description);
    setLocation(editingEvent.location);
    setMaxAttendees(editingEvent.maxAttendees ? String(editingEvent.maxAttendees) : '');
    {
      const m = editingEvent.registrationClosesBeforeMin ?? 0;
      if (m === 0) {
        setCloseAmount('');
      } else if (m % 1440 === 0) {
        setCloseUnit('days');
        setCloseAmount(String(m / 1440));
      } else {
        setCloseUnit('hours');
        setCloseAmount(String(Math.round((m / 60) * 100) / 100));
      }
    }
    setCover(editingEvent.cover);
    setSelectedType(editingEvent.type);
    const s = new Date(editingEvent.startsAt);
    setStartsAt(s);
    // Events created before end times existed have none — default to the old 3h assumption.
    setEndsAt(editingEvent.endsAt ? new Date(editingEvent.endsAt) : new Date(s.getTime() + 3 * 3600000));
    getEventVenue(editingEvent.id).then((v) => setVenue(v ?? '')).catch(() => undefined);
  }, [editingEvent]);

  const validateSchedule = (): boolean => {
    if (endsAt.getTime() <= startsAt.getTime()) {
      setScheduleErr('End time must be after the start time.');
      return false;
    }
    if (closeTooLong) {
      setSubmitErr('Registration can close at most 14 days before the event.');
      return false;
    }
    if (closeMin > 0 && startsAt.getTime() - closeMin * 60000 <= Date.now()) {
      setSubmitErr('That closing time has already passed — choose a shorter time before the event, or 0.');
      return false;
    }
    setScheduleErr('');
    return true;
  };

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
    if (!validateSchedule()) return;
    setSubmitting(true);
    setSubmitErr('');
    try {
      const maxAttendeesNum = maxAttendees.trim() ? Math.max(1, Math.round(Number(maxAttendees))) : null;
      const coverUrl = coverChanged && cover ? await uploadImage('event-covers', user.id, cover) : undefined;
      await updateEvent(editingEvent.id, {
        title: title.trim(),
        description: description.trim() || 'Community event',
        location: selectedType === 'Online' ? 'Online' : location.trim() || 'TBA',
        venue: venue.trim() || null,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        maxAttendees: maxAttendeesNum,
        registrationClosesBeforeMin: closeMin,
        ...(coverUrl ? { coverUrl } : {}),
      });
      nav.replace('EventDetail', { id: editingEvent.id });
    } catch (e) {
      setSubmitErr(errorMessage(e, 'Could not save changes'));
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
    if (selectedType === 'Online') return {};
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
    if (!validateSchedule()) return;
    // Ticket plans -> free event (every price 0) or paid (every plan needs a name and a price > 0).
    const parsedPlans = plans.map((p) => ({ name: p.name.trim(), price: Number(p.price) || 0 }));
    const isPaid = parsedPlans.some((p) => p.price > 0);
    if (isPaid) {
      if (parsedPlans.some((p) => p.price <= 0)) {
        setSubmitErr('Every ticket plan needs a price above 0 — remove the free plan or set its price.');
        return;
      }
      if (parsedPlans.some((p) => !p.name)) {
        setSubmitErr('Give every ticket plan a name.');
        return;
      }
      if (new Set(parsedPlans.map((p) => p.name.toLowerCase())).size !== parsedPlans.length) {
        setSubmitErr('Ticket plan names must be different from each other.');
        return;
      }
    }
    const amount = isPaid ? Math.min(...parsedPlans.map((p) => p.price)) : 0;
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
        endsAt: endsAt.toISOString(),
        location: selectedType === 'Online' ? 'Online' : location.trim() || 'TBA',
        venue: venue.trim() || undefined,
        lat: coords.lat,
        lng: coords.lng,
        coverUrl,
        maxAttendees: maxAttendeesNum,
        registrationClosesBeforeMin: closeMin,
        paid: isPaid,
        price: amount,
        ticketPlans: isPaid ? parsedPlans : undefined,
        currency: 'PKR',
        payoutContactNote: payoutContactNote.trim() || undefined,
        payoutAccounts: validAccounts.length ? validAccounts : undefined,
      });
      nav.replace('EventDetail', { id: event.id });
    } catch (e) {
      setSubmitErr(errorMessage(e, 'Could not create event'));
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

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
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
          placeholder="e.g. Karachi Indie Devs Meetup"
          value={title}
          onChangeText={setTitle}
          error={err}
          onBlur={() => setErr(title.trim().length < 3 ? 'Title is required (minimum 3 characters)' : '')}
        />

        {/* 3. START / END DATE & TIME */}
        <EventSchedulePicker
          start={startsAt}
          end={endsAt}
          onChange={(s, e) => {
            setStartsAt(s);
            setEndsAt(e);
            setScheduleErr('');
          }}
          error={scheduleErr}
        />

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

        {/* REGISTRATION CLOSURE — type a number and pick hours or days before the start */}
        <View style={styles.pickerSection}>
          <Text style={[styles.pickerLabel, { color: colors.muted }]}>REGISTRATION CLOSES</Text>
          <View style={styles.closeRow}>
            <View style={[styles.closeInputWrap, { backgroundColor: colors.inputFill, borderColor: closeTooLong ? '#FF4D6D' : colors.inputBorder }]}>
              <TextInput
                value={closeAmount}
                onChangeText={(v) => setCloseAmount(v.replace(/[^0-9.]/g, '').slice(0, 5))}
                placeholder="0"
                placeholderTextColor={colors.muted2}
                keyboardType="decimal-pad"
                accessibilityLabel="Registration closes, amount before the event starts"
                style={[styles.closeInput, { color: colors.text }]}
              />
            </View>
            {(['hours', 'days'] as const).map((u) => {
              const active = closeUnit === u;
              return (
                <Pressable
                  key={u}
                  onPress={() => setCloseUnit(u)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.typeChip, active ? styles.typeChipActive : [styles.chipInactive, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }]]}
                >
                  <Text style={[styles.chipText, { color: colors.muted }, active && styles.chipTextActive]}>{u.toUpperCase()}</Text>
                </Pressable>
              );
            })}
            <Text style={[styles.closeSuffix, { color: colors.muted }]}>before</Text>
          </View>
          <Text style={[styles.planHint, { color: closeTooLong ? '#FF4D6D' : colors.muted2, marginTop: 8, marginBottom: 0 }]}>
            {closeTooLong
              ? 'Registration can close at most 14 days before the event.'
              : closeMin === 0
              ? 'Leave at 0 (or empty) to let people join right up until the event starts.'
              : `Sign-ups stop ${closeAmount} ${closeUnit} before the start — ${new Date(startsAt.getTime() - closeMin * 60000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`}
          </Text>
        </View>

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
                      {EVENT_TYPE_LABEL[t]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 5. WHERE — the area is public; the exact venue (or join link) is only revealed to
            people with a confirmed RSVP (event_venues, 0067). */}
        {selectedType !== 'Online' ? (
          <>
            <CyberTextField
              label="NEARBY TOWN OR AREA"
              placeholder="e.g. Gulberg, DHA, Clifton, Bahria"
              value={location}
              onChangeText={setLocation}
              hint="Shown to everyone before they RSVP."
            />
            <CyberTextField
              label={selectedType === 'Hybrid' ? 'EXACT VENUE + JOIN LINK' : 'EXACT VENUE'}
              placeholder={selectedType === 'Hybrid' ? 'e.g. Brewci Cafe, Gulberg · discord.gg/xyz' : 'e.g. Brewci Cafe, Gulberg'}
              value={venue}
              onChangeText={setVenue}
              multiline
              hint="Only revealed after RSVP confirmation."
            />
          </>
        ) : (
          <CyberTextField
            label="JOIN LINK OR PLATFORM"
            placeholder="e.g. Discord invite / Zoom link"
            value={venue}
            onChangeText={setVenue}
            autoCapitalize="none"
            hint="Only revealed after RSVP confirmation."
          />
        )}

        {/* 6. TICKET PLANS — fixed at creation, not editable afterward (people may already hold tickets) */}
        {!isEditing && (
          <View style={styles.pickerSection}>
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>TICKET PLANS (PKR)</Text>
            <Text style={[styles.planHint, { color: colors.muted2 }]}>
              Leave the price at 0 for a free event. Add more plans (e.g. Standard, VIP) and people choose one when booking, then how many tickets.
            </Text>
            {plans.map((p, i) => (
              <View key={i} style={styles.planRow}>
                <View style={{ flex: 1.4 }}>
                  <CyberTextField
                    label={i === 0 ? 'PLAN NAME' : `PLAN ${i + 1}`}
                    placeholder="e.g. Standard ticket"
                    value={p.name}
                    onChangeText={(v) => setPlans((prev) => prev.map((x, j) => (j === i ? { ...x, name: v.slice(0, 60) } : x)))}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CyberTextField
                    label="PRICE"
                    placeholder="0"
                    value={p.price}
                    onChangeText={(v) => setPlans((prev) => prev.map((x, j) => (j === i ? { ...x, price: v.replace(/[^0-9.]/g, '') } : x)))}
                    keyboardType="decimal-pad"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                {plans.length > 1 ? (
                  <Pressable onPress={() => setPlans((prev) => prev.filter((_, j) => j !== i))} hitSlop={8} style={styles.planRemove} accessibilityRole="button" accessibilityLabel={`Remove plan ${i + 1}`}>
                    <Ionicons name="close-circle" size={22} color="#FF4D6D" />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {plans.length < 6 ? (
              <Pressable onPress={() => setPlans((prev) => [...prev, { name: '', price: '' }])} style={styles.addPlanBtn} accessibilityRole="button">
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addPlanText, { color: colors.primary }]}>Add another plan</Text>
              </Pressable>
            ) : null}
            {plans.some((p) => (Number(p.price) || 0) > 0) ? (
              <Text style={[styles.planHint, { color: colors.muted2 }]}>
                Paid: attendees pay into your bank account(s) below and submit proof for your approval. A buyer can take up to 10 tickets per order.
              </Text>
            ) : null}
          </View>
        )}

        {/* 7. MAX ATTENDEES */}
        <CyberTextField
          label="MAX ATTENDEES (OPTIONAL)"
          placeholder="Unlimited"
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          keyboardType="number-pad"
        />

        {/* 9. EVENT CATEGORY — fixed at creation, not editable afterward */}
        {!isEditing && (
          <View style={styles.pickerSection}>
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>CATEGORY</Text>
            <View style={styles.chipRow}>
              {[...EVENT_CATEGORIES, ...customCategories].map((c) => {
                const active = selectedCategory === c;
                const isCustom = customCategories.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedCategory(c)}
                    onLongPress={isCustom ? () => editCustomCategory(c) : undefined}
                    accessibilityRole="button"
                    accessibilityHint={isCustom ? 'Long press to rename' : undefined}
                    style={[styles.categoryChip, active ? styles.categoryChipActive : [styles.chipInactive, { backgroundColor: colors.cardBorder, borderColor: colors.cardBorder }], isCustom && styles.customChipRow]}
                  >
                    <Text style={[styles.chipText, { color: colors.muted }, active && styles.chipTextActive]}>
                      {c.toUpperCase()}
                    </Text>
                    {isCustom ? (
                      <Pressable onPress={() => removeCustomCategory(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${c}`}>
                        <Ionicons name="close-circle" size={16} color={active ? '#FFFFFF' : colors.muted} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {customCategories.length > 0 ? (
              <Text style={[styles.customHint, { color: colors.muted2 }]}>Tap ✕ to remove your category · long-press it to rename</Text>
            ) : null}
            {/* Own category — the presets are a starting point, not the only options. */}
            <View style={styles.customCategoryRow}>
              <View style={[styles.customCategoryInputWrap, { backgroundColor: colors.inputFill, borderColor: colors.inputBorder }]}>
                <TextInput
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Add your own category"
                  placeholderTextColor={colors.muted2}
                  maxLength={24}
                  autoCorrect={false}
                  onSubmitEditing={addCustomCategory}
                  style={[styles.customCategoryInput, { color: colors.text }]}
                />
              </View>
              <Pressable onPress={addCustomCategory} accessibilityRole="button" accessibilityLabel="Add category" style={styles.customCategoryAdd}>
                <Text style={styles.customCategoryAddText}>ADD</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 10. PAYOUT BANK ACCOUNTS SECTION — only relevant when first creating a paid event */}
        {!isEditing && (
        <View style={styles.payoutSection}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.primary }]}>WHERE ATTENDEES SHOULD PAY YOU</Text>
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
                  placeholder="e.g. Ahmed Raza"
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
      </KeyboardAwareScrollView>
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
  customChipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customHint: { fontFamily: fonts.body, fontSize: 11.5, marginTop: 8 },
  customCategoryRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  customCategoryInputWrap: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, justifyContent: 'center' },
  customCategoryInput: { fontFamily: fonts.body, fontSize: 13, paddingHorizontal: 12, paddingVertical: 0 },
  customCategoryAdd: { height: 44, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#7928CA', alignItems: 'center', justifyContent: 'center' },
  customCategoryAddText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8, color: '#FFFFFF' },
  closeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeInputWrap: { width: 84, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  closeInput: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700', textAlign: 'center', paddingVertical: 0 },
  closeSuffix: { fontFamily: fonts.body, fontSize: 14, marginLeft: 2 },
  planHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  planRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 12 },
  planRemove: { height: 44, justifyContent: 'center' },
  addPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 6 },
  addPlanText: { fontFamily: fonts.bodySemi, fontSize: 14 },
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
