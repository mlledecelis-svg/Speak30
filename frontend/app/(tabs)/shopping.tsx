import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { api } from "@/src/api";
import { useProgram } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 24, marginBottom: 12 },
  eyebrow: { color: colors.warning, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "300" },
  weekChips: { paddingHorizontal: 24, gap: 8, paddingBottom: 10 },
  weekChip: { paddingHorizontal: 16, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  weekChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  weekChipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  weekChipTextActive: { color: colors.onBrandTertiary },
  progressCard: { marginHorizontal: 24, marginBottom: 14, padding: 16, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  progressCount: { color: colors.muted, fontSize: 12 },
  track: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceTertiary },
  fill: { height: 8, borderRadius: 999, backgroundColor: colors.warning },
  complete: { color: colors.onBrandTertiary, fontSize: 12, marginTop: 10, fontWeight: "600" },
  homeCard: { marginHorizontal: 24, marginBottom: 14, padding: 14, borderRadius: 16, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandSecondary },
  homeTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  homeText: { color: colors.onBrandTertiary, fontSize: 12, lineHeight: 18 },
  homeHint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  section: { marginHorizontal: 24, marginBottom: 14, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surfaceTertiary },
  sectionTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "600", letterSpacing: 0.5, flex: 1 },
  sectionCount: { color: colors.muted, fontSize: 11 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  itemName: { color: colors.onSurface, fontSize: 14, flex: 1 },
  itemNameDone: { color: colors.muted, textDecorationLine: "line-through" },
  itemSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  qty: { color: colors.warning, fontSize: 13, fontWeight: "600", textAlign: "right" },
  qtySub: { color: colors.muted, fontSize: 10, textAlign: "right" },
  emptyBox: { marginHorizontal: 24, padding: 24, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  primaryBtn: { marginTop: 18, backgroundColor: colors.brandPrimary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  primaryText: { color: colors.onBrandPrimary, fontWeight: "600", fontSize: 14 },
}));

const SECTION_ICONS: Record<string, string> = {
  "Fruits & légumes": "carrot", "Boucherie & charcuterie": "beef", "Poissonnerie & fruits de mer": "fish", "Produits laitiers & œufs": "milk",
  "Boulangerie & petit-déjeuner": "croissant", "Féculents & épicerie": "wheat", "Épicerie & végétal": "leaf", "Matières grasses & produits plaisir": "candy", Autres: "package",
};

type Shopping = { total: number; checked: number; progress: number; sections: { name: string; items: any[] }[]; home: any[] };

export default function ShoppingScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { program, loading } = useProgram();
  const [week, setWeek] = useState(0);
  const [data, setData] = useState<Shopping | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!program) { setData(null); return; }
    setBusy(true);
    try {
      setData(await api<Shopping>(`/programs/${program.id}/shopping/${week}`));
    } catch { setData(null); } finally { setBusy(false); setRefreshing(false); }
  }, [program, week]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (item: any) => {
    if (!program || !data) return;
    const next = !item.checked;
    setData((d) => {
      if (!d) return d;
      const sections = d.sections.map((s) => ({ ...s, items: s.items.map((i) => (i.key === item.key ? { ...i, checked: next } : i)) }));
      const checked = sections.reduce((n, s) => n + s.items.filter((i) => i.checked).length, 0);
      return { ...d, sections, checked, progress: d.total ? Math.round((checked * 100) / d.total) : 0 };
    });
    try { await api(`/programs/${program.id}/shopping/toggle`, { method: "POST", body: JSON.stringify({ key: item.key, checked: next }) }); } catch {}
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={themeColors.warning} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Générées depuis vos menus</Text>
          <Text style={styles.title}>Mes courses</Text>
        </View>

        {program && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekChips}>
            {program.weeks.map((w, i) => (
              <Pressable key={i} testID={`shop-week-${i}`} onPress={() => setWeek(i)} style={[styles.weekChip, i === week && styles.weekChipActive]}>
                <Text style={[styles.weekChipText, i === week && styles.weekChipTextActive]}>Semaine {w.week}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading || (busy && !data) ? (
          <ActivityIndicator color={themeColors.warning} style={{ marginTop: 40 }} />
        ) : !program ? (
          <View style={styles.emptyBox}>
            <LucideIcon name="shopping-basket" size={36} color={themeColors.warning} />
            <Text style={styles.emptyText}>La liste de courses est générée automatiquement à partir de vos menus. Créez d’abord votre programme.</Text>
            <Pressable testID="shop-cta-config" onPress={() => router.push("/config")} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Créer mon programme</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            <View style={styles.progressCard} testID="shopping-progress">
              <View style={styles.progressHead}>
                <Text style={styles.progressTitle}>🛒 Semaine {week + 1}</Text>
                <Text style={styles.progressCount}>{data.checked}/{data.total} produits à acheter</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${data.progress}%` }]} /></View>
              {data.progress === 100 && data.total > 0 && <Text style={styles.complete}>✓ Liste terminée, tout est prêt pour la semaine.</Text>}
              {data.total === 0 && <Text style={styles.complete}>✓ Aucun achat nécessaire pour cette semaine.</Text>}
            </View>

            {data.home.length > 0 && (
              <View style={styles.homeCard} testID="shopping-home">
                <Text style={styles.homeTitle}>🧺 Déjà à la maison</Text>
                <Text style={styles.homeText}>{data.home.map((h) => h.name).join(" · ")}</Text>
                <Text style={styles.homeHint}>Ces produits ne sont pas ajoutés aux achats.</Text>
              </View>
            )}

            {data.sections.map((sec) => (
              <View key={sec.name} style={styles.section} testID={`shop-section-${sec.name}`}>
                <View style={styles.sectionHead}>
                  <LucideIcon name={(SECTION_ICONS[sec.name] ?? "package") as any} size={15} color={themeColors.warning} />
                  <Text style={styles.sectionTitle}>{sec.name}</Text>
                  <Text style={styles.sectionCount}>{sec.items.filter((i) => i.checked).length}/{sec.items.length}</Text>
                </View>
                {sec.items.map((it) => (
                  <Pressable key={it.key} testID={`shop-item-${it.food_id}`} onPress={() => toggle(it)} style={styles.item}>
                    <View style={[styles.check, it.checked && styles.checkOn]}>{it.checked && <LucideIcon name="check" size={14} color={themeColors.onBrandPrimary} />}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, it.checked && styles.itemNameDone]}>{it.name}</Text>
                      {it.has_conversion && <Text style={styles.itemSub}>pour {it.cooked_grams} g cuits prévus</Text>}
                    </View>
                    <View>
                      <Text style={styles.qty}>{it.raw_grams} g{it.has_conversion ? " cru" : ""}</Text>
                      {it.units ? <Text style={styles.qtySub}>≈ {it.units} {it.unit_label}{it.units > 1 ? "s" : ""}</Text> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
