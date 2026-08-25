import { Text } from 'react-native';
import { fonts, useTheme } from '../../theme';

export function InlineErrorText({ message }: { message: string }) {
  const { colors } = useTheme();
  return <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 12, marginTop: 4 }}>{message}</Text>;
}
