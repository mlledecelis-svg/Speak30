import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LucideIcon from "@react-native-vector-icons/lucide";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { useRouter } from "expo-router";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { api } from "@/src/api";
import { useProgram } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 16 },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 6 },
  chipRow: { height: 56, paddingTop: 10 },
  chipContent: { paddingHorizontal: 24, gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 16, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", gap: 6, flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandTertiary },
  itemCard: { marginHorizontal: 24, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  itemCardPri: { borderColor: colors.warning },
  itemName: { flex: 1, color: colors.onSurface, fontSize: 15 },
  priBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  priBtnOn: { backgroundColor: colors.warning, borderColor: colors.warning },
  delBtn: { padding: 6 },
  emptyBox: { marginHorizontal: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: 8, textAlign: "center" },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: colors.brandPrimary, borderRadius: 999, width: 56, height: 56, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  sheetTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "300", marginBottom: 16, paddingHorizontal: 20 },
  input: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.onSurface, fontSize: 15, marginHorizontal: 20, marginBottom: 12 },
  locRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  locChip: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  locChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  locText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  locTextActive: { color: colors.onBrandTertiary },
  addBtn: { marginHorizontal: 20, backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  addBtnText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 15 },
  optCard: { marginHorizontal: 24, marginTop: 8, marginBottom: 16, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  optRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  optLabel: { color: colors.onSurface, fontSize: 14, fontWeight: "500" },
  optHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  switch: { width: 40, height: 24, borderRadius: 999, padding: 2 },
  knob: { width: 20, height: 20, borderRadius: 999, backgroundColor: colors.onSurface },
  groupTitle: { color: colors.warning, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 10, marginBottom: 8, fontWeight: "600" },
  groupChoice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.surfaceTertiary },
  groupChoiceOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  usage: { color: colors.onSurfaceTertiary, fontSize: 12, lineHeight: 18, marginTop: 10 },
  linkBtn: { marginTop: 10, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { color: colors.warning, fontSize: 13, fontWeight: "600" },
}));

const LOCATIONS = [
  { key: "fridge", label: "Frigo", icon: "refrigerator" },
  { key: "freezer", label: "Congél.", icon: "snowflake" },
  { key: "pantry", label: "Placards", icon: "archive" },
] as const;

export default function Inventory() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loc, setLoc] = useState<string>("fridge");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [addLoc, setAddLoc] = useState<string>("fridge");
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const router = useRouter();
  const { program } = useProgram();

  const load = useCallback(async () => {
    try {
      const [list, t] = await Promise.all([api<any[]>("/inventory"), api<any>("/targets").catch(() => null)]);
      setItems(list);
      if (t) { setTargets(t); setRules(t.rules); }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRules = async (patch: any) => {
    const next = { ...rules, ...patch };
    setRules(next);
    if (targets) { try { await api("/targets", { method: "PUT", body: JSON.stringify({ ...targets, rules: next }) }); } catch {} }
  };

  const usage = useMemo(() => {
    if (!program) return null;
    let meals = 0; let withHome = 0;
    for (const w of program.weeks) for (const d of w.days) for (const m of Object.values(d.meals)) { meals++; if (m.pantry_used.length) withHome++; }
    return { meals, withHome };
  }, [program]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => items.filter((i) => i.location === loc), [items, loc]);

  const togglePri = async (item: any) => {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, priority: !it.priority } : it)));
    try { await api(`/inventory/${item.id}`, { method: "PUT", body: JSON.stringify({ priority: !item.priority }) }); } catch {}
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try { await api(`/inventory/${id}`, { method: "DELETE" }); } catch {}
  };

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await api("/inventory", { method: "POST", body: JSON.stringify({ name: name.trim(), location: addLoc, priority: false }) });
      setItems((prev) => [created, ...prev]);
      setName("");
      sheetRef.current?.close();
    } finally { setBusy(false); }
  };

  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Ma maison</Text>
          <Text style={styles.title}>Ce que j’ai déjà</Text>
          <Text style={styles.subtitle}>Les aliments prioritaires ⚡ seront utilisés en premier dans vos menus.</Text>
        </View>

        <View style={{ backgroundColor: themeColors.surface }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent} style={styles.chipRow}>
            {LOCATIONS.map((l) => (
              <Pressable key={l.key} testID={`loc-chip-${l.key}`} onPress={() => setLoc(l.key)} style={[styles.chip, l.key === loc && styles.chipActive]}>
                <LucideIcon name={l.icon as any} size={13} color={l.key === loc ? themeColors.onBrandTertiary : themeColors.muted} />
                <Text style={[styles.chipText, l.key === loc && styles.chipTextActive]}>{l.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {rules && (
          <View style={styles.optCard} testID="pantry-options">
            <Pressable testID="pantry-priority-toggle" onPress={() => updateRules({ pantry_priority: !rules.pantry_priority })} style={styles.optRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optLabel}>Utiliser en priorité ce que j’ai</Text>
                <Text style={styles.optHint}>Appuyez sur ⚡ pour marquer un aliment à utiliser d’urgence.</Text>
              </View>
              <View style={[styles.switch, { backgroundColor: rules.pantry_priority ? themeColors.brandPrimary : themeColors.border }]}>
                <View style={[styles.knob, { marginLeft: rules.pantry_priority ? 16 : 0 }]} />
              </View>
            </Pressable>
            <Text style={styles.groupTitle}>Comment utiliser mes aliments ?</Text>
            {[
              { key: "together", icon: "utensils", title: "Aliments à manger ensemble", hint: "Regrouper les aliments compatibles dans un même repas (ex. poulet + riz + courgettes)." },
              { key: "separate", icon: "move-horizontal", title: "Aliments à manger séparément", hint: "Répartir les aliments sur plusieurs repas et éviter de les regrouper." },
            ].map((g) => (
              <Pressable key={g.key} testID={`pantry-grouping-${g.key}`} onPress={() => updateRules({ pantry_grouping: g.key })} style={[styles.groupChoice, rules.pantry_grouping === g.key && styles.groupChoiceOn]}>
                <LucideIcon name={g.icon as any} size={16} color={rules.pantry_grouping === g.key ? themeColors.onBrandTertiary : themeColors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optLabel}>{g.title}</Text>
                  <Text style={styles.optHint}>{g.hint}</Text>
                </View>
              </Pressable>
            ))}
            <Text style={styles.usage}>
              💡 Le stock est réparti automatiquement dans des repas compatibles lors de la génération. Maison ne régénère jamais le plan toute seule.
              {usage ? ` Actuellement : ${usage.withHome} repas sur ${usage.meals} utilisent un aliment de chez vous.` : ""}
            </Text>
            {program && (
              <Pressable testID="pantry-go-menus" onPress={() => router.push("/(tabs)/planner")} style={styles.linkBtn}>
                <Text style={styles.linkText}>Voir mes menus</Text>
                <LucideIcon name="arrow-right" size={14} color={themeColors.warning} />
              </Pressable>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={themeColors.warning} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <LucideIcon name="package-open" size={32} color={themeColors.warning} />
            <Text style={styles.emptyText}>Aucun aliment ajouté. Appuyez sur + pour ajouter.</Text>
          </View>
        ) : (
          filtered.map((it) => (
            <View key={it.id} style={[styles.itemCard, it.priority && styles.itemCardPri]} testID={`inv-item-${it.id}`}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Pressable testID={`inv-priority-${it.id}`} onPress={() => togglePri(it)} style={[styles.priBtn, it.priority && styles.priBtnOn]}>
                <LucideIcon name="zap" size={16} color={it.priority ? themeColors.onWarning : themeColors.warning} />
              </Pressable>
              <Pressable testID={`inv-delete-${it.id}`} onPress={() => remove(it.id)} style={styles.delBtn}>
                <LucideIcon name="trash-2" size={18} color={themeColors.muted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable testID="inv-add-fab" onPress={() => { setAddLoc(loc); sheetRef.current?.expand(); }} style={styles.fab}>
        <LucideIcon name="plus" size={22} color={themeColors.onBrandPrimary} />
      </Pressable>

      <BottomSheet ref={sheetRef} snapPoints={["55%"]} index={-1} enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: themeColors.surfaceSecondary }} handleIndicatorStyle={{ backgroundColor: themeColors.borderStrong }}>
        <BottomSheetView>
          <Text style={styles.sheetTitle}>Ajouter un aliment</Text>
          <TextInput testID="inv-add-name" placeholder="Ex : Courgettes, poulet, riz complet…" placeholderTextColor={themeColors.muted} value={name} onChangeText={setName} style={styles.input} />
          <View style={styles.locRow}>
            {LOCATIONS.map((l) => (
              <Pressable key={l.key} testID={`inv-add-loc-${l.key}`} onPress={() => setAddLoc(l.key)} style={[styles.locChip, addLoc === l.key && styles.locChipActive]}>
                <LucideIcon name={l.icon as any} size={13} color={addLoc === l.key ? themeColors.onBrandTertiary : themeColors.muted} />
                <Text style={[styles.locText, addLoc === l.key && styles.locTextActive]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable testID="inv-add-submit" onPress={add} disabled={busy || !name.trim()} style={[styles.addBtn, (busy || !name.trim()) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color={themeColors.onBrandPrimary} /> : <Text style={styles.addBtnText}>Ajouter</Text>}
          </Pressable>
          <View style={{ height: insets.bottom + 20 }} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
