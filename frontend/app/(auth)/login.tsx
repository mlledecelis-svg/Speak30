import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import LucideIcon from "@react-native-vector-icons/lucide";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { useAuth } from "@/src/auth";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 300, width: "100%" },
  heroImg: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  eyebrow: { color: colors.warning, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, fontWeight: "600" },
  title: { color: colors.onSurface, fontSize: 34, fontWeight: "300", lineHeight: 40, marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 28 },
  label: { color: colors.onSurfaceSecondary, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.onSurface,
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "600", letterSpacing: 0.5 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 12, letterSpacing: 1.5 },
  googleBtn: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleText: { color: colors.onSurface, fontSize: 15, fontWeight: "500" },
  switchWrap: { alignItems: "center", marginTop: 24 },
  switchText: { color: colors.muted, fontSize: 14 },
  switchLink: { color: colors.warning, fontWeight: "600" },
  err: { color: colors.error, fontSize: 13, marginTop: 12, textAlign: "center" },
}));

export default function Login() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loginEmail, loginGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyG, setBusyG] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await loginEmail(email.trim(), pw);
    } catch (e: any) {
      setErr(e.message || "Erreur de connexion");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    setBusyG(true);
    try {
      await loginGoogle();
    } catch (e: any) {
      setErr(e.message || "Connexion Google annulée");
    } finally {
      setBusyG(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Image source="https://images.unsplash.com/photo-1667499745120-f9bcef8f584e?crop=entropy&cs=srgb&fm=jpg&q=85" style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(250,247,240,0.5)", themeColors.surface]} style={styles.scrim} />
        </View>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>Mon plan alimentaire</Text>
          <Text style={styles.title}>Bienvenue</Text>
          <Text style={styles.subtitle}>Connectez-vous pour retrouver vos menus, votre suivi et vos programmes.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="login-email-input"
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.fr"
            placeholderTextColor={themeColors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            testID="login-password-input"
            value={pw}
            onChangeText={setPw}
            placeholder="••••••••"
            placeholderTextColor={themeColors.muted}
            secureTextEntry
            style={styles.input}
          />

          {err && <Text style={styles.err} testID="login-error">{err}</Text>}

          <Pressable testID="login-submit-button" onPress={submit} disabled={busy || !email || !pw} style={[styles.primaryBtn, (busy || !email || !pw) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color={themeColors.onBrandPrimary} /> : <Text style={styles.primaryText}>Se connecter</Text>}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable testID="login-google-button" onPress={google} disabled={busyG} style={styles.googleBtn}>
            {busyG ? <ActivityIndicator color={themeColors.onBrandPrimary} /> : <>
              <LucideIcon name={"chrome" as any} size={18} color={themeColors.onBrandPrimary} />
              <Text style={styles.googleText}>Continuer avec Google</Text>
            </>}
          </Pressable>

          <Pressable testID="login-signup-link" style={styles.switchWrap} onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.switchText}>
              Pas encore de compte ? <Text style={styles.switchLink}>Créer un compte</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
