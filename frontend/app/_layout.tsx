import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { LogBox, View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState, useCallback } from "react";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth";
import { ProgramProvider } from "@/src/program-store";
import { BrandLogo } from "@/src/components/BrandLogo";
import Animated, { ZoomIn, FadeInUp } from "react-native-reanimated";
import { colors, useTheme, loadThemePreference } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

// Prewarm icon fonts for Expo Go Android
const prewarmIcons = async () => {
  try {
    const LucideFont = (await import("@react-native-vector-icons/lucide")).default;
    if ((LucideFont as any)?.loadFont) {
      await (LucideFont as any).loadFont();
    }
  } catch {}
};

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth) router.replace("/(tabs)");
  }, [user, loading, segments, router]);

  const [minSplash, setMinSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setMinSplash(false), 1300);
    return () => clearTimeout(t);
  }, []);

  if (loading || minSplash) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 24 }} testID="splash">
        <Animated.View entering={ZoomIn.duration(700).springify().damping(14)}>
          <BrandLogo size={170} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(450).duration(600)} style={{ alignItems: "center", gap: 16 }}>
          <BrandLogo size={0} tagline />
          <ActivityIndicator color={colors.brand} size="small" />
        </Animated.View>
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recipe" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="cooking" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="config" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="photos" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="favorites" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="batch" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { scheme, colors: c } = useTheme();

  const load = useCallback(async () => {
    await Promise.all([prewarmIcons(), loadThemePreference()]);
    setReady(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.surface }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ProgramProvider>
                <StatusBar style={scheme === "dark" ? "light" : "dark"} />
                <AuthGate />
              </ProgramProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
