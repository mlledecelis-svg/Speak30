import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";
import { Image } from "expo-image";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { useProgram, MEAL_ORDER, MEAL_LABELS, MEAL_ICONS } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  iconBtn: { width: 42, height: 42, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  sticky: { backgroundColor: colors.surface, paddingBottom: 4 },
  weekChips: { paddingHorizontal: 24, gap: 8 },
  weekChip: { paddingHorizontal: 16, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  weekChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  weekChipText: { color: colors.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  weekChipTextActive: { color: colors.onBrandTertiary },
  dayChips: { paddingHorizontal: 24, gap: 6, paddingTop: 10 },
  dayChip: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  dayChipOn: { backgroundColor: colors.warning, borderColor: colors.warning },
  dayChipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  dayChipTextOn: { color: colors.onWarning },
  dayHead: { paddingHorizontal: 24, marginTop: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "300" },
  swapBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  swapText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  row: { marginHorizontal: 24, marginBottom: 10, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", overflow: "hidden" },
  rowDone: { opacity: 0.55 },
  thumb: { width: 92, height: "100%", minHeight: 92 },
  rowBody: { flex: 1, padding: 12 },
  rowLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  rowLabelText: { color: colors.warning, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600" },
  rowName: { color: colors.onSurface, fontSize: 14, fontWeight: "500", lineHeight: 19 },
  rowMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" },
  metaText: { color: colors.muted, fontSize: 11 },
  homeTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.brandTertiary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  homeTagText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "600" },
  rowActions: { justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingRight: 10 },
  smallBtn: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  smallBtnOn: { backgroundColor: colors.brandPrimary },
  featured: { marginHorizontal: 24, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary, flexDirection: "row", alignItems: "center", gap: 12 },
  featuredText: { color: colors.onBrandTertiary, fontSize: 12, flex: 1, lineHeight: 17 },
  featuredTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  emptyBox: { marginHorizontal: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  primaryBtn: { marginTop: 18, backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  primaryText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 14 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: colors.brandPrimary, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fabText: { color: colors.onBrandPrimary, fontWeight: "600", letterSpacing: 0.3 },
  toast: { marginHorizontal: 24, marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: colors.brandTertiary },
  toastText: { color: colors.onBrandTertiary, fontSize: 12 },
}));

const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function Planner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { program, loading, mealAction, todayIndex } = useProgram();
  const [week, setWeek] = useState(0);
  const [dayIdx, setDayIdx] = useState(todayIndex);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const weeks = program?.weeks ?? [];
  const weekData = weeks[Math.min(week, Math.max(0, weeks.length - 1))];
  const day = weekData?.days?.[dayIdx];
  const featured = weekData?.featured;
  const featuredMeal = featured ? weekData?.days?.[featured.day]?.meals?.[featured.meal] : null;

  const show = (msg: string | null) => {
    if (!msg) return;
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    try {
      show(await fn());
    } catch (e: any) {
      Alert.alert("Impossible", e?.message ?? "Erreur");
      show(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const doneCount = useMemo(() => (weekData ? weekData.days.reduce((n, d) => n + Object.values(d.meals).filter((m) => m.done).length, 0) : 0), [weekData]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={program ? [1] : undefined}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Programme</Text>
            <Text style={styles.title}>Mes menus</Text>
          </View>
          <Pressable testID="open-config" onPress={() => router.push("/config")} style={styles.iconBtn}>
            <LucideIcon name="sliders-horizontal" size={18} color={themeColors.onSurface} />
          </Pressable>
        </View>

        {program && weeks.length > 0 ? (
          <View style={styles.sticky}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekChips}>
              {weeks.map((w, i) => (
                <Pressable key={i} testID={`week-chip-${i}`} onPress={() => setWeek(i)} style={[styles.weekChip, i === week && styles.weekChipActive]}>
                  <Text style={[styles.weekChipText, i === week && styles.weekChipTextActive]}>Semaine {w.week}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChips}>
              {DAY_SHORT.map((d, i) => (
                <Pressable key={d} testID={`day-chip-${i}`} onPress={() => setDayIdx(i)} style={[styles.dayChip, i === dayIdx && styles.dayChipOn]}>
                  <Text style={[styles.dayChipText, i === dayIdx && styles.dayChipTextOn]}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={themeColors.warning} style={{ marginTop: 40 }} />
        ) : !program || !day ? (
          <View style={styles.emptyBox}>
            <LucideIcon name="chef-hat" size={36} color={themeColors.warning} />
            <Text style={[styles.title, { fontSize: 18, marginTop: 12 }]}>Aucun menu généré</Text>
            <Text style={styles.emptyText}>Réglez vos cibles (portions prescrites par votre diététicienne) puis lancez la génération de vos menus.</Text>
            <Pressable testID="planner-cta-config" onPress={() => router.push("/config")} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Configurer & générer</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}
            {featuredMeal && (
              <Pressable testID="featured-recipe" onPress={() => router.push({ pathname: "/recipe", params: { week: String(week), day: String(featured!.day), meal: featured!.meal } })} style={styles.featured}>
                <Text style={{ fontSize: 22 }}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featuredTitle}>Recette de la semaine · {weekData!.days[featured!.day].day}</Text>
                  <Text style={styles.featuredText} numberOfLines={1}>{featuredMeal.recipe.name}</Text>
                </View>
                <Text style={styles.metaText}>{doneCount} repas faits</Text>
              </Pressable>
            )}
            <View style={styles.dayHead}>
              <Text style={styles.dayTitle}>{day.day}</Text>
              {program.can_swap && day.meals.lunch && day.meals.dinner && (
                <Pressable testID="swap-day" disabled={busy} onPress={() => run(() => mealAction(week, dayIdx, "lunch", "swap_day"))} style={styles.swapBtn}>
                  <LucideIcon name="arrow-left-right" size={13} color={themeColors.onSurfaceSecondary} />
                  <Text style={styles.swapText}>Déjeuner / dîner</Text>
                </Pressable>
              )}
            </View>
            {MEAL_ORDER.filter((m) => day.meals[m]).map((m) => {
              const meal = day.meals[m];
              return (
                <Pressable key={m} testID={`meal-row-${m}`} onPress={() => router.push({ pathname: "/recipe", params: { week: String(week), day: String(dayIdx), meal: m } })} style={[styles.row, meal.done && styles.rowDone]}>
                  <Image source={meal.recipe.image} style={styles.thumb} contentFit="cover" transition={200} />
                  <View style={styles.rowBody}>
                    <View style={styles.rowLabel}>
                      <LucideIcon name={MEAL_ICONS[m] as any} size={11} color={themeColors.warning} />
                      <Text style={styles.rowLabelText}>{MEAL_LABELS[m]}</Text>
                      {meal.favorite && <LucideIcon name="heart" size={11} color={themeColors.warning} />}
                    </View>
                    <Text style={styles.rowName} numberOfLines={2}>{meal.recipe.name}</Text>
                    <View style={styles.rowMeta}>
                      <Text style={styles.metaText}>⏱ {meal.recipe.minutes} min</Text>
                      <Text style={styles.metaText}>· {meal.recipe.difficulty_label}</Text>
                      {meal.pantry_used.length > 0 && (
                        <View style={styles.homeTag}><LucideIcon name="house" size={9} color={themeColors.onBrandTertiary} /><Text style={styles.homeTagText}>{meal.pantry_used.join(", ")}</Text></View>
                      )}
                    </View>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable testID={`row-done-${m}`} disabled={busy} onPress={() => run(() => mealAction(week, dayIdx, m, "done"))} style={[styles.smallBtn, meal.done && styles.smallBtnOn]}>
                      <LucideIcon name="check" size={15} color={meal.done ? themeColors.onBrandPrimary : themeColors.muted} />
                    </Pressable>
                    <Pressable testID={`row-replace-${m}`} disabled={busy} onPress={() => run(() => mealAction(week, dayIdx, m, "replace"))} style={styles.smallBtn}>
                      <LucideIcon name="refresh-cw" size={15} color={themeColors.warning} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      <Pressable testID="fab-configure" onPress={() => router.push("/config")} style={styles.fab}>
        <LucideIcon name="sparkles" size={16} color={themeColors.onBrandPrimary} />
        <Text style={styles.fabText}>{program ? "Nouveau programme" : "Configurer & Générer"}</Text>
      </Pressable>
    </View>
  );
}
