import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Circle } from "react-native-svg";
import LucideIcon from "@react-native-vector-icons/lucide";
import Animated, { FadeInDown } from "react-native-reanimated";

import { makeStyles, useTheme } from "@/src/theme";
import { api } from "@/src/api";

const useStyles = makeStyles((colors) => ({
  card: { marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 16 },
  ring: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  btns: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  btn: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.info, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  btnText: { color: colors.onInfo, fontSize: 12, fontWeight: "600" },
  minus: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  goalBtn: { marginLeft: "auto", paddingHorizontal: 8, height: 36, alignItems: "center", justifyContent: "center" },
  goalText: { color: colors.muted, fontSize: 11 },
}));

type Hyd = { date: string; glasses: number; goal: number; progress: number };

export function HydrationCard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [data, setData] = useState<Hyd | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api<Hyd>("/hydration/today").then(setData).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (delta: number) => {
    if (busy) return;
    setBusy(true);
    setData((d) => (d ? { ...d, glasses: Math.max(0, d.glasses + delta), progress: Math.min(100, Math.round((Math.max(0, d.glasses + delta) * 100) / d.goal)) } : d));
    try { setData(await api<Hyd>("/hydration", { method: "POST", body: JSON.stringify({ delta }) })); } catch {} finally { setBusy(false); }
  };

  const cycleGoal = async () => {
    if (!data) return;
    const next = data.goal >= 12 ? 6 : data.goal + 2;
    try { setData(await api<Hyd>("/hydration/goal", { method: "PUT", body: JSON.stringify({ goal: next }) })); } catch {}
  };

  if (!data) return null;
  const r = 30, c = 2 * Math.PI * r;
  const dash = c * (1 - Math.min(1, data.glasses / data.goal));
  const done = data.glasses >= data.goal;

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={styles.card} testID="hydration-card">
        <View style={styles.ring}>
          <Svg width={72} height={72}>
            <Circle cx={36} cy={36} r={r} stroke={colors.surfaceTertiary} strokeWidth={7} fill="none" />
            <Circle cx={36} cy={36} r={r} stroke={done ? colors.brandPrimary : colors.info} strokeWidth={7} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={dash} strokeLinecap="round" transform="rotate(-90 36 36)" />
          </Svg>
          <Text style={styles.ringText} testID="hydration-count">{data.glasses}/{data.goal}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>💧 Hydratation du jour</Text>
          <Text style={styles.sub}>{done ? "Objectif atteint, bravo ! Continuez à petites gorgées." : `${data.goal - data.glasses} verre${data.goal - data.glasses > 1 ? "s" : ""} d'eau à boire pour atteindre ${data.goal} verres (≈ ${(data.goal * 0.25).toFixed(1).replace(".0", "")} L).`}</Text>
          <View style={styles.btns}>
            <Pressable testID="hydration-minus" onPress={() => update(-1)} style={styles.minus}><LucideIcon name="minus" size={14} color={colors.onSurfaceTertiary} /></Pressable>
            <Pressable testID="hydration-plus" onPress={() => update(1)} style={styles.btn}><LucideIcon name="glass-water" size={14} color={colors.onInfo} /><Text style={styles.btnText}>+ 1 verre</Text></Pressable>
            <Pressable testID="hydration-goal" onPress={cycleGoal} style={styles.goalBtn}><Text style={styles.goalText}>Objectif {data.goal} ›</Text></Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
