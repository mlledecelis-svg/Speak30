import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { useProgram, MEAL_LABELS } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280 },
  heroImg: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  close: { position: "absolute", left: 16, width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(10,10,10,0.6)", alignItems: "center", justifyContent: "center" },
  favBtn: { position: "absolute", right: 16, width: 40, height: 40, borderRadius: 999, backgroundColor: "rgba(10,10,10,0.6)", alignItems: "center", justifyContent: "center" },
  heroContent: { position: "absolute", left: 20, right: 20, bottom: 18 },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "600", marginBottom: 6 },
  name: { color: colors.surfaceInverse, fontSize: 24, fontWeight: "400", lineHeight: 30 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 16 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "500" },
  badgeHome: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  sectionTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "300", paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  card: { marginHorizontal: 20, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  compRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 10 },
  compCat: { color: colors.muted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  compFood: { color: colors.onSurface, fontSize: 14, marginTop: 2 },
  compGrams: { color: colors.warning, fontSize: 14, fontWeight: "600" },
  swapBtn: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  homeDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.warning },
  step: { flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stepNum: { width: 26, height: 26, borderRadius: 999, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "700" },
  stepText: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, flex: 1 },
  extras: { color: colors.muted, fontSize: 12, paddingHorizontal: 20, marginTop: 10, lineHeight: 18 },
  actions: { paddingHorizontal: 20, marginTop: 20, gap: 10 },
  actionRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  btnPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  btnText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  btnPrimaryText: { color: colors.onBrandPrimary },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 10 },
  mood: { paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  moodText: { color: colors.onSurfaceTertiary, fontSize: 12 },
  feedback: { marginHorizontal: 20, marginTop: 20, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  feedbackTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "600", marginBottom: 10 },
  ratingRow: { flexDirection: "row", gap: 8 },
  rating: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  ratingOn: { borderColor: colors.warning, backgroundColor: colors.brandTertiary },
  ratingText: { color: colors.onSurfaceSecondary, fontSize: 12 },
  ratingConfirm: { color: colors.onBrandTertiary, fontSize: 12, marginTop: 10 },
  toast: { marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.brandTertiary },
  toastText: { color: colors.onBrandTertiary, fontSize: 12 },
}));

const MOODS = [
  { key: "fresh", label: "🥗 Envie de frais" },
  { key: "comfort", label: "🍲 Réconfort" },
  { key: "quick", label: "⚡ Rapide" },
  { key: "veg", label: "🌱 Végétarien" },
];

export default function RecipeScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ week: string; day: string; meal: string }>();
  const week = Number(params.week ?? 0);
  const dayIdx = Number(params.day ?? 0);
  const mealKey = String(params.meal ?? "lunch");
  const { program, mealAction } = useProgram();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const day = program?.weeks?.[week]?.days?.[dayIdx];
  const meal = day?.meals?.[mealKey];

  const run = async (label: string, action: string, value?: any, mood?: string) => {
    setBusy(label);
    try {
      const msg = await mealAction(week, dayIdx, mealKey, action, value, mood);
      if (msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }
    } catch (e: any) {
      Alert.alert("Impossible", e?.message ?? "Erreur");
    } finally { setBusy(null); }
  };

  if (!meal || !day || !meal.recipe) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: themeColors.muted }}>Repas introuvable</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}><Text style={{ color: themeColors.warning }}>Fermer</Text></Pressable>
      </View>
    );
  }
  const r = meal.recipe;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={r.image} style={styles.heroImg} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(10,10,10,0.2)", "transparent", "rgba(10,10,10,0.95)"]} style={styles.scrim} />
          <Pressable testID="recipe-close" onPress={() => router.back()} style={[styles.close, { top: insets.top + 12 }]}>
            <LucideIcon name="x" size={20} color={themeColors.onSurface} />
          </Pressable>
          <Pressable testID="recipe-favorite" onPress={() => run("fav", "favorite")} style={[styles.favBtn, { top: insets.top + 12 }]}>
            <LucideIcon name="heart" size={18} color={meal.favorite ? themeColors.warning : themeColors.onSurface} />
          </Pressable>
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>{day.day} · {MEAL_LABELS[mealKey]}</Text>
            <Text style={styles.name}>{r.name}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          <View style={styles.badge}><LucideIcon name="clock" size={12} color={themeColors.warning} /><Text style={styles.badgeText}>{r.minutes} min</Text></View>
          <View style={styles.badge}><LucideIcon name="gauge" size={12} color={themeColors.warning} /><Text style={styles.badgeText}>{r.difficulty_label}</Text></View>
          {r.quick && <View style={styles.badge}><LucideIcon name="zap" size={12} color={themeColors.warning} /><Text style={styles.badgeText}>Rapide</Text></View>}
          {meal.pantry_used.length > 0 && <View style={[styles.badge, styles.badgeHome]}><LucideIcon name="house" size={12} color={themeColors.onBrandTertiary} /><Text style={[styles.badgeText, { color: themeColors.onBrandTertiary }]}>Déjà chez moi : {meal.pantry_used.join(", ")}</Text></View>}
          {meal.done && <View style={styles.badge}><LucideIcon name="check" size={12} color={themeColors.success} /><Text style={styles.badgeText}>Fait</Text></View>}
        </View>

        {toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}

        <Text style={styles.sectionTitle}>Dans votre assiette</Text>
        <View style={styles.card}>
          {meal.components.map((c, i) => (
            <View key={i} style={styles.compRow} testID={`component-${i}`}>
              {meal.pantry_used.includes(c.food_name) && <View style={styles.homeDot} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.compCat}>{c.category_label}</Text>
                <Text style={styles.compFood}>{c.food_name}</Text>
              </View>
              <Text style={styles.compGrams}>{c.grams} g</Text>
              <Pressable testID={`component-swap-${i}`} disabled={!!busy} onPress={() => run(`comp${i}`, "replace_component", i)} style={styles.swapBtn}>
                {busy === `comp${i}` ? <ActivityIndicator size="small" color={themeColors.warning} /> : <LucideIcon name="refresh-cw" size={13} color={themeColors.muted} />}
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Préparation</Text>
        <View style={styles.card}>
          {r.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
        {r.extras.length > 0 && <Text style={styles.extras}>Assaisonnements autorisés (sans calories ajoutées) : {r.extras.join(", ")}.</Text>}

        <View style={styles.actions}>
          <View style={styles.actionRow}>
            <Pressable testID="recipe-cook" onPress={() => router.push({ pathname: "/cooking", params: { week: String(week), day: String(dayIdx), meal: mealKey } })} style={[styles.btn, styles.btnPrimary]}>
              <LucideIcon name="chef-hat" size={16} color={themeColors.onBrandPrimary} />
              <Text style={[styles.btnText, styles.btnPrimaryText]}>Mode cuisine</Text>
            </Pressable>
            <Pressable testID="recipe-done" disabled={!!busy} onPress={() => run("done", "done")} style={styles.btn}>
              <LucideIcon name={meal.done ? "undo-2" : "check"} size={16} color={themeColors.onSurfaceSecondary} />
              <Text style={styles.btnText}>{meal.done ? "Réactiver" : "Repas fait"}</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable testID="recipe-replace" disabled={!!busy} onPress={() => run("replace", "replace")} style={styles.btn}>
              {busy === "replace" ? <ActivityIndicator size="small" color={themeColors.warning} /> : <LucideIcon name="refresh-cw" size={16} color={themeColors.warning} />}
              <Text style={styles.btnText}>Changer le repas</Text>
            </Pressable>
            <Pressable testID="recipe-quick" disabled={!!busy || (r.quick && mealKey !== "breakfast")} onPress={() => run("quick", "quick")} style={[styles.btn, r.quick && { opacity: 0.5 }]}>
              {busy === "quick" ? <ActivityIndicator size="small" color={themeColors.warning} /> : <LucideIcon name="zap" size={16} color={themeColors.warning} />}
              <Text style={styles.btnText}>{r.quick ? "Déjà rapide" : "Je n'ai pas le temps"}</Text>
            </Pressable>
          </View>
        </View>

        {(mealKey === "lunch" || mealKey === "dinner") && (
          <>
            <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 18, marginBottom: 0 }]}>Une envie particulière ?</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m) => (
                <Pressable key={m.key} testID={`mood-${m.key}`} disabled={!!busy} onPress={() => run(`mood-${m.key}`, "replace", undefined, m.key)} style={styles.mood}>
                  <Text style={styles.moodText}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.feedback}>
          <Text style={styles.feedbackTitle}>Votre avis sur ce repas</Text>
          <View style={styles.ratingRow}>
            {[{ k: "like", l: "😋 J'ai aimé" }, { k: "neutral", l: "😐 Moyen" }, { k: "avoid", l: "🙅 Pas pour moi" }].map((o) => (
              <Pressable key={o.k} testID={`rating-${o.k}`} disabled={!!busy} onPress={() => run("rating", "rating", meal.rating === o.k ? null : o.k)} style={[styles.rating, meal.rating === o.k && styles.ratingOn]}>
                <Text style={styles.ratingText}>{o.l}</Text>
              </Pressable>
            ))}
          </View>
          {meal.rating && <Text style={styles.ratingConfirm}>✓ Avis enregistré{meal.rating === "avoid" ? " — cette recette ne sera plus proposée." : "."}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}
