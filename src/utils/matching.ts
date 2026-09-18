function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function tagSet(skills: string[], roles: string[]): Set<string> {
  return new Set([...skills, ...roles].map(normalizeTag).filter(Boolean));
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const tag of a) {
    if (b.has(tag)) count += 1;
  }
  return count;
}

/** Symmetric overlap between two peer profiles (developer-to-developer). */
export function personMatchScore(
  me: { skills: string[]; roles: string[] },
  other: { skills: string[]; roles: string[] },
): number {
  const mine = tagSet(me.skills, me.roles);
  const theirs = tagSet(other.skills, other.roles);
  if (mine.size === 0 || theirs.size === 0) return 0;

  const shared = intersectionSize(mine, theirs);
  const union = new Set([...mine, ...theirs]).size;
  return Math.round((shared / union) * 100);
}

/** How much of what a team is asking for (their roles/tags) the user's profile covers. */
export function teamMatchScore(
  me: { skills: string[]; roles: string[] },
  team: { roles: string[] },
): number {
  const mine = tagSet(me.skills, me.roles);
  const needed = tagSet(team.roles, []);
  if (mine.size === 0 || needed.size === 0) return 0;

  const shared = intersectionSize(mine, needed);
  return Math.round((shared / needed.size) * 100);
}
