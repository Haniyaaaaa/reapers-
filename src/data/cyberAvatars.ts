import { ImageSourcePropType } from 'react-native';

export interface CyberAvatarItem {
  id: string;
  name: string;
  gender: 'female' | 'male';
  source: ImageSourcePropType;
  traits: string;
}

export const CYBER_AVATARS: CyberAvatarItem[] = [
  // Row 1: Male 1 to 5 (matching Figma grid Row 1)
  {
    id: 'male_1',
    name: 'Frost Blade',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_1.jpg'),
    traits: 'NEON SHADES · TACTICAL COLLAR · RIM LIGHT',
  },
  {
    id: 'male_2',
    name: 'Stealth Operative',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_2.jpg'),
    traits: 'STUDIO CAP · AUDIO MONITORS · LOW KEY',
  },
  {
    id: 'male_3',
    name: 'Cyber Monk',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_3.jpg'),
    traits: 'NEURAL LINK · HOLOGRAPHIC TEE · AURA',
  },
  {
    id: 'male_4',
    name: 'Shadow Runner',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_4.jpg'),
    traits: 'BANDANA MASK · AMBIENT VIOLET · RUNNER RIG',
  },
  {
    id: 'male_5',
    name: 'Raid Commander',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_5.jpg'),
    traits: 'RED GLASSES · COMBAT JACKET · HIGHLIGHT',
  },

  // Row 2: Female 1 to 5 (matching Figma grid Row 2)
  {
    id: 'female_1',
    name: 'Pulse Siren',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_1.jpg'),
    traits: 'PURPLE BRAIDS · HEADSET PRO · CYAN GLOW',
  },
  {
    id: 'female_2',
    name: 'Nova Viper',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_2.jpg'),
    traits: 'AVIATOR VISOR · YELLOW BEANIE · FLARE',
  },
  {
    id: 'female_3',
    name: 'Echo Siren',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_3.jpg'),
    traits: 'PASTEL BOB · STUDIO HEADSET · SOFT GLOW',
  },
  {
    id: 'female_4',
    name: 'Kade Rourke',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_4.jpg'),
    traits: 'STUDIO JACKET · HEADSET PRO · RIM LIGHT',
  },
  {
    id: 'female_5',
    name: 'Pulse Queen',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_5.jpg'),
    traits: 'MAGENTA HEADPHONES · STREET CHIC · GLOW',
  },

  // Row 3: Female 6 to 10 (matching Figma grid Row 3)
  {
    id: 'female_6',
    name: 'Cyber Fox',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_6.jpg'),
    traits: 'NEON VISOR · PINK SNAPBACK · LASER LINE',
  },
  {
    id: 'female_7',
    name: 'Cosmic Neko',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_7.jpg'),
    traits: 'CAT EARS BEANIE · PURPLE SHADES · AURA',
  },
  {
    id: 'female_8',
    name: 'Specter Muse',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_8.jpg'),
    traits: 'SLICK BEANIE · GLASSES PRO · COLD RIM',
  },
  {
    id: 'female_9',
    name: 'Mirage Huntress',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_9.jpg'),
    traits: 'TWIN BRAIDS · HEADBAND RIG · GOLD RIM',
  },
  {
    id: 'female_10',
    name: 'Eclipse Shadow',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_10.jpg'),
    traits: 'BLACK CAP · MINIMALIST TECH · MOOD LIGHT',
  },

  // Additional cyber avatars in the collection
  {
    id: 'female_11',
    name: 'Vortex Oracle',
    gender: 'female',
    source: require('../../assets/avatars/extracted/female_11.jpg'),
    traits: 'CYBER WEAVE · OVERHEAD COMMS · NEON FIELD',
  },
  {
    id: 'male_6',
    name: 'Vanguard Scout',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_6.jpg'),
    traits: 'CYBER VISOR · STREET WEAR · CYAN GLOW',
  },
  {
    id: 'male_7',
    name: 'Net Samurai',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_7.jpg'),
    traits: 'HEADSET ELITE · NEON HOOD · VOLUMETRIC',
  },
  {
    id: 'male_8',
    name: 'Grid Pilot',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_8.jpg'),
    traits: 'TACTICAL CAP · COMMS LINK · WIDE RIM',
  },
  {
    id: 'male_9',
    name: 'Neon Rebel',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_9.jpg'),
    traits: 'PURPLE VISOR · OVERDRIVE HOODIE · PULSE',
  },
  {
    id: 'male_10',
    name: 'Phantom Hacker',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_10.jpg'),
    traits: 'SMART LENSES · STUDIO TEE · NEON ACCENT',
  },
  {
    id: 'male_11',
    name: 'Apex Striker',
    gender: 'male',
    source: require('../../assets/avatars/extracted/male_11.jpg'),
    traits: 'SPEC-OPS COMMS · COMBAT GEAR · FLARE',
  },
];

export const DEFAULT_AVATAR_ID = 'female_4';

export function getCyberAvatarById(id?: string): CyberAvatarItem {
  return (
    CYBER_AVATARS.find((a) => a.id === id) ||
    CYBER_AVATARS.find((a) => a.id === DEFAULT_AVATAR_ID)!
  );
}

export function getCyberAvatarSource(id?: string): ImageSourcePropType {
  return getCyberAvatarById(id).source;
}
