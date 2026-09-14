import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
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
  weekTitle: { color: colors.warning, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: "600", paddingHorizontal: 20, marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10 },
  tile: { borderRadius: 16, overflow: "hidden", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  img: { width: "100%", aspectRatio: 1 },
  cap: { padding: 8 },
  capMeal: { color: colors.warning, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  capName: { color: colors.onSurface, fontSize: 12, marginTop: 2 },
  capDay: { color: colors.muted, fontSize: 10, marginTop: 2 },
  empty: { marginHorizontal: 20, marginTop: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 10, lineHeight: 20 },
}));

type Photo = { path: string; program_id: string; program_name: string; active: boolean; week: number; day: number; day_name: string; meal: string; meal_label: string; recipe_name: string };

export default function PhotosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { photoUrl, program } = useProgram();
  const [photos, setPhotos] = useState<Photo[] | null>(null);

  const load = useCallback(() => { api<{ photos: Photo[] }>("/photos").then((r) => setPhotos(r.photos)).catch(() => setPhotos([])); }, []);
  useEffect(() => { load(); }, [load]);

  const tile = (width - 40 - 10) / 2;
  const groups: { key: string; label: string; items: Photo[] }[] = [];
  for (const p of photos ?? []) {
    const key = `${p.program_id}-${p.week}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: `${p.active ? "" : p.program_name + " · "}Semaine ${p.week + 1}`, items: [] }; groups.push(g); }
    g.items.push(p);
  }

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>📸 Mes photos de plats</Text>
          <Text style={styles.sub}>{photos ? `${photos.length} souvenir${photos.length > 1 ? "s" : ""} appétissant${photos.length > 1 ? "s" : ""}` : ""}</Text>
        </View>
        <Pressable testID="photos-close" onPress={() => router.back()} style={styles.close}><LucideIcon name="x" size={20} color={colors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {!photos ? (
          <ActivityIndicator color={colors.warning} style={{ marginTop: 40 }} />
        ) : photos.length === 0 ? (
          <View style={styles.empty}>
            <LucideIcon name="camera" size={36} color={colors.warning} />
            <Text style={styles.emptyText}>Aucune photo pour l’instant. Ouvrez une recette et appuyez sur 📷 pour garder un souvenir de votre assiette : elles s’afficheront ici, semaine par semaine.</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.key} testID={`photos-group-${g.key}`}>
              <Text style={styles.weekTitle}>{g.label}</Text>
              <View style={styles.grid}>
                {g.items.map((p, i) => (
                  <Animated.View key={p.path} entering={FadeInDown.delay(i * 50).duration(300)}>
                    <Pressable
                      testID={`photo-tile-${i}`}
                      disabled={!program || p.program_id !== program.id}
                      onPress={() => router.push({ pathname: "/recipe", params: { week: String(p.week), day: String(p.day), meal: p.meal } })}
                      style={[styles.tile, { width: tile }]}
                    >
                      <Image source={photoUrl(p.path)} style={styles.img} contentFit="cover" transition={200} />
                      <View style={styles.cap}>
                        <Text style={styles.capMeal}>{p.meal_label}</Text>
                        <Text style={styles.capName} numberOfLines={3}>{p.recipe_name}</Text>
                        <Text style={styles.capDay}>{p.day_name}</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
