export const streakOptions = [
  { id: 'cyborg', label: 'Cyborg', emoji: '🤖' },
  { id: 'arm', label: 'Mech arm', emoji: '🦾' },
  { id: 'alien', label: 'Invader', emoji: '👾' },
  { id: 'bolt', label: 'Overclock', emoji: '⚡' },
  { id: 'skull', label: 'Raid', emoji: '💀' },
  { id: 'fire', label: 'Inferno', emoji: '🔥' },
  { id: 'rocket', label: 'Launch', emoji: '🚀' },
  { id: 'helmet', label: 'Pilot', emoji: '🪖' },
  { id: 'ghost', label: 'Glitch', emoji: '👻' },
  { id: 'diamond', label: 'Loot', emoji: '💎' },
  { id: 'chip', label: 'Core', emoji: '🧠' },
  { id: 'sword', label: 'Blade', emoji: '⚔️' },
] as const;

export type StreakOptionId = (typeof streakOptions)[number]['id'];

export function streakGlyph(id?: string) {
  return streakOptions.find((o) => o.id === id)?.emoji ?? '🤖';
}
