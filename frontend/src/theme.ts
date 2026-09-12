import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0A0A0A",
  onSurface: "#F2F2F2",
  surfaceSecondary: "#141414",
  onSurfaceSecondary: "#E6E6E6",
  surfaceTertiary: "#1F1F1F",
  onSurfaceTertiary: "#CCCCCC",
  surfaceInverse: "#F5F5F0",
  onSurfaceInverse: "#0A0A0A",
  muted: "#8A8A8A",

  brand: "#4E6B4A",
  onBrand: "#F2F2F2",
  brandPrimary: "#4E6B4A",
  onBrandPrimary: "#F2F2F2",
  brandSecondary: "#3A5237",
  onBrandSecondary: "#F2F2F2",
  brandTertiary: "#243621",
  onBrandTertiary: "#DDEED9",

  success: "#4E6B4A",
  onSuccess: "#F2F2F2",
  warning: "#B08D57",
  onWarning: "#0A0A0A",
  error: "#8C4A4A",
  onError: "#FAD6D6",
  info: "#4D5B5E",
  onInfo: "#D6E0E2",

  border: "#292929",
  borderStrong: "#3D3D3D",
  divider: "#1A1A1A",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.light ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system as ColorScheme] ? (system as ColorScheme) : defaultScheme;
  return { scheme, colors: (themes[scheme] ?? themes.dark) as ThemeColors };
}

export const colors = themes.dark;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
