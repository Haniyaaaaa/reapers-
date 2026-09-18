import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts } from '../../theme';
import type { GameEvent } from '../../types/event';

/** Aesthetic downloadable "pass" for an approved paid-event applicant — captured to an image
 * via react-native-view-shot at the call site, so every style here must be plain RN styles
 * (no CyberCutBox glass/blur effects that wouldn't rasterize identically). Ticket-stub layout
 * (main slip + perforated stub) is the universal visual grammar for "this is your ticket". */
export function EventPassCard({
  event,
  attendeeName,
  attendeeAvatarSource,
  reservationCode,
  formattedDate,
  startTime,
  endTime,
}: {
  event: GameEvent;
  attendeeName: string;
  attendeeAvatarSource?: ImageSourcePropType;
  reservationCode: string;
  formattedDate: string;
  startTime: string;
  endTime: string;
}) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#0E1423', '#1A1030']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mainSlip}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>REAPERS PASS</Text>
          <Ionicons name="ticket-outline" size={16} color="#00E5FF" />
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.attendeeRow}>
          {attendeeAvatarSource ? (
            <Image source={attendeeAvatarSource} style={styles.attendeeAvatar} />
          ) : (
            <View style={[styles.attendeeAvatar, styles.attendeeAvatarFallback]}>
              <Ionicons name="person" size={18} color="#00E5FF" />
            </View>
          )}
          <View>
            <Text style={styles.attendeeLabel}>ATTENDEE</Text>
            <Text style={styles.attendeeName}>{attendeeName}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>DATE</Text>
            <Text style={styles.detailValue}>{formattedDate}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>TIME</Text>
            <Text style={styles.detailValue}>
              {startTime} – {endTime}
            </Text>
          </View>
        </View>
        <View style={styles.detailsGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>{event.type.toUpperCase()}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {event.location || 'Online'}
            </Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>PRICE</Text>
            <Text style={styles.detailValue}>
              {event.currency || 'PKR'} {event.price}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Perforated divider between main slip and stub */}
      <View style={styles.perfRow}>
        <View style={styles.notchLeft} />
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} style={styles.perfDot} />
        ))}
        <View style={styles.notchRight} />
      </View>

      <LinearGradient colors={['#1A1030', '#0E1423']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stub}>
        <View style={styles.approvedBadge}>
          <Ionicons name="checkmark-circle" size={13} color="#3DDC84" />
          <Text style={styles.approvedBadgeText}>APPROVED</Text>
        </View>
        <View>
          <Text style={styles.codeLabel}>RESERVATION CODE</Text>
          <Text style={styles.codeValue}>{reservationCode}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const RADIUS = 14;

const styles = StyleSheet.create({
  wrap: {
    width: 320,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  mainSlip: {
    padding: 18,
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#00E5FF',
  },
  eventTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  attendeeAvatarFallback: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeLabel: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  attendeeName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailCol: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
  },
  detailValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14,
    backgroundColor: '#090F1C',
  },
  notchLeft: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#090F1C',
    marginLeft: -7,
  },
  notchRight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#090F1C',
    marginRight: -7,
  },
  perfDot: {
    flex: 1,
    height: 2,
    marginHorizontal: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  stub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(61, 220, 132, 0.14)',
    borderColor: 'rgba(61, 220, 132, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  approvedBadgeText: {
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#3DDC84',
  },
  codeLabel: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    textAlign: 'right',
  },
  codeValue: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    letterSpacing: 1.2,
    color: '#D83CFF',
    textAlign: 'right',
  },
});
