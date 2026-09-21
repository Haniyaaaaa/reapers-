import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { MainStackParamList } from '../../../navigation/types';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { useAuth } from '../../../hooks/useAuth';
import { fonts, radius, useTheme } from '../../../theme';

export function CreateHubScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { isDeveloper } = useAuth();
  const { colors } = useTheme();
  const items = [
    { label: 'Create room', route: 'CreateRoom' as const },
    { label: 'Post team request', route: 'PostTeamRequest' as const },
    ...(isDeveloper
      ? [
          { label: 'Create event', route: 'CreateEvent' as const },
          { label: 'Upload demo', route: 'DemoUpload' as const },
        ]
      : []),
  ];

  return (
    <Screen footerPad={false}>
      <ScreenHeader title="Create" onBack={() => nav.goBack()} />
      {items.map((item) => (
        <Pressable
          key={item.route}
          onPress={() => nav.replace(item.route)}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
        >
          <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  label: { fontFamily: fonts.bodySemi, fontSize: 16 },
});
