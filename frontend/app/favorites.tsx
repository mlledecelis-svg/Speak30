import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  row: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", overflow: "hidden" },
  thumb: { width: 100, minHeight: 100 },
  body: { flex: 1, padding: 12 },
  meal: { color: colors.warning, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  name: { color: colors.onSurface, fontSize: 14, fontWeight: "500", marginTop: 2, lineHeight: 19 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  cook: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandPrimary, paddingHorizontal: 12, height: 32, borderRadius: 999 },
  cookText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "600" },
  open: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  openText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  empty: { marginHorizontal: 20, marginTop: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 10, lineHeight: 20 },
}));

type Fav = { week: number; day: number; day_name: string; meal: string; meal_label: string; recipe: any; components: any[]; photo?: string | null };

export default function FavoritesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { photoUrl } = useProgram();
  const [favs, setFavs] = useState<Fav[] | null>(null);

  const load = useCallback(() => { api<{ favorites: Fav[] }>("/favorites").then((r) => setFavs(r.favorites)).catch(() => setFavs([])); }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>❤ Mes recettes favorites</Text>
          <Text style={styles.sub}>{favs ? `${favs.length} coup${favs.length > 1 ? "s" : ""} de cœur dans votre programme` : ""}</Text>
        </View>
        <Pressable testID="favorites-close" onPress={() => router.back()} style={styles.close}><LucideIcon name="x" size={20} color={colors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {!favs ? (
          <ActivityIndicator color={colors.warning} style={{ marginTop: 40 }} />
        ) : favs.length === 0 ? (
          <View style={styles.empty}>
            <LucideIcon name="heart" size={36} color={colors.warning} />
            <Text style={styles.emptyText}>Pas encore de favoris. Appuyez sur ❤ dans une fiche recette : elle apparaîtra ici pour la cuisiner à nouveau en un geste.</Text>
          </View>
        ) : (
          favs.map((f, i) => (
            <Animated.View key={`${f.week}-${f.day}-${f.meal}`} entering={FadeInDown.delay(i * 60).duration(300)}>
              <Pressable testID={`fav-row-${i}`} onPress={() => router.push({ pathname: "/recipe", params: { week: String(f.week), day: String(f.day), meal: f.meal } })} style={styles.row}>
                <Image source={photoUrl(f.photo) ?? f.recipe.image} style={styles.thumb} contentFit="cover" transition={200} />
                <View style={styles.body}>
                  <Text style={styles.meal}>{f.meal_label} · S{f.week + 1} {f.day_name}</Text>
                  <Text style={styles.name}>{f.recipe.name}</Text>
                  <Text style={styles.meta}>⏱ {f.recipe.minutes} min · {f.recipe.difficulty_label}</Text>
                  <View style={styles.actions}>
                    <Pressable testID={`fav-cook-${i}`} onPress={() => router.push({ pathname: "/cooking", params: { week: String(f.week), day: String(f.day), meal: f.meal } })} style={styles.cook}>
                      <LucideIcon name="chef-hat" size={13} color={colors.onBrandPrimary} /><Text style={styles.cookText}>Cuisiner</Text>
                    </Pressable>
                    <View style={styles.open}><LucideIcon name="book-open" size={13} color={colors.onSurfaceSecondary} /><Text style={styles.openText}>Recette</Text></View>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
