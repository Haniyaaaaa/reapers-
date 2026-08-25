import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { localGifs, searchGifs, type GifHit } from '../../data/gifSearch';
import { fonts, radius, useTheme } from '../../theme';

export function GifPickerTray({ onPick }: { onPick: (uri: string) => void }) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<GifHit[]>(() => localGifs(''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setHits(localGifs(q));
    setLoading(true);
    const t = setTimeout(() => {
      searchGifs(q)
        .then((rows) => {
          if (!live) return;
          setHits(rows.length ? rows : localGifs(q));
        })
        .catch(() => {
          if (live) setHits(localGifs(q));
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search GIFs"
        placeholderTextColor={colors.muted2}
        style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        autoCorrect={false}
      />
      {loading ? <ActivityIndicator color={colors.cyan} style={{ marginBottom: 6 }} /> : null}
      <ScrollView contentContainerStyle={styles.grid}>
        {hits.map((g) => (
          <Pressable key={g.id} onPress={() => onPick(g.uri)} style={styles.cell} accessibilityRole="button" accessibilityLabel="Send GIF">
            <Image source={{ uri: g.preview }} style={styles.img} />
          </Pressable>
        ))}
        {!loading && hits.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No GIFs for that search.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radius.md, padding: 10, marginBottom: 8, maxHeight: 280 },
  search: { borderWidth: 1, borderRadius: radius.pill, minHeight: 40, paddingHorizontal: 12, fontFamily: fonts.body, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', aspectRatio: 1.15, padding: 3 },
  img: { width: '100%', height: '100%', borderRadius: 10 },
});
