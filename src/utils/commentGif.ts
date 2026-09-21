/** post_comments only has a `text` column, so a GIF comment is stored as `[gif]<url>` in it —
 * no schema change needed, and older app builds simply show the raw link. */
const GIF_PREFIX = '[gif]';

export function encodeGifComment(uri: string): string {
  return `${GIF_PREFIX}${uri}`;
}

/** The GIF url if this comment is a GIF comment, otherwise null. */
export function parseGifComment(text: string): string | null {
  if (!text.startsWith(GIF_PREFIX)) return null;
  const uri = text.slice(GIF_PREFIX.length).trim();
  return /^https?:\/\/\S+$/.test(uri) ? uri : null;
}
