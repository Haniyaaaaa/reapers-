const DAY = 86400000;

export function nextStreak(lastChatAt?: string, current = 0) {
  if (!lastChatAt) return 1;
  const lastDay = Math.floor(new Date(lastChatAt).getTime() / DAY);
  const today = Math.floor(Date.now() / DAY);
  const diff = today - lastDay;
  if (diff === 0) return Math.max(1, current || 1);
  if (diff === 1) return (current || 0) + 1;
  return 1;
}
