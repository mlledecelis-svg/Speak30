import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { api } from "@/src/api";
import { useProgram } from "@/src/program-store";
import { lineEquivalents, LibEq } from "@/src/equivalents";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "300" },
  sub: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  close: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  segment: { flexDirection: "row", marginHorizontal: 20, marginTop: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.brandTertiary },
  segText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  segTextOn: { color: colors.onBrandTertiary },
  help: { marginHorizontal: 20, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceSecondary, borderLeftWidth: 3, borderLeftColor: colors.warning },
  helpText: { color: colors.onSurfaceTertiary, fontSize: 12, lineHeight: 18 },
  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  cardTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600", flexDirection: "row" },
  mini: { paddingHorizontal: 10, height: 30, borderRadius: 999, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  miniText: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  group: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  groupTitle: { color: colors.warning, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600", marginBottom: 6 },
  line: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  lineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lineCat: { color: colors.onSurface, fontSize: 14, fontWeight: "500", flex: 1 },
  lineOff: { color: colors.muted, textDecorationLine: "line-through" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  stepInput: { color: colors.onSurface, fontSize: 14, minWidth: 64, textAlign: "center", backgroundColor: colors.surfaceTertiary, borderRadius: 8, paddingVertical: 6, fontWeight: "600" },
  refRow: { gap: 6, paddingTop: 8 },
  refChip: { paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  refChipOn: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  refText: { color: colors.muted, fontSize: 11 },
  refTextOn: { color: colors.onBrandTertiary },
  eqBox: { marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  eqTitle: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600", marginBottom: 4 },
  eqLine: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 18 },
  eqGrams: { color: colors.onSurface, fontWeight: "700" },
  eqFoods: { color: colors.muted, fontSize: 11 },
  eqRule: { color: colors.warning, fontSize: 11, marginTop: 6, lineHeight: 16 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  switch: { width: 36, height: 22, borderRadius: 999, padding: 2 },
  knob: { width: 18, height: 18, borderRadius: 999, backgroundColor: colors.onSurface },
  ruleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  ruleLabel: { color: colors.onSurfaceSecondary, fontSize: 13, flex: 1, paddingRight: 10 },
  locked: { color: colors.muted, fontSize: 11, marginTop: 10, lineHeight: 16 },
  input: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.onSurface, fontSize: 14, marginTop: 8 },
  chipsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  chipTextOn: { color: colors.onBrandTertiary },
  generate: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.brandPrimary, height: 54, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  generateText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 15 },
  secondary: { marginHorizontal: 20, marginTop: 10, height: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.onSurfaceSecondary, fontWeight: "600", fontSize: 13 },
  msg: { marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.brandTertiary },
  msgText: { color: colors.onBrandTertiary, fontSize: 12 },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  histName: { color: colors.onSurface, fontSize: 13, flex: 1 },
  histMeta: { color: colors.muted, fontSize: 11 },
}));

type Line = { category: string; ref: string; options: string[]; grams: number };
const CAT_LABEL: Record<string, string> = { starch: "Féculents", protein: "Sources de protéines", vegetables: "Légumes", fat: "Matières grasses", dairy: "Laitages", fruit: "Fruits", sweet: "Produits sucrés", oleaginous: "Fruits oléagineux", chocolate: "Chocolat" };
const DURATIONS = [{ v: 2, l: "2 sem." }, { v: 4, l: "1 mois" }, { v: 6, l: "6 sem." }, { v: 8, l: "2 mois" }];

function Toggle({ on, onPress, testID }: { on: boolean; onPress: () => void; testID: string }) {
  const styles = useStyles();
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.switch, { backgroundColor: on ? themeColors.brandPrimary : themeColors.border }]}>
      <View style={[styles.knob, { marginLeft: on ? 14 : 0 }]} />
    </Pressable>
  );
}

function LineRow({ line, eqLabels, equivalences, bonusG, onChange, testID }: { line: Line; eqLabels: Record<string, string>; equivalences: Record<string, LibEq>; bonusG: number; onChange: (l: Line) => void; testID: string }) {
  const styles = useStyles();
  const set = (g: number) => onChange({ ...line, grams: Math.max(0, Math.round(g)) });
  const equivalents = line.grams > 0 ? lineEquivalents(equivalences, line.ref, line.grams, line.options ?? [line.ref]).filter((e) => !e.isRef) : [];
  const breadRule = line.category === "starch" && (line.options ?? []).some((o) => o === "eq_main_bread" || o === "eq_main_crispbread");
  return (
    <View style={styles.line}>
      <View style={styles.lineTop}>
        <Text style={[styles.lineCat, line.grams <= 0 && styles.lineOff]}>{CAT_LABEL[line.category] ?? line.category}</Text>
        <View style={styles.stepper}>
          <Pressable testID={`${testID}-dec`} onPress={() => set(line.grams - 5)} style={styles.stepBtn}><LucideIcon name="minus" size={14} color={themeColors.onSurfaceTertiary} /></Pressable>
          <TextInput testID={`${testID}-input`} style={styles.stepInput} keyboardType="numeric" value={String(line.grams)} onChangeText={(t) => set(Number(t.replace(",", ".")) || 0)} />
          <Pressable testID={`${testID}-inc`} onPress={() => set(line.grams + 5)} style={styles.stepBtn}><LucideIcon name="plus" size={14} color={themeColors.onSurfaceTertiary} /></Pressable>
          <Text style={{ color: themeColors.muted, fontSize: 12 }}>g</Text>
        </View>
      </View>
      {(line.options ?? []).length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.refRow}>
          {(line.options ?? []).map((o) => (
            <Pressable key={o} testID={`${testID}-ref-${o}`} onPress={() => onChange({ ...line, ref: o, grams: Math.max(0, Math.round(line.grams * ((equivalences[o]?.portion ?? 100) / (equivalences[line.ref]?.portion ?? 100)))) })} style={[styles.refChip, line.ref === o && styles.refChipOn]}>
              <Text style={[styles.refText, line.ref === o && styles.refTextOn]}>{eqLabels[o] ?? o}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {equivalents.length > 0 && (
        <View style={styles.eqBox} testID={`${testID}-equivalents`}>
          <Text style={styles.eqTitle}>Vous pouvez remplacer {line.grams} g de {(eqLabels[line.ref] ?? line.ref).toLowerCase()} par :</Text>
          {equivalents.map((e, i) => (
            <Text key={`${e.eq}-${i}`} style={styles.eqLine}>• <Text style={styles.eqGrams}>{e.grams} g</Text> de {e.label.toLowerCase()}{e.foods.length > 0 && e.label !== e.foods.join(" / ") ? <Text style={styles.eqFoods}> ({e.foods.join(", ").toLowerCase()})</Text> : null}</Text>
          ))}
          {breadRule && <Text style={styles.eqRule}>Règle pro : si le pain ou les biscottes remplacent le féculent, +{bonusG} g de légumes sont ajoutés automatiquement au repas.</Text>}
        </View>
      )}
    </View>
  );
}

export default function ConfigScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { generate, setProgram, refresh } = useProgram();
  const [targets, setTargets] = useState<any>(null);
  const [lib, setLib] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [method, setMethod] = useState<"manual" | "text">("manual");
  const [pasted, setPasted] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [exclusions, setExclusions] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [t, l, h] = await Promise.all([api("/targets"), api("/library"), api<any[]>("/programs").catch(() => [])]);
    setTargets(t);
    setLib(l);
    setHistory(h);
    setExclusions((t.rules?.exclusions ?? []).join(", "));
  }, []);
  useEffect(() => { load(); }, [load]);

  const eqLabels: Record<string, string> = lib ? Object.fromEntries(Object.values(lib.equivalences).map((e: any) => [e.id, e.label])) : {};
  const defaults = lib?.default_program;

  const setLines = (path: string[], lines: Line[]) => setTargets((t: any) => {
    const copy = JSON.parse(JSON.stringify(t));
    let cur = copy;
    for (const k of path.slice(0, -1)) cur = cur[k];
    cur[path[path.length - 1]] = lines;
    return copy;
  });
  const setRule = (k: string, v: any) => setTargets((t: any) => ({ ...t, rules: { ...t.rules, [k]: v } }));
  const resetMeal = (meal: string) => {
    if (!defaults) return;
    setTargets((t: any) => ({ ...t, [meal]: JSON.parse(JSON.stringify(defaults[meal])) }));
  };
  const copyLunch = () => setTargets((t: any) => ({ ...t, dinner: { ...t.dinner, items: JSON.parse(JSON.stringify(t.lunch.items)) } }));

  const buildPayload = () => ({ ...targets, rules: { ...targets.rules, exclusions: exclusions.split(",").map((s) => s.trim()).filter(Boolean) } });

  const analyze = async () => {
    if (!pasted.trim()) { setMsg("Collez d'abord le programme."); return; }
    setBusy(true);
    try {
      await api("/targets", { method: "PUT", body: JSON.stringify(buildPayload()) });
      const res = await api<{ targets: any; updates: number }>("/targets/parse-text", { method: "POST", body: JSON.stringify({ text: pasted }) });
      setTargets(res.targets);
      setMsg(res.updates ? `${res.updates} ligne(s) détectée(s). Vérifiez l'aliment de référence et la quantité avant de générer.` : "Aucune ligne complète Catégorie + Quantité reconnue. Utilisez la saisie manuelle.");
      if (res.updates) setMethod("manual");
    } catch (e: any) { setMsg(e?.message ?? "Erreur"); } finally { setBusy(false); }
  };

  const doGenerate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api("/targets", { method: "PUT", body: JSON.stringify(buildPayload()) });
      await generate();
      router.replace("/(tabs)/planner");
    } catch (e: any) {
      const m = e?.message ?? "La génération a échoué.";
      setMsg(m);
      Alert.alert("Génération impossible", m);
    } finally { setBusy(false); }
  };

  const activate = async (id: string) => {
    setBusy(true);
    try {
      await api(`/programs/${id}/activate`, { method: "POST" });
      const p = await api<any>(`/programs/${id}`);
      setProgram(p);
      router.replace("/(tabs)/planner");
    } catch (e: any) { setMsg(e?.message ?? "Erreur"); } finally { setBusy(false); }
  };

  const removeProgram = (id: string) => {
    Alert.alert("Supprimer ce programme ?", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => { await api(`/programs/${id}`, { method: "DELETE" }); setHistory((h) => h.filter((p) => p.id !== id)); refresh(); } },
    ]);
  };

  if (!targets || !lib) {
    return <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={themeColors.warning} /></View>;
  }

  const bf = targets.breakfast;
  const showSavory = bf.variant !== "sweet";
  const showSweet = bf.variant !== "savory";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🎯 Cibles du programme</Text>
          <Text style={styles.sub}>Réglez les portions prescrites. Les menus ne sont recalculés qu’au moment où vous lancez la génération.</Text>
        </View>
        <Pressable testID="config-close" onPress={() => router.back()} style={styles.close}><LucideIcon name="x" size={20} color={themeColors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.segment}>
          {[{ k: "manual", l: "✍️ Saisie" }, { k: "text", l: "📋 Coller texte" }].map((m) => (
            <Pressable key={m.k} testID={`method-${m.k}`} onPress={() => setMethod(m.k as any)} style={[styles.segBtn, method === m.k && styles.segOn]}>
              <Text style={[styles.segText, method === m.k && styles.segTextOn]}>{m.l}</Text>
            </Pressable>
          ))}
        </View>

        {method === "text" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Collez le texte de votre planning</Text>
            <Text style={styles.sub}>Copiez le texte de votre document (PDF, email, ou « Texte en direct » sur une photo), puis collez-le ci-dessous.</Text>
            <TextInput testID="paste-input" multiline value={pasted} onChangeText={setPasted} placeholder="Collez ici le texte de votre planning…" placeholderTextColor={themeColors.muted} style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]} />
            <Pressable testID="paste-analyze" onPress={analyze} disabled={busy} style={[styles.secondary, { marginHorizontal: 0 }]}><Text style={styles.secondaryText}>Analyser ce texte</Text></Pressable>
          </View>
        )}
        {msg && <View style={styles.msg}><Text style={styles.msgText}>{msg}</Text></View>}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Petit-déjeuner</Text>
          <View style={styles.chipsRow}>
            {[{ k: "both", l: "Les deux" }, { k: "sweet", l: "🍯 Sucré" }, { k: "savory", l: "🥐 Salé" }].map((v) => (
              <Pressable key={v.k} testID={`bf-variant-${v.k}`} onPress={() => setTargets((t: any) => ({ ...t, breakfast: { ...t.breakfast, variant: v.k } }))} style={[styles.chip, bf.variant === v.k && styles.chipOn]}>
                <Text style={[styles.chipText, bf.variant === v.k && styles.chipTextOn]}>{v.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.help}>
          <Text style={styles.helpText}><Text style={{ fontWeight: "700" }}>Saisie rapide :</Text> utilisez − / + pour ajuster les grammages. Une quantité à 0 désactive automatiquement cette catégorie dans les menus, les recettes et les courses. Les équivalences affichées sous chaque ligne sont recalculées à partir de la bibliothèque professionnelle dès que la quantité change.</Text>
        </View>

        {/* Petit-déjeuner */}
        <View style={styles.card} testID="card-breakfast">
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>🌅 Petit-déjeuner</Text>
            <Pressable testID="reset-breakfast" onPress={() => resetMeal("breakfast")} style={styles.mini}><Text style={styles.miniText}>Réinitialiser</Text></Pressable>
          </View>
          {showSavory && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>🥚 Petit-déjeuner salé</Text>
              {bf.savory.map((ln: Line, i: number) => <LineRow key={i} line={ln} eqLabels={eqLabels} equivalences={lib.equivalences} bonusG={lib.rules_info?.bread_vegetable_bonus_g ?? 80} testID={`bf-savory-${i}`} onChange={(l) => setLines(["breakfast", "savory"], bf.savory.map((x: Line, j: number) => (j === i ? l : x)))} />)}
            </View>
          )}
          {showSweet && (
            <>
              <View style={styles.group}>
                <Text style={styles.groupTitle}>🍯 Petit-déjeuner sucré — trame céréales</Text>
                {bf.sweet_cereal.map((ln: Line, i: number) => <LineRow key={i} line={ln} eqLabels={eqLabels} equivalences={lib.equivalences} bonusG={lib.rules_info?.bread_vegetable_bonus_g ?? 80} testID={`bf-cereal-${i}`} onChange={(l) => setLines(["breakfast", "sweet_cereal"], bf.sweet_cereal.map((x: Line, j: number) => (j === i ? l : x)))} />)}
              </View>
              <View style={styles.group}>
                <Text style={styles.groupTitle}>🍞 Petit-déjeuner sucré — trame pain/biscottes</Text>
                {bf.sweet_bread.map((ln: Line, i: number) => <LineRow key={i} line={ln} eqLabels={eqLabels} equivalences={lib.equivalences} bonusG={lib.rules_info?.bread_vegetable_bonus_g ?? 80} testID={`bf-bread-${i}`} onChange={(l) => setLines(["breakfast", "sweet_bread"], bf.sweet_bread.map((x: Line, j: number) => (j === i ? l : x)))} />)}
              </View>
            </>
          )}
        </View>

        {/* Déjeuner */}
        <View style={styles.card} testID="card-lunch">
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>☀️ Déjeuner</Text>
            <Pressable testID="reset-lunch" onPress={() => resetMeal("lunch")} style={styles.mini}><Text style={styles.miniText}>Réinitialiser</Text></Pressable>
          </View>
          {targets.lunch.items.map((ln: Line, i: number) => <LineRow key={i} line={ln} eqLabels={eqLabels} equivalences={lib.equivalences} bonusG={lib.rules_info?.bread_vegetable_bonus_g ?? 80} testID={`lunch-${i}`} onChange={(l) => setLines(["lunch", "items"], targets.lunch.items.map((x: Line, j: number) => (j === i ? l : x)))} />)}
        </View>

        {/* Collation */}
        <View style={styles.card} testID="card-snack">
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>🍎 Collation</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.miniText}>Collation active</Text>
              <Toggle testID="toggle-snack" on={targets.snack.active} onPress={() => setTargets((t: any) => ({ ...t, snack: { ...t.snack, active: !t.snack.active } }))} />
              <Pressable testID="reset-snack" onPress={() => resetMeal("snack")} style={styles.mini}><Text style={styles.miniText}>Réinit.</Text></Pressable>
            </View>
          </View>
          {targets.snack.active && <Text style={styles.sub}>Le groupe Laitage de la collation reprend les équivalences du petit-déjeuner ; 0 g = non prescrit.</Text>}
          {targets.snack.active && targets.snack.items.map((ln: Line, i: number) => <LineRow key={i} line={ln} eqLabels={eqLabels} equivalences={lib.equivalences} bonusG={lib.rules_info?.bread_vegetable_bonus_g ?? 80} testID={`snack-${i}`} onChange={(l) => setLines(["snack", "items"], targets.snack.items.map((x: Line, j: number) => (j === i ? l : x)))} />)}
        </View>

        {/* Dîner */}
        <View style={styles.card} testID="card-dinner">
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>🌙 Dîner</Text>
            <View style={styles.toggleRow}>
              <Pressable testID="copy-lunch" onPress={copyLunch} style={styles.mini}><Text style={styles.miniText}>Copier le déjeuner</Text></Pressable>
              <Pressable testID="reset-dinner" onPress={() => resetMeal("dinner")} style={styles.mini}><Text style={styles.miniText}>Réinit.</Text></Pressable>
            </View>
          </View>
          {targets.dinner.items.map((ln: Line, i: number) => <LineRow key={i} line={ln} eqLabels={eqLabels} equivalences={lib.equivalences} bonusG={lib.rules_info?.bread_vegetable_bonus_g ?? 80} testID={`dinner-${i}`} onChange={(l) => setLines(["dinner", "items"], targets.dinner.items.map((x: Line, j: number) => (j === i ? l : x)))} />)}
        </View>

        {/* Règles professionnelles */}
        <View style={styles.card}>
          <Pressable testID="rules-toggle" onPress={() => setRulesOpen((o) => !o)} style={styles.cardHead}>
            <Text style={styles.cardTitle}>⚙️ Règles professionnelles</Text>
            <LucideIcon name={rulesOpen ? "chevron-up" : "chevron-down"} size={18} color={themeColors.muted} />
          </Pressable>
          {rulesOpen && (
            <View>
              {[
                { k: "max_fruits_per_day", l: "Maximum de portions de fruits par jour" },
                { k: "max_cheese_per_day", l: "Fromage : maximum par jour" },
                { k: "max_cheese_per_week", l: "Fromage : maximum par semaine" },
                { k: "max_sweet_morning", l: "Produits sucrés : maximum le matin" },
              ].map((r) => (
                <View key={r.k} style={styles.ruleRow}>
                  <Text style={styles.ruleLabel}>{r.l}</Text>
                  <View style={styles.stepper}>
                    <Pressable testID={`rule-${r.k}-dec`} onPress={() => setRule(r.k, Math.max(0, (targets.rules?.[r.k] ?? 0) - 1))} style={styles.stepBtn}><LucideIcon name="minus" size={14} color={themeColors.onSurfaceTertiary} /></Pressable>
                    <Text style={[styles.stepInput, { minWidth: 40 }]}>{targets.rules?.[r.k] ?? 0}</Text>
                    <Pressable testID={`rule-${r.k}-inc`} onPress={() => setRule(r.k, (targets.rules?.[r.k] ?? 0) + 1)} style={styles.stepBtn}><LucideIcon name="plus" size={14} color={themeColors.onSurfaceTertiary} /></Pressable>
                  </View>
                </View>
              ))}
              <View style={styles.ruleRow}>
                <Text style={styles.ruleLabel}>Pas de pain ajouté à un repas principal contenant déjà un autre féculent</Text>
                <Toggle testID="rule-no-bread-mix" on={!!targets.rules.no_bread_mix} onPress={() => setRule("no_bread_mix", !targets.rules.no_bread_mix)} />
              </View>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleLabel}>Autoriser l’interversion déjeuner / dîner lorsque leurs portions sont identiques</Text>
                <Toggle testID="rule-allow-swap" on={!!targets.rules.allow_lunch_dinner_swap} onPress={() => setRule("allow_lunch_dinner_swap", !targets.rules.allow_lunch_dinner_swap)} />
              </View>
              <Text style={styles.locked}>🔒 Règles fixes : produits sucrés, laits et jus de fruits uniquement au petit-déjeuner ; fruits oléagineux uniquement en collation.</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aliments à exclure</Text>
          <Text style={styles.sub}>Séparés par une virgule. Familles acceptées : poisson, viande rouge, crustacés, œufs, charcuterie, soja…</Text>
          <TextInput testID="exclusions-input" value={exclusions} onChangeText={setExclusions} placeholder="ex : crevette, cacahuète" placeholderTextColor={themeColors.muted} style={styles.input} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Durée du plan</Text>
          <View style={styles.chipsRow}>
            {DURATIONS.map((d) => (
              <Pressable key={d.v} testID={`duration-${d.v}`} onPress={() => setTargets((t: any) => ({ ...t, duration_weeks: d.v }))} style={[styles.chip, targets.duration_weeks === d.v && styles.chipOn]}>
                <Text style={[styles.chipText, targets.duration_weeks === d.v && styles.chipTextOn]}>{d.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable testID="generate-button" onPress={doGenerate} disabled={busy} style={[styles.generate, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color={themeColors.onBrandPrimary} /> : (<><LucideIcon name="sparkles" size={18} color={themeColors.onBrandPrimary} /><Text style={styles.generateText}>Générer mes menus</Text></>)}
        </Pressable>

        {history.length > 0 && (
          <View style={styles.card} testID="history-card">
            <Text style={styles.cardTitle}>🕘 Mes programmes enregistrés</Text>
            {history.map((p) => (
              <View key={p.id} style={styles.histRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histName}>{p.name}{p.active ? "  · actif" : ""}</Text>
                  <Text style={styles.histMeta}>{p.duration_weeks} semaines</Text>
                </View>
                {!p.active && <Pressable testID={`history-load-${p.id}`} onPress={() => activate(p.id)} style={styles.mini}><Text style={styles.miniText}>Charger</Text></Pressable>}
                <Pressable testID={`history-delete-${p.id}`} onPress={() => removeProgram(p.id)} style={{ padding: 6 }}><LucideIcon name="trash-2" size={16} color={themeColors.muted} /></Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
