import { StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../../theme';
import { CyberSeeAllButton } from '../cyber/CyberSeeAllButton';

export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {onSeeAll ? <CyberSeeAllButton onPress={onSeeAll} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 20 },
});
