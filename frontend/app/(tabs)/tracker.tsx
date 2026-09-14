import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LucideIcon from "@react-native-vector-icons/lucide";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { api } from "@/src/api";
import { WeightChart } from "@/src/components/WeightChart";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 6 },

  statsRow: { flexDirection: "row", paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  stat: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.muted, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 1 },
  statValue: { color: colors.onSurface, fontSize: 22, fontWeight: "300", marginTop: 6 },
  statUnit: { color: colors.muted, fontSize: 12 },

  chartCard: { marginHorizontal: 24, marginBottom: 20, padding: 20, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chartTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600", marginBottom: 6 },
  chartSub: { color: colors.muted, fontSize: 12, marginBottom: 20 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  goalInput: { flex: 1, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, height: 40, color: colors.onSurface, fontSize: 14 },
  goalBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 14, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  goalBtnText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "600" },
  milestone: { marginHorizontal: 24, marginBottom: 20, padding: 16, borderRadius: 18, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary, flexDirection: "row", alignItems: "center", gap: 14 },
  milestoneEmoji: { fontSize: 28 },
  milestoneTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  milestoneText: { color: colors.onBrandTertiary, fontSize: 12, marginTop: 2, lineHeight: 17 },
  goalTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceSecondary, marginTop: 8 },
  goalFill: { height: 8, borderRadius: 999, backgroundColor: colors.warning },
  chartEmpty: { color: colors.muted, fontSize: 13, textAlign: "center", paddingVertical: 40 },

  sectionTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "300", paddingHorizontal: 24, marginBottom: 12 },
  wRow: { marginHorizontal: 24, marginBottom: 10, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center" },
  wDate: { color: colors.muted, fontSize: 12, letterSpacing: 0.5 },
  wKg: { color: colors.onSurface, fontSize: 18, fontWeight: "400", marginTop: 4 },
  wRight: { flex: 1, alignItems: "flex-end" },
  wNote: { color: colors.muted, fontSize: 12, marginTop: 4, maxWidth: "60%", textAlign: "right" },
  delBtn: { padding: 6, marginLeft: 8 },

  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: colors.brandPrimary, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fabText: { color: colors.onBrandPrimary, fontWeight: "600" },

  sheetTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "300", marginBottom: 4, paddingHorizontal: 20 },
  sheetSub: { color: colors.muted, fontSize: 13, marginBottom: 16, paddingHorizontal: 20 },
  label: { color: colors.muted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginHorizontal: 20, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.onSurface, fontSize: 15, marginHorizontal: 20 },
  scaleRow: { flexDirection: "row", gap: 6, marginHorizontal: 20 },
  scaleChip: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  scaleChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  scaleText: { color: colors.muted, fontSize: 13 },
  scaleTextActive: { color: colors.onBrandTertiary, fontWeight: "600" },
  saveBtn: { margin: 20, backgroundColor: colors.brandPrimary, paddingVertical: 16, borderRadius: 999, alignItems: "center" },
  saveText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 15 },
}));

export default function Tracker() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kg, setKg] = useState("");
  const [waist, setWaist] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [satiety, setSatiety] = useState<number | null>(null);
  const [activity, setActivity] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [chartWidth, setChartWidth] = useState(0);

  const load = useCallback(async () => {
    try {
      const [list, prefs] = await Promise.all([api<any[]>("/weights"), api<any>("/preferences").catch(() => null)]);
      setWeights(list);
      const g = prefs?.goal_weight ?? null;
      setGoal(g);
      setGoalInput(g ? String(g) : "");
    } finally { setLoading(false); }
  }, []);

  const saveGoal = async () => {
    const g = goalInput.trim() ? parseFloat(goalInput.replace(",", ".")) : null;
    if (g !== null && (!g || g < 20 || g > 300)) return;
    try {
      await api("/preferences/goal", { method: "PUT", body: JSON.stringify({ goal_weight: g }) });
      setGoal(g);
    } catch {}
  };

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const deltaTotal = first && last ? (last.weight - first.weight).toFixed(1) : "—";
  const deltaLast = previous && last ? (last.weight - previous.weight).toFixed(1) : "—";

  // Moyenne par semaine (lundi → dimanche) pour lisser la courbe
  const weekly = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number; date: string }>();
    for (const w of sorted) {
      const d = new Date(w.date + "T00:00:00");
      const day = (d.getDay() + 6) % 7;
      const monday = new Date(d); monday.setDate(d.getDate() - day);
      const key = monday.toISOString().slice(0, 10);
      const b = buckets.get(key) ?? { sum: 0, n: 0, date: key };
      b.sum += w.weight; b.n += 1;
      buckets.set(key, b);
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)).map((b) => ({ date: b.date, weight: Math.round((b.sum / b.n) * 10) / 10 }));
  }, [sorted]);
  const chartData = weekly.slice(-16);

  const milestone = useMemo(() => {
    if (!first || !last) return null;
    if (!goal) return { emoji: "🎯", title: "Fixez un objectif", text: "Indiquez votre poids cible ci-dessus : une ligne d'objectif et des encouragements apparaîtront sur la courbe.", pct: 0 };
    const totalGap = first.weight - goal;
    const done = first.weight - last.weight;
    if (Math.abs(totalGap) < 0.05) return { emoji: "✨", title: "Déjà à l'objectif", text: "Votre poids de départ correspond à votre objectif : l'enjeu est la stabilité.", pct: 100 };
    const pct = Math.max(0, Math.min(100, Math.round((done / totalGap) * 100)));
    const remaining = Math.abs(last.weight - goal).toFixed(1);
    if ((totalGap > 0 && last.weight <= goal) || (totalGap < 0 && last.weight >= goal)) return { emoji: "🏆", title: "Objectif atteint !", text: "Bravo, vous y êtes. Gardez le rythme : le programme vous aide maintenant à stabiliser.", pct: 100 };
    if (pct >= 75) return { emoji: "🔥", title: "Dernière ligne droite", text: `Plus que ${remaining} kg. ${pct} % du chemin parcouru, c'est presque gagné.`, pct };
    if (pct >= 50) return { emoji: "💪", title: "Plus de la moitié !", text: `${pct} % du chemin parcouru, encore ${remaining} kg. Belle régularité.`, pct };
    if (pct >= 25) return { emoji: "🌱", title: "Un quart du chemin", text: `${pct} % déjà accompli. Chaque semaine compte, continuez ainsi.`, pct };
    if (done * Math.sign(totalGap) > 0) return { emoji: "🚀", title: "C'est parti !", text: `Premier progrès enregistré : ${Math.abs(done).toFixed(1)} kg. Encore ${remaining} kg vers l'objectif.`, pct };
    return { emoji: "🧭", title: "Cap sur l'objectif", text: `Encore ${remaining} kg. Une pesée par semaine suffit pour suivre la tendance.`, pct };
  }, [first, last, goal]);

  const openSheet = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setKg(""); setWaist(""); setEnergy(null); setSatiety(null); setActivity(null); setNote("");
    sheetRef.current?.expand();
  };

  const submit = async () => {
    const w = parseFloat(kg.replace(",", "."));
    if (!w || w < 20 || w > 300) return;
    setBusy(true);
    try {
      const entry: any = { date, weight: w };
      if (waist) entry.waist = parseFloat(waist.replace(",", "."));
      if (energy) entry.energy = energy;
      if (satiety) entry.satiety = satiety;
      if (activity) entry.activity = activity;
      if (note) entry.note = note;
      const created = await api("/weights", { method: "POST", body: JSON.stringify(entry) });
      setWeights((prev) => [...prev, created]);
      sheetRef.current?.close();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setWeights((prev) => prev.filter((w) => w.id !== id));
    try { await api(`/weights/${id}`, { method: "DELETE" }); } catch {}
  };

  const renderBackdrop = useCallback((props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Mon suivi</Text>
          <Text style={styles.title}>Évolution</Text>
          <Text style={styles.subtitle}>Une pesée par semaine, le matin, à jeun.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Dernière</Text>
            <Text style={styles.statValue}>{last?.weight ?? "—"} <Text style={styles.statUnit}>kg</Text></Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Écart préc.</Text>
            <Text style={styles.statValue}>{deltaLast} <Text style={styles.statUnit}>kg</Text></Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Depuis début</Text>
            <Text style={styles.statValue}>{deltaTotal} <Text style={styles.statUnit}>kg</Text></Text>
          </View>
        </View>

        <View style={styles.chartCard} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 40)} testID="weight-chart">
          <Text style={styles.chartTitle}>Ma courbe hebdomadaire</Text>
          <Text style={styles.chartSub}>{chartData.length > 0 ? `${chartData.length} semaine${chartData.length > 1 ? "s" : ""} de suivi` : "Ajoutez votre première pesée"}</Text>
          {chartData.length === 0 ? (
            <Text style={styles.chartEmpty}>La courbe apparaîtra après vos pesées.</Text>
          ) : chartWidth > 0 ? (
            <WeightChart data={chartData} goal={goal} width={chartWidth} />
          ) : null}
          <View style={styles.goalRow}>
            <LucideIcon name="target" size={16} color={themeColors.warning} />
            <TextInput testID="goal-input" value={goalInput} onChangeText={setGoalInput} placeholder="Objectif (kg)" placeholderTextColor={themeColors.muted} keyboardType="decimal-pad" style={styles.goalInput} />
            <Pressable testID="goal-save" onPress={saveGoal} style={styles.goalBtn}><Text style={styles.goalBtnText}>{goal ? "Mettre à jour" : "Fixer"}</Text></Pressable>
          </View>
        </View>

        {(() => {
          const lastDate = last ? new Date(last.date + "T00:00:00").getTime() : 0;
          const days = last ? Math.floor((Date.now() - lastDate) / 86400000) : 99;
          const monday = new Date().getDay() === 1;
          if (!(monday || days >= 7)) return null;
          return (
            <View style={[styles.milestone, { borderColor: themeColors.warning }]} testID="weigh-reminder">
              <Text style={styles.milestoneEmoji}>⚖️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneTitle}>{monday ? "C’est lundi : pesée de la semaine" : `Dernière pesée il y a ${days === 99 ? "…" : days} jours`}</Text>
                <Text style={styles.milestoneText}>Le matin, à jeun, après être passé aux toilettes. Une seule pesée par semaine suffit pour suivre la tendance.</Text>
              </View>
              <Pressable testID="weigh-now" onPress={() => sheetRef.current?.expand()} style={{ backgroundColor: themeColors.brandPrimary, paddingHorizontal: 12, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: themeColors.onBrandPrimary, fontSize: 12, fontWeight: "600" }}>Peser</Text>
              </Pressable>
            </View>
          );
        })()}

        {milestone && (
          <View style={styles.milestone} testID="milestone-card">
            <Text style={styles.milestoneEmoji}>{milestone.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneText}>{milestone.text}</Text>
              {goal ? <View style={styles.goalTrack}><View style={[styles.goalFill, { width: `${milestone.pct}%` }]} /></View> : null}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Mes pesées</Text>
        {loading ? (
          <ActivityIndicator color={themeColors.warning} style={{ marginTop: 20 }} />
        ) : sorted.length === 0 ? (
          <Text style={styles.chartEmpty}>Aucune pesée enregistrée.</Text>
        ) : (
          [...sorted].reverse().map((w) => (
            <View key={w.id} style={styles.wRow} testID={`weight-row-${w.id}`}>
              <View>
                <Text style={styles.wDate}>{w.date}</Text>
                <Text style={styles.wKg}>{w.weight} kg{w.waist ? `  ·  ${w.waist} cm` : ""}</Text>
              </View>
              <View style={styles.wRight}>
                {w.note ? <Text style={styles.wNote} numberOfLines={2}>{w.note}</Text> : null}
              </View>
              <Pressable testID={`weight-del-${w.id}`} onPress={() => remove(w.id)} style={styles.delBtn}>
                <LucideIcon name="trash-2" size={16} color={themeColors.muted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable testID="add-weight-fab" onPress={openSheet} style={styles.fab}>
        <LucideIcon name="plus" size={16} color={themeColors.onBrandPrimary} />
        <Text style={styles.fabText}>Ajouter une pesée</Text>
      </Pressable>

      <BottomSheet ref={sheetRef} snapPoints={["85%"]} index={-1} enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: themeColors.surfaceSecondary }} handleIndicatorStyle={{ backgroundColor: themeColors.borderStrong }}>
        <BottomSheetScrollView>
          <Text style={styles.sheetTitle}>Nouvelle pesée</Text>
          <Text style={styles.sheetSub}>Ces données ne modifient jamais votre programme.</Text>

          <Text style={styles.label}>Date</Text>
          <TextInput testID="weight-date" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" placeholderTextColor={themeColors.muted} style={styles.input} />

          <Text style={styles.label}>Poids (kg)</Text>
          <TextInput testID="weight-kg" value={kg} onChangeText={setKg} placeholder="72.5" placeholderTextColor={themeColors.muted} keyboardType="decimal-pad" style={styles.input} />

          <Text style={styles.label}>Tour de taille (cm) · optionnel</Text>
          <TextInput testID="weight-waist" value={waist} onChangeText={setWaist} placeholder="80" placeholderTextColor={themeColors.muted} keyboardType="decimal-pad" style={styles.input} />

          <Text style={styles.label}>Énergie</Text>
          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} testID={`energy-${n}`} onPress={() => setEnergy(energy === n ? null : n)} style={[styles.scaleChip, energy === n && styles.scaleChipActive]}>
                <Text style={[styles.scaleText, energy === n && styles.scaleTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Satiété</Text>
          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} testID={`satiety-${n}`} onPress={() => setSatiety(satiety === n ? null : n)} style={[styles.scaleChip, satiety === n && styles.scaleChipActive]}>
                <Text style={[styles.scaleText, satiety === n && styles.scaleTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Activité</Text>
          <View style={styles.scaleRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} testID={`activity-${n}`} onPress={() => setActivity(activity === n ? null : n)} style={[styles.scaleChip, activity === n && styles.scaleChipActive]}>
                <Text style={[styles.scaleText, activity === n && styles.scaleTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Note · optionnel</Text>
          <TextInput testID="weight-note" value={note} onChangeText={setNote} placeholder="Ex : bonne semaine…" placeholderTextColor={themeColors.muted} style={styles.input} />

          <Pressable testID="weight-submit" onPress={submit} disabled={busy || !kg} style={[styles.saveBtn, (busy || !kg) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color={themeColors.onBrandPrimary} /> : <Text style={styles.saveText}>Enregistrer la pesée</Text>}
          </Pressable>
          <View style={{ height: insets.bottom + 20 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
