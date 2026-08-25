import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const ICONS = ['home', 'chatbubbles', 'game-controller', 'ribbon'] as const;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, gradients } = useTheme();
  const left = state.routes.slice(0, 2);
  const right = state.routes.slice(2);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityLabel={route.name.replace('Tab', '')}
      >
        <Ionicons name={ICONS[index]} size={22} color={focused ? colors.magenta : colors.muted} />
        {focused ? <View style={[styles.dot, { backgroundColor: colors.magenta }]} /> : <View style={styles.dotSlot} />}
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {left.map(renderTab)}
        <Pressable
          onPress={() => navigation.getParent()?.navigate('CreateHub')}
          style={styles.fabSlot}
          accessibilityRole="button"
          accessibilityLabel="Create"
        >
          <LinearGradient colors={gradients.fab} style={styles.fab}>
            <Ionicons name="add" size={22} color={colors.onPrimary} />
          </LinearGradient>
        </Pressable>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  bar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 },
  fabSlot: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotSlot: { width: 4, height: 4 },
});
