import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CyberCutBox } from '../cyber/CyberCutBox';
import { fonts } from '../../theme';

const DEFAULT_DEV_AVATAR = require('../../../assets/avatars/extracted/female_10.jpg');

interface CyberDeveloperCardProps {
  id: string;
  name: string;
  role: string;
  matchScore: string;
  avatarSource?: ImageSourcePropType;
  avatarUri?: string;
  status?: 'connect' | 'pending' | 'connected';
  onPress?: () => void;
  onConnect?: () => void;
}

export function CyberDeveloperCard({
  name,
  role,
  matchScore,
  avatarSource,
  avatarUri,
  status = 'connect',
  onPress,
  onConnect,
}: CyberDeveloperCardProps) {
  const resolvedSource = avatarUri ? { uri: avatarUri } : avatarSource || DEFAULT_DEV_AVATAR;

  return (
    <Pressable onPress={onPress} style={styles.cardContainer} accessibilityRole="button">
      {/* Outer Chamfer-Cut Purple Gradient Card */}
      <CyberCutBox
        cutSize={12}
        radius={6}
        gradient
        style={styles.cutCard}
      >
        <LinearGradient
          colors={['#8A2BE2', '#6D35FF', '#C026D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          {/* Avatar in Framed Box */}
          <View style={styles.avatarBox}>
            <Image source={resolvedSource} style={styles.avatarImg} />
          </View>

          {/* Developer Name */}
          <Text style={styles.nameText} numberOfLines={1}>
            {name}
          </Text>

          {/* Role */}
          <Text style={styles.roleText} numberOfLines={1}>
            {role}
          </Text>

          {/* Match Score Capsule */}
          <View style={styles.matchPill}>
            <Text style={styles.matchText}>{matchScore} MATCH</Text>
          </View>

          {/* Connect Button */}
          <Pressable
            onPress={onConnect}
            disabled={status !== 'connect'}
            style={styles.connectBtn}
            accessibilityRole="button"
          >
            <CyberCutBox
              cutSize={6}
              radius={3}
              // Deliberately not the app's usual `rgba(9, 15, 28, ...)` dark-card fill — this
              // pill sits on a vivid purple/magenta gradient regardless of light/dark theme,
              // so it needs its own fixed dark overlay rather than the theme's card-fill
              // remap (which would turn it near-white and make the white text unreadable).
              fill={status === 'connect' ? '#FFFFFF' : 'rgba(0, 0, 0, 0.35)'}
              glass={false}
              borderColor={status === 'connect' ? 'transparent' : 'rgba(255, 255, 255, 0.35)'}
              borderWidth={status === 'connect' ? 0 : 1}
              style={styles.connectCutBox}
            >
              <Text style={[styles.connectText, status !== 'connect' && styles.connectTextInactive]}>
                {status === 'connected' ? 'Connected' : status === 'pending' ? 'Pending' : 'Connect'}
              </Text>
            </CyberCutBox>
          </Pressable>
        </LinearGradient>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 146,
    marginRight: 12,
  },
  cutCard: {
    width: '100%',
    overflow: 'hidden',
  },
  gradientCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  nameText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  roleText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  matchPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
  },
  matchText: {
    fontFamily: fonts.monoBold,
    fontSize: 8.5,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  connectBtn: {
    width: '100%',
    height: 28,
  },
  connectCutBox: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    fontWeight: '700',
    color: '#6D35FF',
  },
  connectTextInactive: {
    color: '#FFFFFF',
  },
});
