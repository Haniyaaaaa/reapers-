import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, useTheme } from '../../theme';

export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.cyan }]}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 20 },
  link: { fontFamily: fonts.bodyMed, fontSize: 13 },
});
