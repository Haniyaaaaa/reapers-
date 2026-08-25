import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export function VerifiedBadge() {
  const { colors } = useTheme();
  return <Ionicons name="checkmark-circle" size={16} color={colors.cyan} accessibilityLabel="Verified" />;
}
