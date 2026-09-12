import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((colors) => ({
  legend: { flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 3, borderRadius: 2 },
  legendText: { color: colors.muted, fontSize: 11 },
}));

type Point = { date: string; weight: number };

export function WeightChart({ data, goal, width, height = 180 }: { data: Point[]; goal: number | null; width: number; height?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const padL = 34, padR = 12, padT = 14, padB = 26;
  const w = Math.max(width - padL - padR, 10);
  const h = height - padT - padB;
  const values = data.map((d) => d.weight).concat(goal ? [goal] : []);
  let min = Math.min(...values), max = Math.max(...values);
  if (max - min < 2) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;
  const x = (i: number) => padL + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => padT + h - ((v - min) / (max - min)) * h;

  let path = "";
  data.forEach((d, i) => {
    const px = x(i), py = y(d.weight);
    if (i === 0) path = `M ${px} ${py}`;
    else {
      const prev = { x: x(i - 1), y: y(data[i - 1].weight) };
      const cx = (prev.x + px) / 2;
      path += ` C ${cx} ${prev.y}, ${cx} ${py}, ${px} ${py}`;
    }
  });
  const area = data.length > 1 ? `${path} L ${x(data.length - 1)} ${padT + h} L ${x(0)} ${padT + h} Z` : "";
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const labelIdx = data.length <= 4 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.brandPrimary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={colors.brandPrimary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {ticks.map((t, i) => (
          <React.Fragment key={i}>
            <Line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke={colors.divider} strokeWidth={1} />
            <SvgText x={padL - 6} y={y(t) + 4} fill={colors.muted} fontSize={10} textAnchor="end">{t.toFixed(1)}</SvgText>
          </React.Fragment>
        ))}
        {goal ? (
          <>
            <Line x1={padL} x2={padL + w} y1={y(goal)} y2={y(goal)} stroke={colors.warning} strokeWidth={1.5} strokeDasharray="6 4" />
            <SvgText x={padL + w} y={y(goal) - 5} fill={colors.warning} fontSize={10} textAnchor="end">Objectif {goal} kg</SvgText>
          </>
        ) : null}
        {area ? <Path d={area} fill="url(#area)" /> : null}
        <Path d={path} stroke={colors.brandPrimary} strokeWidth={2.5} fill="none" />
        {data.map((d, i) => (
          <Circle key={d.date + i} cx={x(i)} cy={y(d.weight)} r={i === data.length - 1 ? 5 : 3.5} fill={i === data.length - 1 ? colors.warning : colors.surfaceSecondary} stroke={colors.brandPrimary} strokeWidth={2} />
        ))}
        {labelIdx.map((i) => (
          <SvgText key={i} x={x(i)} y={height - 8} fill={colors.muted} fontSize={10} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}>{fmt(data[i].date)}</SvgText>
        ))}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.brandPrimary }]} /><Text style={styles.legendText}>Poids (moyenne par semaine)</Text></View>
        {goal ? <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.warning }]} /><Text style={styles.legendText}>Ligne d'objectif</Text></View> : null}
      </View>
    </View>
  );
}
