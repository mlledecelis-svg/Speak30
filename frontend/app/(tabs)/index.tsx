import { useEffect, useMemo, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "@/src/api";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useProgram, MEAL_ORDER, MEAL_LABELS, MEAL_TIMES } from "@/src/program-store";
import { MealCard } from "@/src/components/MealCard";
import { HydrationCard } from "@/src/components/HydrationCard";

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
  quickRow: { paddingHorizontal: 24, gap: 10, paddingBottom: 16 },
  quick: { width: 150, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 8 },
  quickLabel: { color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  quickHint: { color: colors.muted, fontSize: 11 },
  reminder: { marginHorizontal: 24, marginBottom: 16, borderRadius: 18, padding: 16, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  reminderIcon: { width: 44, height: 44, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  reminderEyebrow: { color: colors.onBrandPrimary, opacity: 0.8, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700" },
  reminderTitle: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "600", marginTop: 2 },
  reminderSub: { color: colors.onBrandPrimary, opacity: 0.85, fontSize: 12, marginTop: 2 },
  reminderBtn: { backgroundColor: colors.onBrandPrimary, paddingHorizontal: 12, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  reminderBtnText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "300", paddingHorizontal: 24, marginTop: 8, marginBottom: 10 },
  badgesRow: { paddingHorizontal: 24, gap: 10, paddingBottom: 16 },
  badge: { width: 128, padding: 12, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, gap: 6 },
  badgeOn: { borderColor: colors.warning, backgroundColor: colors.brandTertiary },
  badgeIcon: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  badgeIconOn: { backgroundColor: colors.warning },
  badgeLabel: { color: colors.onSurface, fontSize: 12, fontWeight: "600" },
  badgeDesc: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  badgeTrack: { height: 4, borderRadius: 999, backgroundColor: colors.surfaceTertiary, marginTop: 2 },
  badgeFill: { height: 4, borderRadius: 999, backgroundColor: colors.warning },
}));

const HERO = "https://images.unsplash.com/photo-1667499745120-f9bcef8f584e?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Home() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { program, loading, refresh, todayIndex } = useProgram();
  const [refreshing, setRefreshing] = useState(false);
  const [week, setWeek] = useState(0);
  const [badges, setBadges] = useState<any>(null);

  useEffect(() => {
    if (!program) { setBadges(null); return; }
    api(`/programs/${program.id}/badges`).then(setBadges).catch(() => setBadges(null));
  }, [program]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const weekData = program?.weeks?.[Math.min(week, (program?.weeks?.length ?? 1) - 1)];
  const day = weekData?.days?.[todayIndex];
  const active = day ? MEAL_ORDER.filter((m) => day.meals[m]?.recipe) : [];
  const doneCount = active.filter((m) => day!.meals[m].done).length;
  const progress = active.length ? Math.round((doneCount / active.length) * 100) : 0;
  const nextMeal = useMemo(() => {
    if (!day) return null;
    const h = new Date().getHours();
    const order = h < 10 ? ["breakfast", "lunch", "snack", "dinner"] : h < 14 ? ["lunch", "snack", "dinner", "breakfast"] : h < 17 ? ["snack", "dinner", "lunch", "breakfast"] : ["dinner", "snack", "lunch", "breakfast"];
    return order.find((m) => day.meals[m] && !day.meals[m].done) ?? null;
  }, [day]);
  const reminder = useMemo(() => {
    if (!day || !nextMeal) return null;
    const [hh, mm] = MEAL_TIMES[nextMeal] ?? [12, 30];
    const now = new Date();
    const target = new Date(now); target.setHours(hh, mm, 0, 0);
    const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
    const meal = day.meals[nextMeal];
    const startIn = diffMin - meal.recipe.minutes;
    let when: string;
    if (diffMin < -60) when = "Repas de la journée à cocher";
    else if (startIn > 60) when = `Commencez la préparation dans ${Math.floor(startIn / 60)} h ${String(startIn % 60).padStart(2, "0")}`;
    else if (startIn > 0) when = `Commencez la préparation dans ${startIn} min`;
    else when = "C'est le moment de passer en cuisine !";
    return { meal, key: nextMeal, when, time: `${hh}h${String(mm).padStart(2, "0")}` };
  }, [day, nextMeal]);

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
          <Pressable testID="open-settings" onPress={() => router.push("/settings")} style={styles.logout}>
            <LucideIcon name="settings" size={18} color={themeColors.onSurface} />
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

            {reminder && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <Pressable testID="reminder-card" onPress={() => router.push({ pathname: "/recipe", params: { week: String(week), day: String(todayIndex), meal: reminder.key } })} style={styles.reminder}>
                  <View style={styles.reminderIcon}><LucideIcon name="bell-ring" size={20} color={themeColors.onBrandPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderEyebrow}>Rappel · {MEAL_LABELS[reminder.key]} vers {reminder.time}</Text>
                    <Text style={styles.reminderTitle} numberOfLines={1}>{reminder.meal.recipe.name}</Text>
                    <Text style={styles.reminderSub}>⏱ {reminder.meal.recipe.minutes} min · {reminder.when}</Text>
                  </View>
                  <Pressable testID="reminder-cook" onPress={() => router.push({ pathname: "/cooking", params: { week: String(week), day: String(todayIndex), meal: reminder.key } })} style={styles.reminderBtn}>
                    <Text style={styles.reminderBtnText}>Cuisiner</Text>
                  </Pressable>
                </Pressable>
              </Animated.View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
              <Pressable testID="home-go-shopping" onPress={() => router.push("/(tabs)/shopping")} style={styles.quick}>
                <LucideIcon name="shopping-basket" size={18} color={themeColors.warning} />
                <Text style={styles.quickLabel}>Mes courses</Text>
                <Text style={styles.quickHint}>Liste générée depuis vos menus</Text>
              </Pressable>
              <Pressable testID="home-go-favorites" onPress={() => router.push("/favorites")} style={styles.quick}>
                <LucideIcon name="heart" size={18} color={themeColors.warning} />
                <Text style={styles.quickLabel}>Mes favoris</Text>
                <Text style={styles.quickHint}>Recettes coup de cœur à refaire</Text>
              </Pressable>
              <Pressable testID="home-go-photos" onPress={() => router.push("/photos")} style={styles.quick}>
                <LucideIcon name="camera" size={18} color={themeColors.warning} />
                <Text style={styles.quickLabel}>Mes photos</Text>
                <Text style={styles.quickHint}>Vos assiettes, semaine par semaine</Text>
              </Pressable>
              <Pressable testID="home-go-inventory" onPress={() => router.push("/(tabs)/inventory")} style={styles.quick}>
                <LucideIcon name="refrigerator" size={18} color={themeColors.warning} />
                <Text style={styles.quickLabel}>Ma maison</Text>
                <Text style={styles.quickHint}>Ce que j’ai déjà chez moi</Text>
              </Pressable>
            </ScrollView>

            <HydrationCard />

            {active.map((m, i) => (
              <MealCard key={m} meal={day.meals[m]} mealKey={m} week={week} day={todayIndex} isNext={m === nextMeal} index={i} />
            ))}

            {badges && (
              <>
                <Text style={styles.sectionTitle}>Mes défis · {badges.badges.filter((b: any) => b.earned).length}/{badges.badges.length} obtenus</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow} testID="badges-row">
                  {badges.badges.map((b: any, i: number) => (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 60).duration(350)}>
                      <View style={[styles.badge, b.earned && styles.badgeOn]} testID={`badge-${b.id}`}>
                        <View style={[styles.badgeIcon, b.earned && styles.badgeIconOn]}><LucideIcon name={b.icon as any} size={16} color={b.earned ? themeColors.onWarning : themeColors.muted} /></View>
                        <Text style={styles.badgeLabel}>{b.label}</Text>
                        <Text style={styles.badgeDesc} numberOfLines={2}>{b.desc}</Text>
                        <View style={styles.badgeTrack}><View style={[styles.badgeFill, { width: `${Math.min(100, Math.round((b.progress / b.target) * 100))}%` }]} /></View>
                        <Text style={styles.badgeDesc}>{b.earned ? "✓ Obtenu" : `${b.progress}/${b.target}`}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
