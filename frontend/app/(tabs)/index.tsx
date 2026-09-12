import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  greeting: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  logout: { padding: 10, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  hero: { marginHorizontal: 24, height: 220, borderRadius: 20, overflow: "hidden", marginBottom: 20 },
  heroImg: { width: "100%", height: "100%" },
  scrim: { position: "absolute", inset: 0 as any, left: 0, right: 0, top: 0, bottom: 0 },
  heroContent: { position: "absolute", left: 20, right: 20, bottom: 18 },
  heroLabel: { color: "#F5F5F0", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 },
  heroTitle: { color: "#F5F5F0", fontSize: 24, fontWeight: "400", marginTop: 4 },
  heroSub: { color: "#F5F5F0", fontSize: 13, marginTop: 4, opacity: 0.8 },
  emptyBox: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "300", marginTop: 12, textAlign: "center" },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  emptyBtnText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 14, letterSpacing: 0.3 },
  sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "300", paddingHorizontal: 24, marginTop: 8, marginBottom: 12 },
  mealCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  mealTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "600", flex: 1 },
  mealChip: { backgroundColor: colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  mealChipText: { color: colors.onBrandTertiary, fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  mealItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  mealFood: { color: colors.onSurfaceSecondary, fontSize: 14 },
  mealGrams: { color: colors.warning, fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", paddingHorizontal: 24, gap: 12, marginBottom: 16 },
  stat: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  statValue: { color: colors.onSurface, fontSize: 22, fontWeight: "300", marginTop: 6 },
  statUnit: { color: colors.muted, fontSize: 12 },
}));

const MEAL_ICONS: Record<string, string> = { breakfast: "sunrise", lunch: "sun", snack: "apple", dinner: "moon" };
const MEAL_LABELS: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", snack: "Collation", dinner: "Dîner" };

export default function Home() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [program, setProgram] = useState<any>(null);
  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, w] = await Promise.all([
        api("/programs/current").catch(() => null),
        api<any[]>("/weights").catch(() => []),
      ]);
      setProgram(p);
      setWeights(w);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const todayIdx = ((new Date().getDay() + 6) % 7); // Monday = 0
  const todayMeals = program?.weeks?.[0]?.days?.[todayIdx]?.meals ?? {};
  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;
  const startWeight = weights.length > 0 ? weights[0].weight : null;
  const delta = currentWeight && startWeight ? (currentWeight - startWeight).toFixed(1) : "—";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B08D57" />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Bonjour</Text>
            <Text style={styles.greeting} numberOfLines={1}>{user?.name || "Bienvenue"}</Text>
          </View>
          <Pressable testID="logout-button" onPress={logout} style={styles.logout}>
            <LucideIcon name="log-out" size={18} color="#F2F2F2" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image
            source="https://images.unsplash.com/photo-1667499745120-f9bcef8f584e?crop=entropy&cs=srgb&fm=jpg&q=85"
            style={styles.heroImg}
            contentFit="cover"
          />
          <LinearGradient colors={["transparent", "rgba(10,10,10,0.3)", "rgba(10,10,10,0.85)"]} style={styles.scrim} />
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Aujourd'hui</Text>
            <Text style={styles.heroTitle}>{program ? "Votre journée prend vie" : "Votre journée prendra vie ici"}</Text>
            <Text style={styles.heroSub}>{program ? `Semaine 1 · Jour ${todayIdx + 1}` : "Générez votre programme"}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#B08D57" style={{ marginTop: 40 }} />
        ) : !program ? (
          <View style={styles.emptyBox}>
            <LucideIcon name="utensils" size={36} color="#B08D57" />
            <Text style={styles.emptyTitle}>Aucun programme actif</Text>
            <Text style={styles.emptyText}>Configurez vos cibles nutritionnelles puis générez votre programme sur plusieurs semaines.</Text>
            <Pressable testID="home-cta-generate" onPress={() => router.push("/(tabs)/planner")} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Créer mon programme</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Poids</Text>
                <Text style={styles.statValue}>{currentWeight ?? "—"} <Text style={styles.statUnit}>kg</Text></Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Évolution</Text>
                <Text style={styles.statValue}>{delta} <Text style={styles.statUnit}>kg</Text></Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Pesées</Text>
                <Text style={styles.statValue}>{weights.length}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Aujourd'hui</Text>
            {Object.entries(todayMeals).map(([m, items]: any) => (
              <View key={m} style={styles.mealCard} testID={`home-meal-${m}`}>
                <View style={styles.mealHead}>
                  <LucideIcon name={MEAL_ICONS[m] as any} size={16} color="#B08D57" />
                  <Text style={styles.mealTitle}>{MEAL_LABELS[m]}</Text>
                  <View style={styles.mealChip}><Text style={styles.mealChipText}>{items.length} items</Text></View>
                </View>
                {items.map((it: any, i: number) => (
                  <View key={i} style={styles.mealItem}>
                    <Text style={styles.mealFood}>{it.food}</Text>
                    <Text style={styles.mealGrams}>{it.grams}g</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
