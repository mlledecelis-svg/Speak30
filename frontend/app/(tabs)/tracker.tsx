import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LucideIcon from "@react-native-vector-icons/lucide";
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { makeStyles } from "@/src/theme";
import { api } from "@/src/api";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 6 },

  statsRow: { flexDirection: "row", paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  stat: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  statValue: { color: colors.onSurface, fontSize: 22, fontWeight: "300", marginTop: 6 },
  statUnit: { color: colors.muted, fontSize: 12 },

  chartCard: { marginHorizontal: 24, marginBottom: 20, padding: 20, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chartTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600", marginBottom: 6 },
  chartSub: { color: colors.muted, fontSize: 12, marginBottom: 20 },
  chartArea: { height: 160, marginTop: 8, position: "relative", flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bar: { flex: 1, backgroundColor: colors.brandPrimary, borderRadius: 4 },
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

  const load = useCallback(async () => {
    try {
      const list = await api<any[]>("/weights");
      setWeights(list);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const deltaTotal = first && last ? (last.weight - first.weight).toFixed(1) : "—";
  const deltaLast = previous && last ? (last.weight - previous.weight).toFixed(1) : "—";

  const chartData = sorted.slice(-12);
  const max = Math.max(...chartData.map((w) => w.weight), 0);
  const min = Math.min(...chartData.map((w) => w.weight), max);
  const range = Math.max(max - min, 1);

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
            <Text style={styles.statLabel}>Dernier</Text>
            <Text style={styles.statValue}>{last?.weight ?? "—"} <Text style={styles.statUnit}>kg</Text></Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Précédente</Text>
            <Text style={styles.statValue}>{deltaLast} <Text style={styles.statUnit}>kg</Text></Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Depuis début</Text>
            <Text style={styles.statValue}>{deltaTotal} <Text style={styles.statUnit}>kg</Text></Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Ma courbe</Text>
          <Text style={styles.chartSub}>{chartData.length > 0 ? `${chartData.length} pesées récentes` : "Ajoutez votre première pesée"}</Text>
          {chartData.length === 0 ? (
            <Text style={styles.chartEmpty}>La courbe apparaîtra après vos pesées.</Text>
          ) : (
            <View style={styles.chartArea}>
              {chartData.map((w, i) => {
                const h = ((w.weight - min) / range) * 140 + 20;
                return <View key={w.id || i} style={[styles.bar, { height: h }]} />;
              })}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Mes pesées</Text>
        {loading ? (
          <ActivityIndicator color="#B08D57" style={{ marginTop: 20 }} />
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
                <LucideIcon name="trash-2" size={16} color="#8A8A8A" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable testID="add-weight-fab" onPress={openSheet} style={styles.fab}>
        <LucideIcon name="plus" size={16} color="#F2F2F2" />
        <Text style={styles.fabText}>Ajouter une pesée</Text>
      </Pressable>

      <BottomSheet ref={sheetRef} snapPoints={["85%"]} index={-1} enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: "#141414" }} handleIndicatorStyle={{ backgroundColor: "#3D3D3D" }}>
        <BottomSheetScrollView>
          <Text style={styles.sheetTitle}>Nouvelle pesée</Text>
          <Text style={styles.sheetSub}>Ces données ne modifient jamais votre programme.</Text>

          <Text style={styles.label}>Date</Text>
          <TextInput testID="weight-date" value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" placeholderTextColor="#5A5A5A" style={styles.input} />

          <Text style={styles.label}>Poids (kg)</Text>
          <TextInput testID="weight-kg" value={kg} onChangeText={setKg} placeholder="72.5" placeholderTextColor="#5A5A5A" keyboardType="decimal-pad" style={styles.input} />

          <Text style={styles.label}>Tour de taille (cm) · optionnel</Text>
          <TextInput testID="weight-waist" value={waist} onChangeText={setWaist} placeholder="80" placeholderTextColor="#5A5A5A" keyboardType="decimal-pad" style={styles.input} />

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
          <TextInput testID="weight-note" value={note} onChangeText={setNote} placeholder="Ex : bonne semaine…" placeholderTextColor="#5A5A5A" style={styles.input} />

          <Pressable testID="weight-submit" onPress={submit} disabled={busy || !kg} style={[styles.saveBtn, (busy || !kg) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#F2F2F2" /> : <Text style={styles.saveText}>Enregistrer la pesée</Text>}
          </Pressable>
          <View style={{ height: insets.bottom + 20 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
