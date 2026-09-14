import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { makeStyles, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useProgram } from "@/src/program-store";

const useStyles = makeStyles((colors) => ({
  card: { marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  week: { color: colors.muted, fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "48%", flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  statLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
  statValue: { color: colors.onSurface, fontSize: 20, fontWeight: "300", marginTop: 4 },
  statUnit: { color: colors.muted, fontSize: 11 },
  tip: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.brandTertiary, flexDirection: "row", gap: 10 },
  tipText: { color: colors.onBrandTertiary, fontSize: 12, lineHeight: 18, flex: 1 },
}));

export function WeeklyRecap({ week }: { week: number }) {
  const styles = useStyles();
  useTheme();
  const { program } = useProgram();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!program) return;
    api(`/programs/${program.id}/recap/${week}`).then(setData).catch(() => setData(null));
  }, [program, week]);

  if (!data) return null;
  const trend = data.weight_trend;
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card} testID="recap-card">
      <View style={styles.head}>
        <Text style={styles.title}>📊 Bilan de la semaine</Text>
        <Text style={styles.week}>Semaine {data.week}</Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.stat}><Text style={styles.statLabel}>Repas faits</Text><Text style={styles.statValue}>{data.done}<Text style={styles.statUnit}> / {data.meals} · {data.progress} %</Text></Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Hydratation</Text><Text style={styles.statValue}>{String((Math.round(data.water_avg * 25) / 100)).replace(".", ",")} L<Text style={styles.statUnit}> / jour{"\n"}objectif {String(data.water_goal * 0.25).replace(".", ",")} L</Text></Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Poids</Text><Text style={styles.statValue}>{trend === null ? "—" : `${trend > 0 ? "+" : ""}${trend}`}<Text style={styles.statUnit}> kg sur les dernières pesées</Text></Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Courses</Text><Text style={styles.statValue}>{data.shopping_checked}<Text style={styles.statUnit}> / {data.shopping_total} produits</Text></Text></View>
      </View>
      <View style={styles.tip}>
        <Text style={{ fontSize: 16 }}>💡</Text>
        <Text style={styles.tipText}>{data.tip}</Text>
      </View>
    </Animated.View>
  );
}
