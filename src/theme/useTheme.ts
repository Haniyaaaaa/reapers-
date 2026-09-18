import { useMemo } from 'react';
import { useUiStore } from '../store/uiStore';
import { darkGradients, darkPalette, lightGradients, lightPalette, type Palette } from './palettes';

export function useTheme() {
  const mode = useUiStore((s) => s.theme);
  const light = mode === 'light';
  return {
    mode,
    light,
    isLight: light,
    isDark: !light,
    colors: (light ? lightPalette : darkPalette) as Palette,
    gradients: light ? lightGradients : darkGradients,
  };
}

export function useThemeColors() {
  return useTheme().colors;
}

export function useThemeGradients() {
  return useTheme().gradients;
}

export function useIsLight() {
  return useTheme().light;
}

export function useThemedStyles<T>(
  factory: (colors: Palette, light: boolean, gradients: typeof darkGradients | typeof lightGradients) => T
): T {
  const { colors, light, gradients } = useTheme();
  return useMemo(() => factory(colors, light, gradients), [colors, light, gradients, factory]);
}
