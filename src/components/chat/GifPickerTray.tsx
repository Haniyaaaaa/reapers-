import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { localGifs, searchGifs, type GifHit } from '../../data/gifSearch';
import { fonts, radius, useTheme } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/layout/KeyboardAwareScrollView';

export function GifPickerTray({ onPick, onClose }: { onPick: (uri: string) => void; onClose: () => void }) {
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
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>GIFs</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close GIF picker">
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search GIFs"
        placeholderTextColor={colors.muted2}
        style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        autoCorrect={false}
      />
      {loading ? <ActivityIndicator color={colors.cyan} style={{ marginBottom: 6 }} /> : null}
      <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.grid}>
        {hits.map((g) => (
          <GifCell key={g.id} hit={g} onPick={onPick} />
        ))}
        {!loading && hits.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No GIFs for that search.</Text> : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

/** Giphy preview URLs occasionally fail to load (rate limits, dead links) — without this the
 * cell just rendered blank with no way to tell a GIF failed from one still loading, which is
 * what "GIFs sometimes not showing" was: a silently-broken <Image>, not a real bug in the
 * grid logic. Shows a retry affordance instead of nothing. */
function GifCell({ hit, onPick }: { hit: GifHit; onPick: (uri: string) => void }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) {
    return (
      <Pressable
        onPress={() => { setFailed(false); setAttempt((a) => a + 1); }}
        style={[styles.cell, styles.failedCell, { borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading GIF"
      >
        <Ionicons name="refresh" size={18} color={colors.muted} />
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => onPick(hit.uri)} style={styles.cell} accessibilityRole="button" accessibilityLabel="Send GIF">
      <Image key={attempt} source={{ uri: hit.preview }} style={styles.img} onError={() => setFailed(true)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radius.md, padding: 10, marginBottom: 8, maxHeight: 280 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { fontFamily: fonts.bodySemi, fontSize: 13, fontWeight: '700' },
  failedCell: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  search: { borderWidth: 1, borderRadius: radius.pill, minHeight: 40, paddingHorizontal: 12, fontFamily: fonts.body, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', aspectRatio: 1.15, padding: 3 },
  img: { width: '100%', height: '100%', borderRadius: 10 },
});
