import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LucideIcon from "@react-native-vector-icons/lucide";

import { makeStyles, colors as themeColors } from "@/src/theme";
import { BrandLogo } from "@/src/components/BrandLogo";
import { useAuth } from "@/src/auth";

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  back: { padding: 8, marginLeft: -8, alignSelf: "flex-start", marginBottom: 16 },
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
  },
  primaryText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "600", letterSpacing: 0.5 },
  err: { color: colors.error, fontSize: 13, marginTop: 12, textAlign: "center" },
}));

export default function Signup() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signupEmail } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signupEmail(email.trim(), pw, name.trim() || undefined);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Pressable testID="signup-back-button" onPress={() => router.back()} style={styles.back}>
            <LucideIcon name="chevron-left" size={28} color={themeColors.onSurface} />
          </Pressable>
          <BrandLogo size={110} style={{ alignSelf: "center", marginBottom: 12 }} />
          <Text style={styles.eyebrow}>Nouveau compte</Text>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Vos programmes et votre suivi seront sauvegardés dans votre espace personnel.</Text>

          <Text style={styles.label}>Prénom (optionnel)</Text>
          <TextInput testID="signup-name-input" value={name} onChangeText={setName} placeholder="Marie" placeholderTextColor={themeColors.muted} style={styles.input} />

          <Text style={styles.label}>Email</Text>
          <TextInput testID="signup-email-input" value={email} onChangeText={setEmail} placeholder="vous@exemple.fr" placeholderTextColor={themeColors.muted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

          <Text style={styles.label}>Mot de passe (min. 6)</Text>
          <TextInput testID="signup-password-input" value={pw} onChangeText={setPw} placeholder="••••••••" placeholderTextColor={themeColors.muted} secureTextEntry style={styles.input} />

          {err && <Text style={styles.err} testID="signup-error">{err}</Text>}

          <Pressable testID="signup-submit-button" onPress={submit} disabled={busy || !email || pw.length < 6} style={[styles.primaryBtn, (busy || !email || pw.length < 6) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color={themeColors.onBrandPrimary} /> : <Text style={styles.primaryText}>Créer mon compte</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
