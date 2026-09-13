import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { api, loadToken } from "./api";
import { useAuth } from "./auth";

export type Component = { kcal?: number; category: string; category_label: string; food_id: string; food_name: string; grams: number; unit: string; eq?: string };
export type Recipe = { kcal?: number; lifestyle?: string[]; blueprint_id: string; name: string; method: string; image: string; steps: string[]; minutes: number; difficulty: string; difficulty_label: string; extras: string[]; quick: boolean; moods: string[]; mode?: string | null };
export type Meal = { recipe: Recipe; components: Component[]; pantry_used: string[]; done: boolean; favorite: boolean; rating: string | null; photo?: string | null };

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL as string;
export const MEAL_TIMES: Record<string, [number, number]> = { breakfast: [7, 30], lunch: [12, 30], snack: [16, 30], dinner: [19, 30] };
export type Day = { day: string; meals: Record<string, Meal> };
export type Week = { week: number; days: Day[]; featured?: { day: number; meal: string } | null };
export type Program = { id: string; name: string; created_at: string; duration_weeks: number; weeks: Week[]; can_swap: boolean; shopping_checked: string[]; undo?: any };

/** Semaine en cours du programme selon sa date de création (lundi de la semaine de création = semaine 1). */
export function currentWeekIndex(p: Program | null): number {
  if (!p?.created_at) return 0;
  const start = new Date(p.created_at);
  const monday = new Date(start); monday.setHours(0, 0, 0, 0); monday.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const idx = Math.floor((Date.now() - monday.getTime()) / (7 * 24 * 3600 * 1000));
  return Math.max(0, Math.min(p.weeks.length - 1, idx));
}

export const MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"];
export const MEAL_LABELS: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", snack: "Collation", dinner: "Dîner" };
export const MEAL_ICONS: Record<string, string> = { breakfast: "sunrise", lunch: "sun", snack: "apple", dinner: "moon" };

type Ctx = {
  program: Program | null;
  loading: boolean;
  refresh: () => Promise<void>;
  generate: () => Promise<Program>;
  mealAction: (week: number, day: number, meal: string, action: string, value?: any, mood?: string) => Promise<string | null>;
  setProgram: (p: Program | null) => void;
  todayIndex: number;
  canUndo: boolean;
  token: string | null;
  photoUrl: (path?: string | null) => string | null;
  uploadPhoto: (week: number, day: number, meal: string, uri: string, name: string, type: string) => Promise<void>;
  removePhoto: (week: number, day: number, meal: string) => Promise<void>;
};

const ProgramContext = createContext<Ctx | null>(null);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    loadToken().then((t) => setToken(t)).catch(() => setToken(null));
  }, [user]);

  const refresh = useCallback(async () => {
    try {
      const p = await api<Program | null>("/programs/current");
      setProgram(p);
      setCanUndo(!!p?.undo);
    } catch {
      setProgram(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else {
      setProgram(null);
      setLoading(false);
    }
  }, [user, refresh]);

  const generate = useCallback(async () => {
    const p = await api<Program>("/programs/generate", { method: "POST" });
    setProgram(p);
    return p;
  }, []);

  const mealAction = useCallback(
    async (week: number, day: number, meal: string, action: string, value?: any, mood?: string) => {
      if (!program) return null;
      const res = await api<{ message: string | null; day: Day; week: number; day_index: number; can_undo?: boolean }>(`/programs/${program.id}/meals/action`, {
        method: "POST",
        body: JSON.stringify({ week, day, meal, action, value, mood }),
      });
      const tw = res.week ?? week, td = res.day_index ?? day;
      setProgram((prev) => {
        if (!prev) return prev;
        const weeks = prev.weeks.map((w, wi) => (wi === tw ? { ...w, days: w.days.map((d, di) => (di === td ? res.day : d)) } : w));
        return { ...prev, weeks };
      });
      setCanUndo(!!res.can_undo);
      return res.message;
    },
    [program],
  );

  const applyDay = useCallback((week: number, day: number, newDay: Day) => {
    setProgram((prev) => {
      if (!prev) return prev;
      return { ...prev, weeks: prev.weeks.map((w, wi) => (wi === week ? { ...w, days: w.days.map((d, di) => (di === day ? newDay : d)) } : w)) };
    });
  }, []);

  const photoUrl = useCallback((path?: string | null) => (path && token ? `${BASE}/api/files/${path}?token=${token}` : null), [token]);

  const uploadPhoto = useCallback(
    async (week: number, day: number, meal: string, uri: string, name: string, type: string) => {
      if (!program) return;
      const tk = await loadToken();
      const form = new FormData();
      if (Platform.OS === "web") {
        const blob = await (await fetch(uri)).blob();
        form.append("file", blob, name);
      } else {
        form.append("file", { uri, name, type } as any);
      }
      const res = await fetch(`${BASE}/api/programs/${program.id}/meals/photo?week=${week}&day=${day}&meal=${meal}`, { method: "POST", headers: { Authorization: `Bearer ${tk}` }, body: form });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!res.ok) throw new Error((typeof data.detail === "string" && data.detail) || `Envoi impossible (${res.status})`);
      applyDay(week, day, data.day);
    },
    [program, applyDay],
  );

  const removePhoto = useCallback(
    async (week: number, day: number, meal: string) => {
      if (!program) return;
      const res = await api<{ day: Day }>(`/programs/${program.id}/meals/photo?week=${week}&day=${day}&meal=${meal}`, { method: "DELETE" });
      applyDay(week, day, res.day);
    },
    [program, applyDay],
  );

  const todayIndex = (new Date().getDay() + 6) % 7;

  const value = useMemo(() => ({ program, loading, refresh, generate, mealAction, setProgram, todayIndex, canUndo, token, photoUrl, uploadPhoto, removePhoto }), [program, loading, refresh, generate, mealAction, todayIndex, canUndo, token, photoUrl, uploadPhoto, removePhoto]);
  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function useProgram() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("useProgram outside provider");
  return ctx;
}
