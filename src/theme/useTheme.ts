import { useUiStore } from '../store/uiStore';
import { darkGradients, darkPalette, lightGradients, lightPalette, type Palette } from './palettes';

export function useTheme() {
  const mode = useUiStore((s) => s.theme);
  const light = mode === 'light';
  return {
    mode,
    light,
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
