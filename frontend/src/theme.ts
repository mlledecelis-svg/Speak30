import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, StyleSheet } from "react-native";

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

const light: typeof dark = {
  surface: "#FAF7F0",
  onSurface: "#1F2A1E",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#2E3A2C",
  surfaceTertiary: "#F1ECDF",
  onSurfaceTertiary: "#4A5548",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#1F2A1E",
  muted: "#7A8378",

  brand: "#4E6B4A",
  onBrand: "#FFFFFF",
  brandPrimary: "#4E6B4A",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#6B8A66",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E3EEDF",
  onBrandTertiary: "#2F4A2C",

  success: "#4E6B4A",
  onSuccess: "#FFFFFF",
  warning: "#B08D57",
  onWarning: "#FFFFFF",
  error: "#B9524F",
  onError: "#FFFFFF",
  info: "#5E7A7E",
  onInfo: "#FFFFFF",

  border: "#E6E0D2",
  borderStrong: "#CFC6B2",
  divider: "#F0EBE0",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { light, dark };

export type ThemePreference = "light" | "dark" | "system";
const PREF_KEY = "theme_preference";
let preference: ThemePreference = "light";
let currentScheme: ColorScheme = defaultScheme;
const listeners = new Set<() => void>();

function resolveScheme(pref: ThemePreference): ColorScheme {
  if (pref === "system") {
    const sys = Appearance.getColorScheme();
    return sys === "dark" ? "dark" : "light";
  }
  return pref;
}

function applyPreference(pref: ThemePreference) {
  preference = pref;
  currentScheme = resolveScheme(pref);
  try {
    Appearance.setColorScheme?.((pref === "system" ? null : pref) as any);
  } catch {}
  listeners.forEach((l) => l());
}

export async function loadThemePreference() {
  try {
    const v = (await AsyncStorage.getItem(PREF_KEY)) as ThemePreference | null;
    if (v === "light" || v === "dark" || v === "system") applyPreference(v);
  } catch {}
}

export async function setThemePreference(pref: ThemePreference) {
  applyPreference(pref);
  try {
    await AsyncStorage.setItem(PREF_KEY, pref);
  } catch {}
}

export function getThemePreference(): ThemePreference {
  return preference;
}

Appearance.addChangeListener?.(() => {
  if (preference === "system") applyPreference("system");
});

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors; preference: ThemePreference } {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { scheme: currentScheme, colors: themes[currentScheme] as ThemeColors, preference };
}

/** Couleurs du thème courant (lecture dynamique) — utilisable hors hooks. */
export const colors: ThemeColors = new Proxy({} as ThemeColors, {
  get: (_t, key: string) => (themes[currentScheme] as any)[key],
}) as ThemeColors;

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
