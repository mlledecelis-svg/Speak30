import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export type Component = { category: string; category_label: string; food_id: string; food_name: string; grams: number; unit: string; eq?: string };
export type Recipe = { blueprint_id: string; name: string; method: string; image: string; steps: string[]; minutes: number; difficulty: string; difficulty_label: string; extras: string[]; quick: boolean; moods: string[]; mode?: string | null };
export type Meal = { recipe: Recipe; components: Component[]; pantry_used: string[]; done: boolean; favorite: boolean; rating: string | null };
export type Day = { day: string; meals: Record<string, Meal> };
export type Week = { week: number; days: Day[]; featured?: { day: number; meal: string } | null };
export type Program = { id: string; name: string; created_at: string; duration_weeks: number; weeks: Week[]; can_swap: boolean; shopping_checked: string[] };

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
};

const ProgramContext = createContext<Ctx | null>(null);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const p = await api<Program | null>("/programs/current");
      setProgram(p);
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
      const res = await api<{ message: string | null; day: Day }>(`/programs/${program.id}/meals/action`, {
        method: "POST",
        body: JSON.stringify({ week, day, meal, action, value, mood }),
      });
      setProgram((prev) => {
        if (!prev) return prev;
        const weeks = prev.weeks.map((w, wi) => (wi === week ? { ...w, days: w.days.map((d, di) => (di === day ? res.day : d)) } : w));
        return { ...prev, weeks };
      });
      return res.message;
    },
    [program],
  );

  const todayIndex = (new Date().getDay() + 6) % 7;

  const value = useMemo(() => ({ program, loading, refresh, generate, mealAction, setProgram, todayIndex }), [program, loading, refresh, generate, mealAction, todayIndex]);
  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function useProgram() {
  const ctx = useContext(ProgramContext);
  if (!ctx) throw new Error("useProgram outside provider");
  return ctx;
}
