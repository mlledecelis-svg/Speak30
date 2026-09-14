import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";
import Animated, { FadeInDown } from "react-native-reanimated";

import { makeStyles, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useProgram } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "300" },
  sub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  close: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  hero: { marginHorizontal: 20, marginTop: 8, padding: 16, borderRadius: 18, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", gap: 14 },
  heroBig: { color: colors.onBrandPrimary, fontSize: 28, fontWeight: "300" },
  heroText: { color: colors.onBrandPrimary, fontSize: 13, opacity: 0.9, flex: 1, lineHeight: 18 },
  session: { marginHorizontal: 20, marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary },
  sessionTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  sessionDesc: { color: colors.onBrandTertiary, fontSize: 12, marginTop: 2 },
  sessionItems: { color: colors.onSurface, fontSize: 12, marginTop: 8, lineHeight: 18 },
  section: { color: colors.warning, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "600", paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  group: { marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  groupHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  groupName: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  groupCat: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  groupQty: { color: colors.warning, fontSize: 16, fontWeight: "600" },
  groupQtySub: { color: colors.muted, fontSize: 10, textAlign: "right" },
  mealLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 },
  mealDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.brandSecondary },
  mealText: { color: colors.onSurfaceSecondary, fontSize: 12, flex: 1 },
  mealGrams: { color: colors.muted, fontSize: 11 },
  tip: { color: colors.muted, fontSize: 11, marginTop: 10, lineHeight: 16, fontStyle: "italic" },
  empty: { marginHorizontal: 20, marginTop: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 10, lineHeight: 20 },
}));

export default function BatchScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { week: weekParam } = useLocalSearchParams<{ week: string }>();
  const week = Number(weekParam ?? 0);
  const { program } = useProgram();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!program) return;
    api(`/programs/${program.id}/batch/${week}`).then(setData).catch(() => setData({ groups: [], sessions: [], minutes_saved: 0 }));
  }, [program, week]);

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>🍲 Batch cooking</Text>
          <Text style={styles.sub}>Semaine {week + 1} · cuisiner une fois, manger plusieurs fois</Text>
        </View>
        <Pressable testID="batch-close" onPress={() => router.back()} style={styles.close}><LucideIcon name="x" size={20} color={colors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {!data ? (
          <ActivityIndicator color={colors.warning} style={{ marginTop: 40 }} />
        ) : data.groups.length === 0 ? (
          <View style={styles.empty}>
            <LucideIcon name="cooking-pot" size={36} color={colors.warning} />
            <Text style={styles.emptyText}>Aucun aliment commun à plusieurs repas cette semaine : chaque plat se prépare à la minute.</Text>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.hero} testID="batch-hero">
              <Text style={styles.heroBig}>≈ {data.minutes_saved} min</Text>
              <Text style={styles.heroText}>gagnées cette semaine en préparant {data.groups.length} aliment{data.groups.length > 1 ? "s" : ""} en avance, sans changer une seule portion.</Text>
            </Animated.View>
            {data.sessions.filter((s: any) => s.items.length > 0).map((s: any, i: number) => (
              <Animated.View key={s.title} entering={FadeInDown.delay(80 + i * 60).duration(350)} style={styles.session}>
                <Text style={styles.sessionTitle}>🗓 {s.title}</Text>
                <Text style={styles.sessionDesc}>{s.desc}</Text>
                <Text style={styles.sessionItems}>{s.items.join(" · ")}</Text>
              </Animated.View>
            ))}
            <Text style={styles.section}>À préparer en une fois</Text>
            {data.groups.map((g: any, i: number) => (
              <Animated.View key={g.food_id} entering={FadeInDown.delay(150 + i * 50).duration(300)} style={styles.group} testID={`batch-group-${g.food_id}`}>
                <View style={styles.groupHead}>
                  <View>
                    <Text style={styles.groupCat}>{g.category_label}</Text>
                    <Text style={styles.groupName}>{g.food_name}</Text>
                  </View>
                  <View>
                    <Text style={styles.groupQty}>{g.total_grams} g</Text>
                    <Text style={styles.groupQtySub}>{g.meals.length} repas</Text>
                  </View>
                </View>
                {g.meals.map((m: any, j: number) => (
                  <Pressable key={j} onPress={() => router.push({ pathname: "/recipe", params: { week: String(week), day: String(m.day), meal: m.meal } })} style={styles.mealLine}>
                    <View style={styles.mealDot} />
                    <Text style={styles.mealText} numberOfLines={2}>{m.day_name} · {m.meal_label} — {m.recipe_name}</Text>
                    <Text style={styles.mealGrams}>{m.grams} g</Text>
                  </Pressable>
                ))}
                <Text style={styles.tip}>{g.tip}</Text>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
