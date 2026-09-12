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
import { colors } from "@/src/theme";

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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    await prewarmIcons();
    setReady(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" />
              <AuthGate />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
