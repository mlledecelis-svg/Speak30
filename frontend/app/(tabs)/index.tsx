import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useProgram, MEAL_ORDER } from "@/src/program-store";
import { MealCard } from "@/src/components/MealCard";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  greeting: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  logout: { padding: 10, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  hero: { marginHorizontal: 24, height: 210, borderRadius: 22, overflow: "hidden", marginBottom: 16 },
  heroImg: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  heroContent: { position: "absolute", left: 20, right: 20, bottom: 18 },
  heroLabel: { color: colors.surfaceInverse, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 },
  heroTitle: { color: colors.surfaceInverse, fontSize: 24, fontWeight: "400", marginTop: 4 },
  heroSub: { color: colors.surfaceInverse, fontSize: 13, marginTop: 4, opacity: 0.85 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  track: { flex: 1, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" },
  fill: { height: 6, borderRadius: 999, backgroundColor: colors.warning },
  progressText: { color: colors.surfaceInverse, fontSize: 12, fontWeight: "600" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 14 },
  weekChips: { flexDirection: "row", gap: 6 },
  weekChip: { paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  weekChipOn: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  weekChipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  weekChipTextOn: { color: colors.onBrandTertiary },
  link: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { color: colors.warning, fontSize: 12, fontWeight: "600" },
  emptyBox: { marginHorizontal: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "300", marginTop: 12, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  emptyBtnText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 14, letterSpacing: 0.3 },
  quickRow: { flexDirection: "row", paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  quick: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 8 },
  quickLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  quickHint: { color: colors.muted, fontSize: 11 },
}));

const HERO = "https://images.unsplash.com/photo-1667499745120-f9bcef8f584e?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Home() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { program, loading, refresh, todayIndex } = useProgram();
  const [refreshing, setRefreshing] = useState(false);
  const [week, setWeek] = useState(0);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const weekData = program?.weeks?.[Math.min(week, (program?.weeks?.length ?? 1) - 1)];
  const day = weekData?.days?.[todayIndex];
  const active = day ? MEAL_ORDER.filter((m) => day.meals[m]) : [];
  const doneCount = active.filter((m) => day!.meals[m].done).length;
  const progress = active.length ? Math.round((doneCount / active.length) * 100) : 0;
  const nextMeal = useMemo(() => {
    if (!day) return null;
    const h = new Date().getHours();
    const order = h < 10 ? ["breakfast", "lunch", "snack", "dinner"] : h < 14 ? ["lunch", "snack", "dinner", "breakfast"] : h < 17 ? ["snack", "dinner", "lunch", "breakfast"] : ["dinner", "snack", "lunch", "breakfast"];
    return order.find((m) => day.meals[m] && !day.meals[m].done) ?? null;
  }, [day]);
  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.warning} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Bonjour</Text>
            <Text style={styles.greeting} numberOfLines={1}>{user?.name || "Bienvenue"}</Text>
          </View>
          <Pressable testID="logout-button" onPress={logout} style={styles.logout}>
            <LucideIcon name="log-out" size={18} color={themeColors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image source={day?.meals?.[nextMeal ?? active[0]]?.recipe.image ?? HERO} style={styles.heroImg} contentFit="cover" transition={300} />
          <LinearGradient colors={["transparent", "rgba(10,10,10,0.35)", "rgba(10,10,10,0.9)"]} style={styles.scrim} />
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Aujourd’hui{weekData ? ` · Semaine ${weekData.week}` : ""}</Text>
            <Text style={styles.heroTitle}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</Text>
            <Text style={styles.heroSub}>{program ? "Votre journée alimentaire, simplement." : "Générez votre programme pour commencer."}</Text>
            {program && active.length > 0 && (
              <View style={styles.progressRow}>
                <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
                <Text style={styles.progressText}>{doneCount}/{active.length} faits</Text>
              </View>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={themeColors.warning} style={{ marginTop: 40 }} />
        ) : !program || !day ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36 }}>🌿</Text>
            <Text style={styles.emptyTitle}>Votre journée prendra vie ici</Text>
            <Text style={styles.emptyText}>Générez votre programme pour retrouver chaque jour vos repas, vos recettes et les raccourcis cuisine au même endroit.</Text>
            <Pressable testID="home-cta-generate" onPress={() => router.push("/config")} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Créer mon programme</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.toolbar}>
              <View style={styles.weekChips}>
                {program.weeks.map((w, i) => (
                  <Pressable key={i} testID={`today-week-${i}`} onPress={() => setWeek(i)} style={[styles.weekChip, i === week && styles.weekChipOn]}>
                    <Text style={[styles.weekChipText, i === week && styles.weekChipTextOn]}>S{w.week}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable testID="home-see-week" onPress={() => router.push("/(tabs)/planner")} style={styles.link}>
                <Text style={styles.linkText}>Voir la semaine</Text>
                <LucideIcon name="arrow-right" size={13} color={themeColors.warning} />
              </Pressable>
            </View>

            <View style={styles.quickRow}>
              <Pressable testID="home-go-shopping" onPress={() => router.push("/(tabs)/shopping")} style={styles.quick}>
                <LucideIcon name="shopping-basket" size={18} color={themeColors.warning} />
                <Text style={styles.quickLabel}>Mes courses</Text>
                <Text style={styles.quickHint}>Liste générée depuis vos menus</Text>
              </Pressable>
              <Pressable testID="home-go-inventory" onPress={() => router.push("/(tabs)/inventory")} style={styles.quick}>
                <LucideIcon name="refrigerator" size={18} color={themeColors.warning} />
                <Text style={styles.quickLabel}>Ma maison</Text>
                <Text style={styles.quickHint}>Ce que j’ai déjà chez moi</Text>
              </Pressable>
            </View>

            {active.map((m) => (
              <MealCard key={m} meal={day.meals[m]} mealKey={m} week={week} day={todayIndex} isNext={m === nextMeal} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
