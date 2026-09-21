import { supabase } from './client';
import type { DemoCommentRow, DemoInsert, DemoReviewRow, DemoRow, DemoUpdate } from './types';
import type { Demo, RubricScores } from '../../types/demo';
import type { DemoComment, Review } from '../../types/extra';
import { PAGE_SIZE, toPage, type Page } from './pagination';

type DemoRowWithDeveloper = DemoRow & {
  profiles: { display_name: string; avatar_uri: string | null; avatar_id: string | null } | null;
};

/**
 * Same adapter pattern as profiles.ts: the app's existing camelCase `Demo` type (consumed by
 * DemoCard/DemoFeedScreen/etc, built long before this backend existed) stays the UI-facing
 * shape. This is the only place that reads the DB row shape directly.
 */
export function demoRowToDemo(row: DemoRowWithDeveloper): Demo {
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    description: row.description,
    thumbnail: row.thumbnail_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    durationSec: row.duration_sec,
    developerId: row.developer_id,
    developerName: row.profiles?.display_name ?? 'Unknown dev',
    developerAvatar: row.profiles?.avatar_uri ?? row.profiles?.avatar_id ?? undefined,
    scores: {
      gameplay: row.score_gameplay,
      art: row.score_art,
      concept: row.score_concept,
      polish: row.score_polish,
    },
    reviewCount: row.review_count,
    externalUrl: row.external_url ?? undefined,
    isJamEntry: row.is_jam_entry,
    playCount: row.play_count,
    screenshotUrls: row.screenshot_urls,
    tags: row.tags,
    platforms: row.platforms,
    portfolioUrl: row.portfolio_url ?? undefined,
    pressKitUrl: row.press_kit_url ?? undefined,
    createdAt: row.created_at,
  };
}

function commentRowToComment(row: DemoCommentRow, userName: string, avatarId?: string | null): DemoComment {
  return {
    id: row.id,
    demoId: row.demo_id,
    userId: row.user_id,
    userName,
    avatarId: avatarId ?? undefined,
    text: row.text,
    createdAt: row.created_at,
    likes: row.likes_count,
  };
}

// Disambiguated FK name required as of the demo_bookmarks migration (0042): that table's own
// demo_id/user_id FKs give PostgREST a second (many-to-many, via demo_bookmarks) path between
// demos and profiles alongside the real one (demos.developer_id -> profiles.id), so a bare
// `profiles(...)` embed became ambiguous (PGRST201) and every demos query started failing.
const DEMO_SELECT = '*, profiles!demos_developer_id_fkey(display_name, avatar_uri, avatar_id)';

export type DemoFilters = {
  sort?: 'new' | 'top_rated';
  jamOnly?: boolean;
  /** Within one list any value matches (OR); across lists every list must match (AND). */
  genres?: string[];
  engines?: string[];
  platforms?: string[];
  tags?: string[];
  /** Free-text search across title, description, genre/engine, tags, platforms and developer name. */
  search?: string;
};

/** PostgREST `.or()` filter strings are comma/paren-delimited and `ilike` treats % and _ as
 * wildcards, so user-typed custom values are stripped of those before being interpolated. */
function safeFilterValue(v: string): string {
  return v.replace(/[,()%_*\\]/g, ' ').trim();
}

export async function listDemos(
  offset = 0,
  limit = PAGE_SIZE,
  opts?: DemoFilters,
): Promise<Page<Demo>> {
  let query = supabase.from('demos').select(DEMO_SELECT);
  if (opts?.jamOnly) query = query.eq('is_jam_entry', true);
  // demos.genre stores "Genre · Engine" in a single string (see DemoUploadScreen).
  const genres = (opts?.genres ?? []).map(safeFilterValue).filter(Boolean);
  if (genres.length) query = query.or(genres.map((g) => `genre.ilike.${g} · %`).join(','));
  const engines = (opts?.engines ?? []).map(safeFilterValue).filter(Boolean);
  if (engines.length) query = query.or(engines.map((e) => `genre.ilike.% · ${e}`).join(','));
  if (opts?.platforms?.length) query = query.overlaps('platforms', opts.platforms);
  const term = safeFilterValue(opts?.search ?? '');
  if (term) {
    // Developer names live on profiles, so resolve matching developers first and OR their ids in.
    const { data: devs } = await supabase.from('profiles').select('id').ilike('display_name', `%${term}%`).limit(50);
    const clauses = [
      `title.ilike.%${term}%`,
      `description.ilike.%${term}%`,
      `genre.ilike.%${term}%`,
      `tags.cs.{${term.toUpperCase()}}`,
      `platforms.cs.{${term.toUpperCase()}}`,
    ];
    if (devs?.length) clauses.push(`developer_id.in.(${devs.map((p) => p.id).join(',')})`);
    query = query.or(clauses.join(','));
  }
  if (opts?.tags?.length) query = query.overlaps('tags', opts.tags);
  query =
    opts?.sort === 'top_rated'
      ? query.order('total_score', { ascending: false }).order('review_count', { ascending: false })
      : query.order('created_at', { ascending: false });
  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  const page = toPage(data as unknown as DemoRowWithDeveloper[] | null, limit);
  return { rows: page.rows.map(demoRowToDemo), hasMore: page.hasMore };
}

/** Every genre/engine/platform/tag value actually in use across demos (custom ones included),
 * so the filter sheet can offer them alongside the presets. */
export async function listDemoFacets(): Promise<{ genres: string[]; engines: string[]; platforms: string[]; tags: string[] }> {
  const { data, error } = await supabase.from('demos').select('genre, platforms, tags').limit(1000);
  if (error) throw error;
  const genres = new Set<string>();
  const engines = new Set<string>();
  const platforms = new Set<string>();
  const tags = new Set<string>();
  for (const row of data ?? []) {
    const [g, ...rest] = (row.genre ?? '').split(' · ');
    if (g) genres.add(g);
    if (rest.length) engines.add(rest.join(' · '));
    (row.platforms ?? []).forEach((p: string) => platforms.add(p));
    (row.tags ?? []).forEach((t: string) => tags.add(t));
  }
  return { genres: [...genres], engines: [...engines], platforms: [...platforms], tags: [...tags] };
}

export async function getDemo(id: string): Promise<Demo | null> {
  const { data, error } = await supabase.from('demos').select(DEMO_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? demoRowToDemo(data as unknown as DemoRowWithDeveloper) : null;
}

export async function listDemosByDeveloper(developerId: string): Promise<Demo[]> {
  const { data, error } = await supabase
    .from('demos')
    .select(DEMO_SELECT)
    .eq('developer_id', developerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as DemoRowWithDeveloper[]).map(demoRowToDemo);
}

export async function createDemo(input: DemoInsert): Promise<Demo> {
  const { data, error } = await supabase.from('demos').insert(input).select(DEMO_SELECT).single();
  if (error) throw error;
  return demoRowToDemo(data as unknown as DemoRowWithDeveloper);
}

export async function updateDemo(id: string, patch: DemoUpdate): Promise<Demo> {
  const { data, error } = await supabase.from('demos').update(patch).eq('id', id).select(DEMO_SELECT).single();
  if (error) throw error;
  return demoRowToDemo(data as unknown as DemoRowWithDeveloper);
}

export async function deleteDemo(id: string): Promise<void> {
  const { error } = await supabase.from('demos').delete().eq('id', id);
  if (error) throw error;
}

export async function listComments(demoId: string): Promise<DemoComment[]> {
  const { data, error } = await supabase
    .from('demo_comments')
    .select('*, profiles(display_name, avatar_id)')
    .eq('demo_id', demoId)
    .order('created_at', { ascending: false })
    .limit(200); // safety cap, not full pagination — a comment thread realistically doesn't need infinite scroll
  if (error) throw error;
  return (data as unknown as (DemoCommentRow & { profiles: { display_name: string; avatar_id: string | null } | null })[]).map((row) =>
    commentRowToComment(row, row.profiles?.display_name ?? 'Someone', row.profiles?.avatar_id),
  );
}

export async function addComment(demoId: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase.from('demo_comments').insert({ demo_id: demoId, user_id: userId, text });
  if (error) throw error;
}

export async function deleteComment(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('demo_comments').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function getMyReview(demoId: string, reviewerId: string): Promise<DemoReviewRow | null> {
  const { data, error } = await supabase
    .from('demo_reviews')
    .select('*')
    .eq('demo_id', demoId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Upserts on (demo_id, reviewer_id) — matches the DB's unique constraint, so re-reviewing
 * a demo edits the existing row rather than creating a duplicate. */
export async function submitReview(demoId: string, reviewerId: string, scores: RubricScores, comment: string): Promise<DemoReviewRow> {
  const { data, error } = await supabase
    .from('demo_reviews')
    .upsert(
      {
        demo_id: demoId,
        reviewer_id: reviewerId,
        score_gameplay: scores.gameplay,
        score_art: scores.art,
        score_concept: scores.concept,
        score_polish: scores.polish,
        comment,
      },
      { onConflict: 'demo_id,reviewer_id' },
    )
    .select()
    .single();
  if (error) {
    if (error.code === '23514') {
      throw new Error('Scores must be between 0 and 5.');
    }
    throw error;
  }
  return data;
}

/** RLS (demo_reviews_delete_own) already scopes this to the caller's own review; the explicit
 * .eq is defense in depth. recompute_demo_scores fires on this delete just like it does on
 * insert/update, so demos.rating/review_count stay accurate. */
export async function deleteReview(demoId: string, reviewerId: string): Promise<void> {
  const { error } = await supabase.from('demo_reviews').delete().eq('demo_id', demoId).eq('reviewer_id', reviewerId);
  if (error) throw error;
}

type ReviewRowWithReviewer = DemoReviewRow & { profiles: { display_name: string; avatar_id: string | null } | null };
type ReviewVoteRow = { review_id: string; voter_id: string; vote: number };

function reviewRowToReview(row: ReviewRowWithReviewer, myVote: 1 | -1 | null): Review {
  return {
    id: row.id,
    demoId: row.demo_id,
    reviewerId: row.reviewer_id,
    reviewer: row.profiles?.display_name ?? 'Someone',
    avatarId: row.profiles?.avatar_id ?? undefined,
    scores: { gameplay: row.score_gameplay, art: row.score_art, concept: row.score_concept, polish: row.score_polish },
    comment: row.comment,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    myVote,
    createdAt: row.created_at,
  };
}

/** Every review for a demo (not just the viewer's own) — batch-fetches the viewer's votes for
 * the whole page in one query rather than N+1, same convention as listMessages' reaction
 * batching. */
export async function listReviews(demoId: string, myUserId?: string): Promise<Review[]> {
  // profiles!demo_reviews_reviewer_id_fkey disambiguates the same way DEMO_SELECT above does —
  // demo_review_votes' own (review_id -> demo_reviews, voter_id -> profiles) FKs give
  // PostgREST a second path between demo_reviews and profiles alongside this direct one.
  const { data, error } = await supabase
    .from('demo_reviews')
    .select('*, profiles!demo_reviews_reviewer_id_fkey(display_name, avatar_id)')
    .eq('demo_id', demoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as ReviewRowWithReviewer[];
  if (rows.length === 0) return [];

  let myVotes = new Map<string, number>();
  if (myUserId) {
    const { data: votes } = await supabase
      .from('demo_review_votes')
      .select('review_id, voter_id, vote')
      .in('review_id', rows.map((r) => r.id))
      .eq('voter_id', myUserId);
    myVotes = new Map((votes as ReviewVoteRow[] | null ?? []).map((v) => [v.review_id, v.vote]));
  }

  return rows.map((row) => reviewRowToReview(row, (myVotes.get(row.id) as 1 | -1 | undefined) ?? null));
}

/** `vote: null` removes the caller's existing vote; 1/-1 upserts on (review_id, voter_id). RLS
 * (demo_review_votes_insert_own) already blocks voting on your own review server-side. */
export async function voteOnReview(reviewId: string, voterId: string, vote: 1 | -1 | null): Promise<void> {
  if (vote === null) {
    const { error } = await supabase.from('demo_review_votes').delete().eq('review_id', reviewId).eq('voter_id', voterId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('demo_review_votes').upsert({ review_id: reviewId, voter_id: voterId, vote }, { onConflict: 'review_id,voter_id' });
  if (error) throw error;
}

/** Fire-and-forget — a failed play-count bump should never block actual playback. Frozen
 * against direct client writes (enforce_demo_immutable_columns); this RPC is the only
 * sanctioned writer, same security-definer pattern recompute_demo_scores already proves out
 * for review_count/score_*. */
export async function incrementPlayCount(demoId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_demo_play_count' as any, { target_demo_id: demoId });
  if (error) throw error;
}

export async function listMyBookmarkedDemoIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('demo_bookmarks').select('demo_id').eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.demo_id));
}

export async function toggleBookmark(demoId: string, userId: string, currentlyBookmarked: boolean): Promise<void> {
  if (currentlyBookmarked) {
    const { error } = await supabase.from('demo_bookmarks').delete().eq('demo_id', demoId).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('demo_bookmarks').insert({ demo_id: demoId, user_id: userId });
    if (error) throw error;
  }
}
