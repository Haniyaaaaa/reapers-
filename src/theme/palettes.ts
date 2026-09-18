export type ThemeMode = 'dark' | 'light';
export type Palette = {
  bg: string;
  background: string;
  primary: string;
  surface: string;
  surfaceElevated: string;
  teal: string;
  tealMuted: string;
  navy: string;
  charcoal: string;
  plum: string;
  plumDeep: string;
  magenta: string;
  magentaDeep: string;
  cyan: string;
  online: string;
  danger: string;
  warning: string;
  text: string;
  muted: string;
  muted2: string;
  border: string;
  overlay: string;
  live: string;
  onPrimary: string;
  cardFill: string;
  cardBorder: string;
  cardFillActive: string;
  cardBorderActive: string;
  inputFill: string;
  inputBorder: string;
  electricAccent: string;
  blurTint: 'dark' | 'light';
};
export type ColorTokens = Palette;

export const darkPalette: Palette = {
  bg: '#0B0F1C',
  background: '#0B0F1C',
  primary: '#00E5FF',
  surface: '#121729',
  surfaceElevated: '#1A2438',
  teal: '#17B3A3',
  tealMuted: '#0F3D3E',
  navy: '#1A2F38',
  charcoal: '#212836',
  plum: '#8A4A84',
  plumDeep: '#351F39',
  magenta: '#E91E8C',
  magentaDeep: '#5D1A3C',
  cyan: '#2EE6D6',
  online: '#3DDC84',
  danger: '#FF4D6D',
  warning: '#F5C542',
  text: '#FFFFFF',
  muted: '#A8B0C4',
  muted2: '#6E7690',
  border: 'rgba(255, 255, 255, 0.12)',
  overlay: 'rgba(11,15,28,0.72)',
  live: '#3DDC84',
  onPrimary: '#FFFFFF',
  cardFill: 'rgba(14, 20, 35, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  cardFillActive: 'rgba(216, 60, 255, 0.22)',
  cardBorderActive: 'rgba(216, 60, 255, 0.8)',
  inputFill: 'rgba(30, 36, 54, 0.6)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  electricAccent: '#00E5FF',
  blurTint: 'dark',
};

export const lightPalette: Palette = {
  bg: '#F3F6FB',
  background: '#F3F6FB',
  primary: '#0891B2',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF3FA',
  teal: '#0C9B8E',
  tealMuted: '#D7F4F0',
  navy: '#E4ECF6',
  charcoal: '#E8EEF6',
  plum: '#9B4A90',
  plumDeep: '#F3E4F0',
  magenta: '#C2186A',
  magentaDeep: '#F8DCEA',
  cyan: '#0A8F9C',
  online: '#16A34A',
  danger: '#DC2626',
  warning: '#B45309',
  text: '#0F172A',
  muted: '#475569',
  muted2: '#64748B',
  border: 'rgba(15,23,42,0.08)',
  overlay: 'rgba(15,23,42,0.45)',
  live: '#16A34A',
  onPrimary: '#FFFFFF',
  cardFill: 'rgba(255, 255, 255, 0.90)',
  cardBorder: 'rgba(15, 23, 42, 0.08)',
  cardFillActive: 'rgba(147, 51, 234, 0.12)',
  cardBorderActive: 'rgba(147, 51, 234, 0.65)',
  inputFill: 'rgba(241, 245, 249, 0.85)',
  inputBorder: 'rgba(15, 23, 42, 0.12)',
  electricAccent: '#0891B2',
  blurTint: 'light',
};

export const darkGradients = {
  background: [darkPalette.bg, '#15102A', darkPalette.plumDeep] as const,
  primary: [darkPalette.magenta, darkPalette.plum] as const,
  cyber: ['#00E5FF', '#6D35FF', '#D83CFF'] as const,
  teal: [darkPalette.teal, darkPalette.cyan] as const,
  card: ['#1B1530', '#121729'] as const,
  fab: [darkPalette.plum, darkPalette.magenta] as const,
  liveRing: [darkPalette.cyan, darkPalette.magenta] as const,
};

export const lightGradients = {
  background: ['#F8FBFF', '#F0F5FC', '#E8F0F8'] as const,
  primary: [lightPalette.magenta, lightPalette.plum] as const,
  cyber: ['#00B4D8', '#6D35FF', '#C026D3'] as const,
  teal: [lightPalette.teal, '#0891B2'] as const,
  card: ['#FFFFFF', '#F7FAFD'] as const,
  fab: [lightPalette.plum, lightPalette.magenta] as const,
  liveRing: ['#0891B2', lightPalette.magenta] as const,
};
