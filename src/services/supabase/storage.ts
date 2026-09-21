import { File, UploadTask, UploadType } from 'expo-file-system';
import { supabase, supabaseAnonKey, supabaseUrl } from './client';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { User } from '../../types/user';

function extensionFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

const BUCKET_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

/** Storage buckets only accept jpeg/png/webp/gif, but iOS pickers hand back HEIC/HEIF (and
 * other formats) — re-encode anything else to JPEG before upload so it isn't rejected. */
async function prepareImageForUpload(localUri: string): Promise<{ uri: string; ext: string }> {
  const ext = extensionFromUri(localUri);
  if (BUCKET_IMAGE_EXTS.has(ext)) return { uri: localUri, ext };
  const result = await manipulateAsync(localUri, [], { compress: 0.9, format: SaveFormat.JPEG });
  return { uri: result.uri, ext: 'jpg' };
}

/**
 * Uploads a locally-picked image (a `file://` or `content://` URI from expo-image-picker) to
 * a public-read Storage bucket and returns its public URL. Used for avatars now; the same
 * helper is reused for event covers / community logos in later phases.
 */
export async function uploadImage(bucket: string, ownerId: string, localUri: string): Promise<string> {
  const prepared = await prepareImageForUpload(localUri);
  const ext = prepared.ext;
  const path = `${ownerId}/${Date.now()}.${ext}`;
  const response = await fetch(prepared.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  return uploadImage('avatars', userId, localUri);
}

/**
 * Posts a locally-picked video (a `file://` URI from expo-image-picker's video mode) to a
 * Storage bucket via expo-file-system's UploadTask instead of a single fetch()+arrayBuffer()
 * call, so real byte-progress is available — worth it for anything that can be a large video
 * (avatars/thumbnails/event covers stay on the simple fetch-based path, all ≤5MB). Hits the
 * same endpoint shape supabase-js's own `.upload()` posts to
 * (`{url}/storage/v1/object/{bucket}/{path}`, raw binary body, not multipart).
 */
async function uploadVideoWithProgress(
  bucket: string,
  path: string,
  localUri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const ext = extensionFromUri(localUri) || 'mp4';
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const file = new File(localUri);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  const task = new UploadTask(file, uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey!,
      'Content-Type': `video/${ext}`,
      'x-upsert': 'true',
    },
    onProgress: (p) => onProgress?.(p.totalBytes > 0 ? p.bytesSent / p.totalBytes : 0),
  });
  const result = await task.uploadAsync();
  if (result.status >= 400) {
    throw new Error(`Video upload failed (${result.status}): ${result.body}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Keyed to the demo id so the video can be uploaded before the `demos` row exists yet —
 * createDemo() needs the resulting URL in its insert. */
export async function uploadDemoVideo(
  developerId: string,
  demoKey: string,
  localUri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const ext = extensionFromUri(localUri) || 'mp4';
  return uploadVideoWithProgress('demo-videos', `${developerId}/${demoKey}.${ext}`, localUri, onProgress);
}

/** Shared photo upload for chat messages — same public bucket/owner-folder convention as
 * uploadAvatar, just a different bucket (chat-media, 0032_message_media_and_hides.sql). */
export async function uploadChatImage(userId: string, localUri: string): Promise<string> {
  return uploadImage('chat-media', userId, localUri);
}

/** Shared video upload for chat messages — same byte-progress path as uploadDemoVideo, just
 * against the chat-media bucket and keyed by timestamp instead of a demo id. */
export async function uploadChatVideo(userId: string, localUri: string, onProgress?: (fraction: number) => void): Promise<string> {
  const ext = extensionFromUri(localUri) || 'mp4';
  return uploadVideoWithProgress('chat-media', `${userId}/${Date.now()}.${ext}`, localUri, onProgress);
}

/** Voice message upload — recordings are always small (a chat clip, not a demo video), so
 * this reuses uploadImage's simple single-shot fetch()+arrayBuffer path instead of
 * uploadVideoWithProgress's byte-progress machinery. `expo-audio`'s HIGH_QUALITY preset always
 * outputs `.m4a`. */
export async function uploadChatVoice(userId: string, localUri: string): Promise<string> {
  const path = `${userId}/${Date.now()}.m4a`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from('chat-media').upload(path, arrayBuffer, {
    contentType: 'audio/m4a',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
  return data.publicUrl;
}

/** Photo-post upload — its own bucket (post-media), not chat-media: posts are public/global
 * with their own soft-delete/report lifecycle, distinct from chat-media's room-membership-
 * scoped visibility and per-message hide semantics. */
export async function uploadPostImage(userId: string, localUri: string): Promise<string> {
  return uploadImage('post-media', userId, localUri);
}

/** Its own bucket (demo-screenshots), not demo-thumbnails — a demo can have several
 * screenshots but only ever one thumbnail, and keeping them separate means removing/replacing
 * screenshots never risks touching the thumbnail shown in feed cards. Keyed by index since a
 * demo can have several. */
export async function uploadDemoScreenshot(developerId: string, demoKey: string, localUri: string, index: number): Promise<string> {
  const prepared = await prepareImageForUpload(localUri);
  const ext = prepared.ext;
  const path = `${developerId}/${demoKey}-${index}.${ext}`;
  const response = await fetch(prepared.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from('demo-screenshots').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('demo-screenshots').getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort cleanup for a public Storage URL produced by uploadImage/uploadVideo/etc —
 * used when a later step (e.g. the demos row insert) fails after the file already uploaded,
 * so a failed demo upload doesn't leave an orphaned file behind forever. Never throws — a
 * cleanup failure must not mask the original error that triggered it. */
export async function deleteObjectByPublicUrl(bucket: string, publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(bucket).remove([path]);
}

export async function uploadDemoThumbnail(developerId: string, demoKey: string, localUri: string): Promise<string> {
  const path = `${developerId}/${demoKey}`;
  const prepared = await prepareImageForUpload(localUri);
  const ext = prepared.ext;
  const fullPath = `${path}.${ext}`;
  const response = await fetch(prepared.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from('demo-thumbnails').upload(fullPath, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('demo-thumbnails').getPublicUrl(fullPath);
  return data.publicUrl;
}

/**
 * Uploads a bank-transfer proof screenshot to the private event-payment-proofs bucket.
 * Returns the storage *path*, not a URL — the bucket is private (bank-transfer screenshots
 * aren't public content), so viewers need a short-lived signed URL, generated on demand via
 * getPaymentProofSignedUrl below, never a permanent link. Path shape
 * `{applicantId}/{eventId}/{timestamp}.{ext}` matches the RLS policy on storage.objects
 * (0024_event_payment_applications.sql), which checks folder 1 for the uploader and folder 2
 * (joined to events.host_id) for the event's host.
 */
export async function uploadPaymentProof(applicantId: string, eventId: string, localUri: string): Promise<string> {
  const prepared = await prepareImageForUpload(localUri);
  const ext = prepared.ext;
  const path = `${applicantId}/${eventId}/${Date.now()}.${ext}`;
  const response = await fetch(prepared.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage.from('event-payment-proofs').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Best-effort cleanup for a payment-proof path — mirrors deleteObjectByPublicUrl's role for
 * demos, adapted for a private bucket where we store the path directly rather than a URL.
 * Never throws. */
export async function deletePaymentProof(path: string): Promise<void> {
  await supabase.storage.from('event-payment-proofs').remove([path]);
}

/** Short-lived (5 minute) signed URL for viewing a payment-proof screenshot — called fresh
 * each time the review screen renders one, never cached/stored, since the bucket is private. */
export async function getPaymentProofSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('event-payment-proofs').createSignedUrl(path, 300);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

/**
 * `AvatarPicker` hands back a local device URI (file://…) when the user picks a custom
 * photo. Profile updates must never write that local URI into `profiles.avatar_uri` — it's
 * meaningless off-device. This uploads it to Storage first and swaps in the resulting public
 * URL, leaving everything else in the partial untouched.
 */
export async function uploadAvatarIfLocal(userId: string, partial: Partial<User>): Promise<Partial<User>> {
  if (!partial.avatarUri || !/^(file|content|ph):\/\//.test(partial.avatarUri)) {
    return partial;
  }
  const publicUrl = await uploadAvatar(userId, partial.avatarUri);
  return { ...partial, avatarUri: publicUrl };
}
