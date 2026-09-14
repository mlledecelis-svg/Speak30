import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Share, Platform, Alert, ActivityIndicator, Linking } from "react-native";
import { DIETITIAN_EMAIL } from "@/src/equivalents";
import { api } from "@/src/api";
import { useProgram } from "@/src/program-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, useTheme, setThemePreference, ThemePreference, setTextScale, TextScale } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { BrandLogo } from "@/src/components/BrandLogo";

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
  const { colors, preference, textScale } = useTheme();
  const { user, logout } = useAuth();
  const { refresh } = useProgram();
  const [restoreText, setRestoreText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportBackup = async () => {
    setBusy("export");
    try {
      const data = await api<any>("/backup");
      const json = JSON.stringify(data);
      if (Platform.OS === "web") {
        const nav: any = typeof navigator !== "undefined" ? navigator : null;
        if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(json); setMsg("Sauvegarde copiée dans le presse-papiers : collez-la dans un fichier ou une note."); }
        else setMsg("Copie indisponible sur ce navigateur.");
      } else {
        await Share.share({ title: "Sauvegarde Mon plan alimentaire", message: json });
      }
    } catch (e: any) { setMsg(e?.message ?? "Erreur"); } finally { setBusy(null); }
  };

  const restoreBackup = async () => {
    if (!restoreText.trim()) return;
    setBusy("restore");
    try {
      const payload = JSON.parse(restoreText);
      const res = await api<{ restored: string[] }>("/backup/restore", { method: "POST", body: JSON.stringify(payload) });
      setMsg(`Restauré : ${res.restored.join(", ")}.`);
      setRestoreText("");
      refresh();
    } catch (e: any) { Alert.alert("Import impossible", e?.message?.includes("JSON") ? "Le texte collé n'est pas une sauvegarde valide." : e?.message ?? "Erreur"); } finally { setBusy(null); }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Réglages</Text>
        <Pressable testID="settings-close" onPress={() => router.back()} style={styles.close}><LucideIcon name="x" size={20} color={colors.onSurface} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.card} testID="quick-links-card">
          <Text style={styles.cardTitle}>Raccourcis</Text>
          <Pressable testID="settings-favorites" onPress={() => router.push("/favorites")} style={styles.option}>
            <View style={styles.optionIcon}><LucideIcon name="heart" size={16} color={colors.warning} /></View>
            <View style={{ flex: 1 }}><Text style={styles.optionLabel}>Mes favoris</Text><Text style={styles.optionHint}>Retrouver vos repas et recettes coup de cœur</Text></View>
            <LucideIcon name="chevron-right" size={16} color={colors.muted} />
          </Pressable>
          <Pressable testID="settings-contact" onPress={() => Linking.openURL(`mailto:${DIETITIAN_EMAIL}?subject=${encodeURIComponent("Question sur mon plan alimentaire")}`)} style={[styles.option, { marginBottom: 0 }]}>
            <View style={styles.optionIcon}><LucideIcon name="mail" size={16} color={colors.warning} /></View>
            <View style={{ flex: 1 }}><Text style={styles.optionLabel}>Contacter ma diététicienne</Text><Text style={styles.optionHint}>{DIETITIAN_EMAIL}</Text></View>
            <LucideIcon name="chevron-right" size={16} color={colors.muted} />
          </Pressable>
        </View>

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

        <View style={styles.card} testID="text-size-card">
          <Text style={styles.cardTitle}>Taille du texte</Text>
          <Text style={styles.cardSub}>Pour une lecture confortable en cuisine, agrandissez tous les textes de l’application.</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([{ v: 1, l: "Normal" }, { v: 1.15, l: "Grand" }, { v: 1.3, l: "Très grand" }] as { v: TextScale; l: string }[]).map((o) => (
              <Pressable key={o.v} testID={`text-scale-${o.v}`} onPress={() => setTextScale(o.v)} style={[styles.option, { flex: 1, marginBottom: 0, justifyContent: "center" }, textScale === o.v && styles.optionOn]}>
                <Text style={styles.optionLabel}>{o.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card} testID="backup-card">
          <Text style={styles.cardTitle}>Sauvegarde</Text>
          <Text style={styles.cardSub}>Exportez vos cibles, programme, maison, pesées et préférences ; collez le texte ci-dessous pour les restaurer sur un autre appareil.</Text>
          <Pressable testID="backup-export" onPress={exportBackup} disabled={!!busy} style={[styles.option, { justifyContent: "center" }]}>
            {busy === "export" ? <ActivityIndicator color={colors.warning} /> : <Text style={styles.optionLabel}>⬇ Exporter ma sauvegarde</Text>}
          </Pressable>
          <TextInput testID="backup-input" value={restoreText} onChangeText={setRestoreText} multiline placeholder="Collez ici une sauvegarde exportée…" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.onSurface, minHeight: 70, marginBottom: 8 }} />
          <Pressable testID="backup-restore" onPress={restoreBackup} disabled={!!busy || !restoreText.trim()} style={[styles.option, { justifyContent: "center", marginBottom: 0 }, !restoreText.trim() && { opacity: 0.5 }]}>
            {busy === "restore" ? <ActivityIndicator color={colors.warning} /> : <Text style={styles.optionLabel}>⬆ Restaurer</Text>}
          </Pressable>
          {msg && <Text style={[styles.cardSub, { marginTop: 10, marginBottom: 0 }]} testID="backup-msg">{msg}</Text>}
        </View>

        <View style={[styles.card, { alignItems: "center" }]} testID="about-card">
          <BrandLogo size={150} tagline />
          <Text style={[styles.cardSub, { textAlign: "center", marginTop: 12, marginBottom: 0 }]}>Application conçue avec La Diététique — Aurelia Isnardon, diététicienne depuis 2000. Des menus fidèles à votre plan, des recettes qui donnent envie.</Text>
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
