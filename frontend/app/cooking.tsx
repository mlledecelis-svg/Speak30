import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Vibration, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { useProgram, MEAL_LABELS } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  topTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  close: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "600", paddingHorizontal: 20, marginTop: 20 },
  name: { color: colors.onSurface, fontSize: 24, fontWeight: "300", paddingHorizontal: 20, marginTop: 6, lineHeight: 30 },
  meta: { color: colors.muted, fontSize: 13, paddingHorizontal: 20, marginTop: 6 },
  ingTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "600", paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  ingRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20 },
  ing: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  ingText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  ingGrams: { color: colors.warning, fontWeight: "600" },
  progressTrack: { marginHorizontal: 20, marginTop: 20, height: 6, borderRadius: 999, backgroundColor: colors.surfaceTertiary },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: colors.warning },
  step: { marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", gap: 14 },
  stepOn: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  stepCheck: { width: 32, height: 32, borderRadius: 999, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  stepCheckOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  stepIndex: { color: colors.muted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  stepText: { color: colors.onSurface, fontSize: 17, lineHeight: 26 },
  stepTextOn: { color: colors.muted, textDecorationLine: "line-through" },
  timerBtn: { alignSelf: "flex-start", marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary },
  timerBtnText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "600" },
  timerBar: { marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", gap: 12 },
  timerBig: { color: colors.onBrandPrimary, fontSize: 30, fontWeight: "300", fontVariant: ["tabular-nums"] },
  timerLabel: { color: colors.onBrandPrimary, fontSize: 12, opacity: 0.9, flex: 1 },
  timerCtl: { width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  timerDone: { backgroundColor: colors.warning },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", gap: 10 },
  btn: { flex: 1, height: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  btnPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  btnText: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },
  btnPrimaryText: { color: colors.onBrandPrimary },
}));

export default function CookingScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string; day: string; meal: string }>();
  const week = Number(params.week ?? 0);
  const dayIdx = Number(params.day ?? 0);
  const mealKey = String(params.meal ?? "lunch");
  const { program, mealAction } = useProgram();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<{ step: number; total: number; left: number; running: boolean } | null>(null);

  useEffect(() => {
    if (!timer || !timer.running || timer.left <= 0) return;
    const id = setInterval(() => setTimer((t) => (t && t.running ? { ...t, left: Math.max(0, t.left - 1) } : t)), 1000);
    return () => clearInterval(id);
  }, [timer?.running, timer?.step]);

  useEffect(() => {
    if (timer && timer.left === 0 && timer.total > 0) {
      if (Platform.OS !== "web") Vibration.vibrate([0, 500, 300, 500, 300, 800]);
      Alert.alert("⏱ Temps écoulé", `Étape ${timer.step + 1} terminée — passez à la suite !`);
      setTimer((t) => (t ? { ...t, running: false } : t));
    }
  }, [timer?.left]);

  const stepMinutes = (s: string): number | null => {
    const m = s.match(/(\d+)(?:\s*(?:à|-)\s*(\d+))?\s*min/i);
    if (!m) return null;
    return Number(m[2] ?? m[1]);
  };
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  useEffect(() => {
    activateKeepAwakeAsync("cooking").catch(() => {});
    return () => { deactivateKeepAwake("cooking").catch(() => {}); };
  }, []);

  const day = program?.weeks?.[week]?.days?.[dayIdx];
  const meal = day?.meals?.[mealKey];
  if (!meal || !day || !meal.recipe) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: themeColors.muted }}>Repas introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}><Text style={{ color: themeColors.warning }}>Fermer</Text></Pressable>
      </View>
    );
  }
  const r = meal.recipe;
  const total = r.steps.length;
  const progress = total ? Math.round((done.size / total) * 100) : 0;

  const toggle = (i: number) => setDone((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  const finish = async () => {
    try { if (!meal.done) await mealAction(week, dayIdx, mealKey, "done", true); } catch {}
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Text style={styles.topTitle}>👩‍🍳 Mode cuisine</Text>
        <Pressable testID="cooking-close" onPress={() => router.back()} style={styles.close}>
          <LucideIcon name="x" size={20} color={themeColors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{day.day} · {MEAL_LABELS[mealKey]}</Text>
        <Text style={styles.name}>{r.name}</Text>
        <Text style={styles.meta}>⏱ {r.minutes} min · {r.difficulty_label} · L’écran reste allumé pendant la cuisine.</Text>

        <Text style={styles.ingTitle}>Ingrédients</Text>
        <View style={styles.ingRow}>
          {meal.components.map((c, i) => (
            <View key={i} style={styles.ing}><Text style={styles.ingText}>{c.food_name} <Text style={styles.ingGrams}>{c.grams} g</Text></Text></View>
          ))}
        </View>

        {timer && (
          <View style={[styles.timerBar, timer.left === 0 && styles.timerDone]} testID="timer-bar">
            <Text style={styles.timerBig} testID="timer-left">{fmt(timer.left)}</Text>
            <Text style={styles.timerLabel}>{timer.left === 0 ? `Étape ${timer.step + 1} terminée !` : `Minuteur · étape ${timer.step + 1} (${timer.total / 60} min)`}</Text>
            <Pressable testID="timer-toggle" onPress={() => setTimer((t) => (t ? { ...t, running: !t.running } : t))} style={styles.timerCtl}>
              <LucideIcon name={timer.running ? "pause" : "play"} size={16} color={themeColors.onBrandPrimary} />
            </Pressable>
            <Pressable testID="timer-stop" onPress={() => setTimer(null)} style={styles.timerCtl}>
              <LucideIcon name="x" size={16} color={themeColors.onBrandPrimary} />
            </Pressable>
          </View>
        )}
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        {r.steps.map((s, i) => {
          const on = done.has(i);
          return (
            <Pressable key={i} testID={`cooking-step-${i}`} onPress={() => toggle(i)} style={[styles.step, on && styles.stepOn]}>
              <View style={[styles.stepCheck, on && styles.stepCheckOn]}>{on && <LucideIcon name="check" size={16} color={themeColors.onBrandPrimary} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepIndex}>Étape {i + 1} / {total}</Text>
                <Text style={[styles.stepText, on && styles.stepTextOn]}>{s}</Text>
                {stepMinutes(s) !== null && !on && (
                  <Pressable testID={`timer-start-${i}`} onPress={() => setTimer({ step: i, total: stepMinutes(s)! * 60, left: stepMinutes(s)! * 60, running: true })} style={styles.timerBtn}>
                    <LucideIcon name="timer" size={13} color={themeColors.onBrandTertiary} />
                    <Text style={styles.timerBtnText}>Lancer {stepMinutes(s)} min</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable testID="cooking-reset" onPress={() => setDone(new Set())} style={styles.btn}>
          <LucideIcon name="rotate-ccw" size={16} color={themeColors.onSurfaceSecondary} />
          <Text style={styles.btnText}>Recommencer</Text>
        </Pressable>
        <Pressable testID="cooking-finish" onPress={finish} style={[styles.btn, styles.btnPrimary]}>
          <LucideIcon name="check" size={16} color={themeColors.onBrandPrimary} />
          <Text style={[styles.btnText, styles.btnPrimaryText]}>Repas terminé</Text>
        </Pressable>
      </View>
    </View>
  );
}
