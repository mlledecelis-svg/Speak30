import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, useTheme, setThemePreference, ThemePreference } from "@/src/theme";
import { useAuth } from "@/src/auth";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "300" },
  close: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 16 },
  cardTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "600", marginBottom: 4 },
  cardSub: { color: colors.muted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.surfaceTertiary },
  optionOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  optionIcon: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  optionLabel: { color: colors.onSurface, fontSize: 14, fontWeight: "500" },
  optionHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  rowLabel: { color: colors.muted, fontSize: 12 },
  rowValue: { color: colors.onSurface, fontSize: 14 },
  logout: { marginHorizontal: 20, marginTop: 20, height: 50, borderRadius: 999, borderWidth: 1, borderColor: colors.error, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  logoutText: { color: colors.error, fontWeight: "600" },
}));

const OPTIONS: { key: ThemePreference; icon: string; label: string; hint: string }[] = [
  { key: "light", icon: "sun", label: "Lumineux", hint: "Crème, olive et or — appétissant et clair" },
  { key: "dark", icon: "moon", label: "Sombre", hint: "Glass / Luxe dark, idéal le soir" },
  { key: "system", icon: "smartphone", label: "Automatique", hint: "Suit le réglage de votre téléphone" },
];

export default function SettingsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, preference } = useTheme();
  const { user, logout } = useAuth();

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Réglages</Text>
        <Pressable testID="settings-close" onPress={() => router.back()} style={styles.close}><LucideIcon name="x" size={20} color={colors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apparence</Text>
          <Text style={styles.cardSub}>Choisissez l’ambiance de l’application. Le réglage est mémorisé sur cet appareil.</Text>
          {OPTIONS.map((o) => (
            <Pressable key={o.key} testID={`theme-${o.key}`} onPress={() => setThemePreference(o.key)} style={[styles.option, preference === o.key && styles.optionOn]}>
              <View style={styles.optionIcon}><LucideIcon name={o.icon as any} size={16} color={preference === o.key ? colors.warning : colors.muted} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{o.label}</Text>
                <Text style={styles.optionHint}>{o.hint}</Text>
              </View>
              {preference === o.key && <LucideIcon name="check" size={16} color={colors.brandPrimary} />}
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mon compte</Text>
          <View style={styles.row}><Text style={styles.rowLabel}>Nom</Text><Text style={styles.rowValue}>{user?.name || "—"}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>E-mail</Text><Text style={styles.rowValue}>{user?.email || "—"}</Text></View>
        </View>

        <Pressable testID="logout-button" onPress={logout} style={styles.logout}>
          <LucideIcon name="log-out" size={16} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
