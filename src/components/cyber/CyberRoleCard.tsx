import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts, useTheme } from '../../theme';
import { CyberCutBox } from './CyberCutBox';

interface CyberRoleCardProps {
  title: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CyberRoleCard({
  title,
  tagline,
  description,
  icon,
  selected,
  onPress,
  style,
}: CyberRoleCardProps) {
  const { colors, isLight } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        style,
      ]}
    >
      <CyberCutBox
        cutSize={14}
        radius={6}
        fill={selected ? (isLight ? 'rgba(109, 53, 255, 0.08)' : 'rgba(21, 25, 48, 0.9)') : (isLight ? colors.cardFill : 'rgba(12, 17, 30, 0.8)')}
        borderColor={selected ? '#6D35FF' : (isLight ? colors.cardBorder : 'rgba(255, 255, 255, 0.1)')}
        borderWidth={selected ? 1.5 : 1}
        style={styles.card}
      >
        <View style={styles.contentRow}>
          {/* Role Icon Container */}
          <CyberCutBox
            cutSize={8}
            radius={4}
            gradient={selected}
            fill={selected ? undefined : (isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)')}
            style={styles.iconBox}
          >
            <View style={styles.iconInner}>
              {React.isValidElement(icon)
                ? React.cloneElement(icon as React.ReactElement<{ color?: string }>, {
                    color: selected ? '#FFFFFF' : isLight ? colors.text : '#FFFFFF',
                  })
                : icon}
            </View>
          </CyberCutBox>

          {/* Texts */}
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
              {selected && (
                <Ionicons name="checkmark-sharp" size={18} color="#D83CFF" style={styles.checkIcon} />
              )}
            </View>
            <Text style={[styles.tagline, { color: isLight ? colors.electricAccent : '#8E9BB5' }]}>{tagline}</Text>
            <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
          </View>
        </View>
      </CyberCutBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    marginBottom: 14,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  card: {
    width: '100%',
    padding: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    marginTop: 2,
  },
  iconInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  titleSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 2,
  },
  tagline: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8E9BB5',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#8E9BB5',
  },
});
