import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme';

/** The close (X) button in the top-right of every glass sheet — a round, translucent chip that sits
 * on the glass without competing with the title. Large hit area so it's easy to tap. */
export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  const { colors, light } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Close"
      style={[styles.btn, { backgroundColor: light ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.10)', borderColor: light ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.2)' }]}
    >
      <Ionicons name="close" size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
