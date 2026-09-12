import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LucideIcon from "@react-native-vector-icons/lucide";
import BottomSheet, { BottomSheetView, BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { makeStyles } from "@/src/theme";
import { api } from "@/src/api";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 16 },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  weekChips: { paddingHorizontal: 24, gap: 8, paddingBottom: 8 },
  weekChip: { paddingHorizontal: 16, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  weekChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  weekChipText: { color: colors.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  weekChipTextActive: { color: colors.onBrandTertiary },
  chipRow: { height: 56, paddingTop: 10 },
  dayCard: { marginHorizontal: 24, marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  dayTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  mealBlock: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  mealLabel: { color: colors.warning, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  mealItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  mealFood: { color: colors.onSurfaceSecondary, fontSize: 13 },
  mealGrams: { color: colors.muted, fontSize: 13 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: colors.brandPrimary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: { color: colors.onBrandPrimary, fontWeight: "600", letterSpacing: 0.3 },
  emptyBox: { marginHorizontal: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 8 },

  sheetTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "300", marginBottom: 8, paddingHorizontal: 20 },
  sheetSub: { color: colors.muted, fontSize: 13, marginBottom: 20, paddingHorizontal: 20 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  toggleLabel: { color: colors.onSurfaceSecondary, fontSize: 14 },
  variantRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  variantChip: { paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  variantChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  variantText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  variantTextActive: { color: colors.onBrandTertiary },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemInfo: { flex: 1 },
  itemLabel: { color: colors.onSurface, fontSize: 14 },
  itemCat: { color: colors.muted, fontSize: 11, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  stepInput: { color: colors.onSurface, fontSize: 14, minWidth: 52, textAlign: "center", backgroundColor: colors.surfaceTertiary, borderRadius: 8, paddingVertical: 4 },
  durationRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  saveBtn: { margin: 20, backgroundColor: colors.brandPrimary, paddingVertical: 16, borderRadius: 999, alignItems: "center" },
  saveText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 15 },
}));

const MEALS = [
  { key: "breakfast", label: "Petit-déjeuner", icon: "sunrise" },
  { key: "lunch", label: "Déjeuner", icon: "sun" },
  { key: "snack", label: "Collation", icon: "apple" },
  { key: "dinner", label: "Dîner", icon: "moon" },
] as const;

const MEAL_LABELS: Record<string, string> = { breakfast: "Petit-déj", lunch: "Déjeuner", snack: "Collation", dinner: "Dîner" };
const BREAKFAST_VARIANTS = [
  { key: "both", label: "Les deux" },
  { key: "sweet_cereal", label: "Sucré" },
  { key: "salted", label: "Salé" },
];
const DURATIONS = [2, 4, 6, 8];

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const styles = useStyles();
  const dec = () => onChange(Math.max(0, value - 10));
  const inc = () => onChange(value + 10);
  return (
    <View style={styles.stepper}>
      <Pressable testID={`stepper-dec`} onPress={dec} style={styles.stepBtn}>
        <LucideIcon name="minus" size={14} color="#CCCCCC" />
      </Pressable>
      <Text style={styles.stepInput}>{value}g</Text>
      <Pressable testID={`stepper-inc`} onPress={inc} style={styles.stepBtn}>
        <LucideIcon name="plus" size={14} color="#CCCCCC" />
      </Pressable>
    </View>
  );
}

export default function Planner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const [program, setProgram] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [week, setWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        api("/programs/current").catch(() => null),
        api("/targets"),
      ]);
      setProgram(p);
      setTargets(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openConfig = () => sheetRef.current?.expand();

  const updateItem = (meal: string, idx: number, grams: number) => {
    setTargets((t: any) => {
      const copy = { ...t, [meal]: { ...t[meal], items: t[meal].items.map((it: any, i: number) => (i === idx ? { ...it, grams } : it)) } };
      return copy;
    });
  };

  const toggleMeal = (meal: string) => setTargets((t: any) => ({ ...t, [meal]: { ...t[meal], active: !t[meal].active } }));
  const setBreakfastVariant = (variant: string) => setTargets((t: any) => ({ ...t, breakfast: { ...t.breakfast, variant } }));
  const setDuration = (d: number) => setTargets((t: any) => ({ ...t, duration_weeks: d }));

  const saveAndGenerate = async () => {
    if (!targets) return;
    setSaving(true);
    setGenerating(true);
    try {
      await api("/targets", { method: "PUT", body: JSON.stringify(targets) });
      const newProg = await api("/programs/generate", { method: "POST" });
      setProgram(newProg);
      setWeek(0);
      sheetRef.current?.close();
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />, []);

  const weeks = program?.weeks ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={program ? [1] : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Programme</Text>
          <Text style={styles.title}>Mes menus</Text>
        </View>

        {program && weeks.length > 0 ? (
          <View style={{ backgroundColor: "#0A0A0A" }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekChips} style={styles.chipRow}>
              {weeks.map((w: any, i: number) => (
                <Pressable key={i} testID={`week-chip-${i}`} onPress={() => setWeek(i)} style={[styles.weekChip, i === week && styles.weekChipActive]}>
                  <Text style={[styles.weekChipText, i === week && styles.weekChipTextActive]}>Semaine {i + 1}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#B08D57" style={{ marginTop: 40 }} />
        ) : !program ? (
          <View style={styles.emptyBox}>
            <LucideIcon name="chef-hat" size={36} color="#B08D57" />
            <Text style={[styles.title, { fontSize: 18, marginTop: 12 }]}>Aucun menu généré</Text>
            <Text style={styles.emptyText}>Configurez vos cibles nutritionnelles et lancez la génération de votre programme.</Text>
          </View>
        ) : (
          weeks[week]?.days.map((day: any, i: number) => (
            <View key={i} style={styles.dayCard} testID={`day-card-${i}`}>
              <View style={styles.dayHead}>
                <Text style={styles.dayTitle}>{day.day}</Text>
              </View>
              {Object.entries(day.meals).map(([m, items]: any) => (
                <View key={m} style={styles.mealBlock}>
                  <Text style={styles.mealLabel}>{MEAL_LABELS[m]}</Text>
                  {items.map((it: any, k: number) => (
                    <View key={k} style={styles.mealItem}>
                      <Text style={styles.mealFood}>{it.food}</Text>
                      <Text style={styles.mealGrams}>{it.grams}g</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable testID="fab-configure" onPress={openConfig} style={[styles.fab, { bottom: 20 }]}>
        <LucideIcon name="sliders-horizontal" size={16} color="#F2F2F2" />
        <Text style={styles.fabText}>{program ? "Reconfigurer" : "Configurer & Générer"}</Text>
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        snapPoints={["92%"]}
        index={-1}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#141414" }}
        handleIndicatorStyle={{ backgroundColor: "#3D3D3D" }}
      >
        <BottomSheetScrollView>
          <Text style={styles.sheetTitle}>Cibles du programme</Text>
          <Text style={styles.sheetSub}>Réglez les portions par repas (grammes). Une portion à 0 désactive l'aliment.</Text>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}><LucideIcon name="calendar-days" size={16} color="#DDEED9" /></View>
              <Text style={styles.sectionTitle}>Durée du plan</Text>
            </View>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => (
                <Pressable key={d} testID={`duration-${d}`} onPress={() => setDuration(d)} style={[styles.variantChip, targets?.duration_weeks === d && styles.variantChipActive]}>
                  <Text style={[styles.variantText, targets?.duration_weeks === d && styles.variantTextActive]}>{d} sem.</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {targets && MEALS.map((meal) => (
            <View key={meal.key} style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionIcon}><LucideIcon name={meal.icon as any} size={16} color="#DDEED9" /></View>
                <Text style={styles.sectionTitle}>{meal.label}</Text>
              </View>
              <Pressable testID={`toggle-${meal.key}`} onPress={() => toggleMeal(meal.key)} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{meal.key === "snack" ? "Collation active" : "Repas actif"}</Text>
                <View style={{ width: 40, height: 24, borderRadius: 999, backgroundColor: targets[meal.key].active ? "#4E6B4A" : "#292929", padding: 2 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: "#F2F2F2", marginLeft: targets[meal.key].active ? 16 : 0 }} />
                </View>
              </Pressable>
              {meal.key === "breakfast" && targets.breakfast.active && (
                <View style={styles.variantRow}>
                  {BREAKFAST_VARIANTS.map((v) => (
                    <Pressable key={v.key} testID={`breakfast-variant-${v.key}`} onPress={() => setBreakfastVariant(v.key)} style={[styles.variantChip, targets.breakfast.variant === v.key && styles.variantChipActive]}>
                      <Text style={[styles.variantText, targets.breakfast.variant === v.key && styles.variantTextActive]}>{v.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {targets[meal.key].active && targets[meal.key].items.map((it: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>{it.label}</Text>
                    <Text style={styles.itemCat}>{it.category}</Text>
                  </View>
                  <Stepper value={it.grams} onChange={(v) => updateItem(meal.key, i, v)} />
                </View>
              ))}
            </View>
          ))}

          <Pressable testID="save-and-generate" onPress={saveAndGenerate} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
            {generating ? <ActivityIndicator color="#F2F2F2" /> : <Text style={styles.saveText}>Générer mes menus</Text>}
          </Pressable>
          <View style={{ height: insets.bottom + 20 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
