import { supabase } from './client';
import type { PostCommentRow, PostKind, PostRow } from './types';
import type { FeedPost, PostComment } from '../../types/post';

const FEED_PAGE_SIZE = 20;
const COMMENTS_PAGE_SIZE = 50;

type ReactionCountRow = { post_id: string; user_id: string; emoji: string };
type AuthorRow = { id: string; display_name: string; avatar_uri: string | null; avatar_id: string | null };

function groupReactions(rows: ReactionCountRow[], postId: string, myUserId: string) {
  const forPost = rows.filter((r) => r.post_id === postId);
  const byEmoji = new Map<string, ReactionCountRow[]>();
  for (const r of forPost) {
    const list = byEmoji.get(r.emoji) ?? [];
    list.push(r);
    byEmoji.set(r.emoji, list);
  }
  return Array.from(byEmoji.entries()).map(([emoji, rows]) => ({
    emoji,
    count: rows.length,
    mine: rows.some((r) => r.user_id === myUserId),
  }));
}

const authorCache = new Map<string, AuthorRow>();

async function resolveAuthors(userIds: string[]): Promise<Map<string, AuthorRow>> {
  const missing = userIds.filter((id) => !authorCache.has(id));
  if (missing.length) {
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_uri, avatar_id').in('id', missing);
    for (const row of data ?? []) authorCache.set(row.id, row);
  }
  return authorCache;
}

function rowToFeedPost(row: PostRow, author: AuthorRow | undefined, reactions: { emoji: string; count: number; mine: boolean }[], commentCount: number, myUserId: string): FeedPost {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: author?.display_name ?? 'Someone',
    authorAvatarUri: author?.avatar_uri ?? undefined,
    authorAvatarId: author?.avatar_id ?? undefined,
    kind: row.kind,
    content: row.content,
    activityTag: row.activity_tag ?? undefined,
    mediaUrl: row.media_url ?? undefined,
    mediaThumbnailUrl: row.media_thumbnail_url ?? undefined,
    createdAt: row.created_at,
    reactions: reactions.length ? reactions : undefined,
    commentCount,
    mine: row.user_id === myUserId,
  };
}

/** Batch-hydrates a page of raw post rows into FeedPosts: one query for reaction rows, one for
 * comment-count rows, one for author profiles — never N+1 per post. Shared by listFeed and
 * loadNewest so both stay consistent. */
async function hydratePosts(rows: PostRow[], myUserId: string): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [{ data: reactions }, { data: commentRows }, authors] = await Promise.all([
    supabase.from('post_reactions').select('post_id, user_id, emoji').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
    resolveAuthors(Array.from(new Set(rows.map((r) => r.user_id)))),
  ]);
  const commentCounts = new Map<string, number>();
  for (const c of commentRows ?? []) commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);

  return rows.map((row) => rowToFeedPost(row, authors.get(row.user_id), groupReactions(reactions ?? [], row.id, myUserId), commentCounts.get(row.id) ?? 0, myUserId));
}

/** Cursor-paginated (created_at/before), not offset-based — a global feed at real scale has
 * enough insert velocity that LIMIT/OFFSET pages silently drift (skip/repeat rows) as new posts
 * land ahead of the offset window. Mirrors chat.ts's listMessages exactly. */
export async function listFeed(myUserId: string, opts?: { before?: string; limit?: number }): Promise<{ rows: FeedPost[]; hasMore: boolean }> {
  const limit = opts?.limit ?? FEED_PAGE_SIZE;
  let query = supabase.from('posts').select('*').eq('deleted', false).order('created_at', { ascending: false }).limit(limit);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  return { rows: await hydratePosts(rows, myUserId), hasMore: rows.length === limit };
}

/** Powers the "New posts" banner — a cheap count, not a fetch, so polling it (or calling it
 * from a realtime INSERT handler) doesn't pull full rows just to know whether to show a pill. */
export async function countNewerPosts(sinceCreatedAt: string): Promise<number> {
  const { count, error } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('deleted', false).gt('created_at', sinceCreatedAt);
  if (error) throw error;
  return count ?? 0;
}

/** The actual fetch once the "New posts" banner is tapped — everything newer than the feed's
 * current newest-known cursor, newest-first (same order the feed array is already in, so the
 * caller can prepend directly). Capped at a sane bound even though this should rarely exceed a
 * handful of posts between two checks. */
export async function loadNewest(myUserId: string, sinceCreatedAt: string): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('deleted', false)
    .gt('created_at', sinceCreatedAt)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return hydratePosts(data ?? [], myUserId);
}

/** Same cursor-pagination shape as listFeed, scoped to one author — powers the "My Posts"
 * screen. Deleted posts stay excluded; a soft-deleted post shouldn't reappear in your own list
 * either. */
export async function listMyPosts(userId: string, opts?: { before?: string; limit?: number }): Promise<{ rows: FeedPost[]; hasMore: boolean }> {
  const limit = opts?.limit ?? FEED_PAGE_SIZE;
  let query = supabase.from('posts').select('*').eq('user_id', userId).eq('deleted', false).order('created_at', { ascending: false }).limit(limit);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  return { rows: await hydratePosts(rows, userId), hasMore: rows.length === limit };
}

export async function createPost(input: { userId: string; kind: PostKind; content: string; activityTag?: string; mediaUrl?: string; mediaThumbnailUrl?: string }): Promise<FeedPost> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: input.userId,
      kind: input.kind,
      content: input.content,
      activity_tag: input.activityTag,
      media_url: input.mediaUrl,
      media_thumbnail_url: input.mediaThumbnailUrl,
    })
    .select()
    .single();
  if (error) throw error;
  const authors = await resolveAuthors([input.userId]);
  return rowToFeedPost(data, authors.get(input.userId), [], 0, input.userId);
}

/** A real row removal — the author retracting their own post entirely. RLS
 * (posts_delete_own_or_admin) scopes this to the caller's own posts already; the explicit
 * .eq is defense in depth, not the actual security boundary. */
export async function deletePost(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/** The author editing their own post's text. RLS (posts_update_own_or_admin) plus
 * enforce_post_update_columns scope this to the caller's own posts and pin every other
 * column — the explicit .eq is defense in depth, not the actual security boundary. */
export async function updatePost(id: string, userId: string, content: string): Promise<void> {
  const { error } = await supabase.from('posts').update({ content }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/** Admin moderation path — always a soft delete (never a real DELETE) so a reported post stays
 * auditable. enforce_post_update_columns locks every other column against this update. */
export async function adminSoftDeletePost(id: string, adminId: string): Promise<void> {
  const { error } = await supabase.from('posts').update({ deleted: true, deleted_by: adminId, deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function toggleReaction(postId: string, userId: string, emoji: string, currentlyMine: boolean): Promise<void> {
  if (currentlyMine) {
    const { error } = await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, emoji });
    if (error) throw error;
  }
}

function commentRowToComment(row: PostCommentRow, author: AuthorRow | undefined): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: author?.display_name ?? 'Someone',
    avatarId: author?.avatar_id ?? undefined,
    avatarUri: author?.avatar_uri ?? undefined,
    text: row.text,
    createdAt: row.created_at,
  };
}

/** Real cursor pagination (unlike demo_comments' flat 200-row cap) — a public global post can
 * plausibly exceed that within this app's own user base. */
export async function listComments(postId: string, opts?: { before?: string; limit?: number }): Promise<{ rows: PostComment[]; hasMore: boolean }> {
  const limit = opts?.limit ?? COMMENTS_PAGE_SIZE;
  let query = supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: false }).limit(limit);
  if (opts?.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return { rows: [], hasMore: false };
  const authors = await resolveAuthors(Array.from(new Set(rows.map((r) => r.user_id))));
  return { rows: rows.map((r) => commentRowToComment(r, authors.get(r.user_id))), hasMore: rows.length === limit };
}

export async function addComment(postId: string, userId: string, text: string): Promise<PostComment> {
  const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, text }).select().single();
  if (error) throw error;
  const authors = await resolveAuthors([userId]);
  return commentRowToComment(data, authors.get(userId));
}

export async function updateComment(id: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase.from('post_comments').update({ text }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteComment(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
