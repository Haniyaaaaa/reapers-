export type GifHit = { id: string; uri: string; preview: string };

export const chatGifs: { id: string; label: string; uri: string }[] = [
  { id: 'gg', label: 'GG win', uri: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'win', label: 'Win celebrate', uri: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { id: 'hype', label: 'Hype fire', uri: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif' },
  { id: 'nice', label: 'Nice clap', uri: 'https://media.giphy.com/media/xT0xeJpnrWC7PTgiI0/giphy.gif' },
  { id: 'sad', label: 'Tilt sad', uri: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif' },
  { id: 'play', label: 'Queue play', uri: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  { id: 'lol', label: 'Laugh lol', uri: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
  { id: 'wow', label: 'Wow shock', uri: 'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif' },
  { id: 'nope', label: 'Nope no', uri: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif' },
  { id: 'game', label: 'Gaming controller', uri: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif' },
  { id: 'dance', label: 'Dance hype', uri: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { id: 'yes', label: 'Yes nod', uri: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
];

export function localGifs(query: string): GifHit[] {
  const needle = query.trim().toLowerCase();
  return chatGifs
    .filter((g) => !needle || g.label.toLowerCase().includes(needle) || g.id.includes(needle))
    .map((g) => ({ id: g.id, uri: g.uri, preview: g.uri }));
}

function mapTenor(json: {
  results?: { id: string; media?: { tinygif?: { url: string }; gif?: { url: string } }[] }[];
}): GifHit[] {
  return (
    json.results
      ?.map((r) => {
        const media = r.media?.[0];
        const uri = media?.gif?.url ?? media?.tinygif?.url;
        const preview = media?.tinygif?.url ?? uri;
        return uri ? { id: `t-${r.id}`, uri, preview: preview ?? uri } : null;
      })
      .filter((x): x is GifHit => !!x) ?? []
  );
}

function mapGiphy(json: {
  data?: { id: string; images?: { downsized?: { url: string }; preview_gif?: { url: string } } }[];
}): GifHit[] {
  return (
    json.data
      ?.map((d) => {
        const uri = d.images?.downsized?.url ?? d.images?.preview_gif?.url;
        const preview = d.images?.preview_gif?.url ?? uri;
        return uri ? { id: `g-${d.id}`, uri, preview: preview ?? uri } : null;
      })
      .filter((x): x is GifHit => !!x) ?? []
  );
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function searchGifs(query: string): Promise<GifHit[]> {
  const local = localGifs(query);
  const q = query.trim() || 'gaming funny';
  try {
    const tenorPath = query.trim()
      ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=LIVDSRZULELA&limit=24&media_filter=minimal`
      : `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=24&media_filter=minimal`;
    const json = await fetchJson(tenorPath);
    const hits = json ? mapTenor(json) : [];
    if (hits.length) return [...local, ...hits.filter((h) => !local.some((l) => l.uri === h.uri))];
  } catch {
    /* next */
  }
  try {
    const json = await fetchJson(
      `https://api.giphy.com/v1/gifs/search?api_key=hpvZycW58tr6vsyzkl1xNXsQDxN4tw3u&q=${encodeURIComponent(q)}&limit=24&rating=pg-13`,
    );
    const hits = json ? mapGiphy(json) : [];
    if (hits.length) return [...local, ...hits.filter((h) => !local.some((l) => l.uri === h.uri))];
  } catch {
    /* local only */
  }
  return local;
}
