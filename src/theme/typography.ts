export const fonts = {
  display: 'Outfit_700Bold',
  displayMed: 'Outfit_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMed: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_700Bold',
} as const;

export const type = {
  h1: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.displayMed, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  bodyBold: { fontFamily: fonts.bodySemi, fontSize: 15 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodyMed, fontSize: 12, letterSpacing: 0.4 },
  mono: { fontFamily: fonts.mono, fontSize: 12 },
  stat: { fontFamily: fonts.monoBold, fontSize: 16 },
} as const;
