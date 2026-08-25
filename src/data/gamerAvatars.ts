export type AvatarLook = {
  hairColor?: string;
  skinColor?: string;
  backgroundColor?: string;
};

export type GamerAvatar = {
  id: string;
  name: string;
  gender: 'girl' | 'boy';
  style: string;
  seed: string;
};

export const gamerAvatars: GamerAvatar[] = [
  { id: 'raid-cat', name: 'Lara', gender: 'girl', style: 'lorelei', seed: 'KiraCat' },
  { id: 'jam-ghost', name: 'Tracer', gender: 'girl', style: 'lorelei', seed: 'PinkGhost' },
  { id: 'queen-ace', name: 'Cloud', gender: 'boy', style: 'avataaars', seed: 'QueenAce' },
  { id: 'ember-witch', name: 'Geralt', gender: 'boy', style: 'lorelei', seed: 'EmberWitch' },
  { id: 'silk-ninja', name: 'Joel', gender: 'boy', style: 'notionists', seed: 'SilkNinja' },
  { id: 'neon-fox', name: 'Ellie', gender: 'girl', style: 'lorelei', seed: 'NeonFox' },
  { id: 'pixel-mage', name: 'Abby', gender: 'girl', style: 'adventurer', seed: 'LunaMage' },
  { id: 'luna-byte', name: 'Aloy', gender: 'girl', style: 'lorelei', seed: 'LunaByte' },
  { id: 'rose-sniper', name: 'Dante', gender: 'boy', style: 'adventurer', seed: 'RoseAim' },
  { id: 'reaper', name: 'Kratos', gender: 'boy', style: 'adventurer', seed: 'NightReaper' },
  { id: 'void-knight', name: 'Ciri', gender: 'girl', style: 'adventurer', seed: 'VoidKnight' },
  { id: 'cyber-wolf', name: 'Tifa', gender: 'girl', style: 'adventurer', seed: 'CyberWolf' },
  { id: 'blade-owl', name: 'Jinx', gender: 'girl', style: 'micah', seed: 'BladeOwl' },
  { id: 'loot-frog', name: 'Ezio', gender: 'boy', style: 'adventurer', seed: 'LootFrog' },
  { id: 'astro-gamer', name: 'Samus', gender: 'girl', style: 'pixel-art', seed: 'AstroKid' },
  { id: 'dungeon-bee', name: '2B', gender: 'girl', style: 'adventurer', seed: 'DungeonBee' },
  { id: 'iron-monk', name: 'Jin', gender: 'boy', style: 'notionists', seed: 'IronMonk' },
  { id: 'storm-kid', name: 'Vi', gender: 'girl', style: 'avataaars', seed: 'StormKid' },
];

export const hairColors = [
  { id: '0e0e0e', label: 'Black' },
  { id: '77311d', label: 'Brown' },
  { id: 'd6b370', label: 'Blonde' },
  { id: 'c41e3a', label: 'Red' },
  { id: 'e91e8c', label: 'Pink' },
  { id: '2563eb', label: 'Blue' },
  { id: 'f5f5f5', label: 'White' },
];

export const skinColors = [
  { id: 'ffdbac', label: 'Fair' },
  { id: 'f1c27d', label: 'Light' },
  { id: 'c68642', label: 'Tan' },
  { id: '8d5524', label: 'Deep' },
];

export const bgColors = [
  { id: '1a2438', label: 'Navy' },
  { id: '351f39', label: 'Plum' },
  { id: '0f3d3e', label: 'Teal' },
  { id: '5d1a3c', label: 'Magenta' },
];

export function avatarById(id?: string) {
  return gamerAvatars.find((a) => a.id === id);
}

export function avatarUriFor(id?: string, fallbackName = 'player', look?: AvatarLook) {
  const found = avatarById(id);
  const style = found?.style ?? 'adventurer';
  const seed = found?.seed ?? fallbackName;
  const params = new URLSearchParams({ seed, size: '128' });
  if (look?.hairColor) params.set('hairColor', look.hairColor);
  if (look?.skinColor) params.set('skinColor', look.skinColor);
  if (look?.backgroundColor) params.set('backgroundColor', look.backgroundColor);
  return `https://api.dicebear.com/9.x/${style}/png?${params.toString()}`;
}
