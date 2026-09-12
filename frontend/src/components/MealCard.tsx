import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import LucideIcon from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { Meal, MEAL_LABELS, MEAL_ICONS, useProgram } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  card: { marginHorizontal: 24, marginBottom: 12, borderRadius: 18, overflow: "hidden", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  cardDone: { opacity: 0.55 },
  cardNext: { borderColor: colors.warning },
  img: { width: "100%", height: 150 },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  topRow: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(10,10,10,0.6)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  mealPillText: { color: colors.surfaceInverse, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600" },
  nextBadge: { backgroundColor: colors.warning, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  nextBadgeText: { color: colors.onWarning, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  body: { padding: 14 },
  name: { color: colors.onSurface, fontSize: 17, fontWeight: "500", lineHeight: 22 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  metaText: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "500" },
  metaHome: { backgroundColor: colors.brandTertiary },
  metaHomeText: { color: colors.onBrandTertiary },
  foods: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  actionPrimary: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  actionText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  actionPrimaryText: { color: colors.onBrandPrimary },
  doneOn: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  favIcon: { position: "absolute", right: 12, bottom: 12, backgroundColor: "rgba(10,10,10,0.6)", borderRadius: 999, padding: 6 },
}));

type Props = { meal: Meal; mealKey: string; week: number; day: number; isNext?: boolean; compact?: boolean; featured?: boolean };

export function MealCard({ meal, mealKey, week, day, isNext, compact, featured }: Props) {
  const styles = useStyles();
  const router = useRouter();
  const { mealAction } = useProgram();
  const r = meal.recipe;
  const foods = meal.components.slice(0, 4).map((c) => c.food_name).join(" · ");
  const open = () => router.push({ pathname: "/recipe", params: { week: String(week), day: String(day), meal: mealKey } });
  const cook = () => router.push({ pathname: "/cooking", params: { week: String(week), day: String(day), meal: mealKey } });

  return (
    <Pressable testID={`meal-card-${mealKey}`} onPress={open} style={[styles.card, meal.done && styles.cardDone, isNext && styles.cardNext]}>
      <View>
        <Image source={r.image} style={[styles.img, compact && { height: 110 }]} contentFit="cover" transition={200} />
        <LinearGradient colors={["rgba(10,10,10,0.1)", "rgba(10,10,10,0.75)"]} style={styles.scrim} />
        <View style={styles.topRow}>
          <View style={styles.mealPill}>
            <LucideIcon name={MEAL_ICONS[mealKey] as any} size={12} color={themeColors.warning} />
            <Text style={styles.mealPillText}>{MEAL_LABELS[mealKey]}</Text>
          </View>
          {isNext ? (
            <View style={styles.nextBadge}><Text style={styles.nextBadgeText}>À prévoir</Text></View>
          ) : featured ? (
            <View style={styles.nextBadge}><Text style={styles.nextBadgeText}>★ Recette de la semaine</Text></View>
          ) : meal.done ? (
            <View style={[styles.nextBadge, { backgroundColor: themeColors.brandPrimary }]}><Text style={[styles.nextBadgeText, { color: themeColors.onBrandPrimary }]}>✓ Fait</Text></View>
          ) : null}
        </View>
        {meal.favorite && (
          <View style={styles.favIcon}><LucideIcon name="heart" size={14} color={themeColors.warning} /></View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{r.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.meta}><LucideIcon name="clock" size={11} color={themeColors.muted} /><Text style={styles.metaText}>{r.minutes} min</Text></View>
          <View style={styles.meta}><Text style={styles.metaText}>{r.difficulty_label}</Text></View>
          {r.quick && <View style={styles.meta}><LucideIcon name="zap" size={11} color={themeColors.warning} /><Text style={styles.metaText}>Rapide</Text></View>}
          {meal.pantry_used.length > 0 && (
            <View style={[styles.meta, styles.metaHome]}><LucideIcon name="house" size={11} color={themeColors.onBrandTertiary} /><Text style={[styles.metaText, styles.metaHomeText]}>{meal.pantry_used.length} chez moi</Text></View>
          )}
        </View>
        <Text style={styles.foods} numberOfLines={1}>{foods}</Text>
        {!compact && (
          <View style={styles.actions}>
            <Pressable testID={`cook-${mealKey}`} onPress={cook} style={[styles.actionBtn, styles.actionPrimary]}>
              <LucideIcon name="chef-hat" size={14} color={themeColors.onBrandPrimary} />
              <Text style={[styles.actionText, styles.actionPrimaryText]}>Cuisiner</Text>
            </Pressable>
            <Pressable testID={`done-${mealKey}`} onPress={() => mealAction(week, day, mealKey, "done")} style={[styles.actionBtn, meal.done && styles.doneOn]}>
              <LucideIcon name={meal.done ? "undo-2" : "check"} size={14} color={themeColors.onSurfaceSecondary} />
              <Text style={styles.actionText}>{meal.done ? "Réactiver" : "Fait"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}
