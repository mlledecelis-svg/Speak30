import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, setToken, loadToken } from "./api";

WebBrowser.maybeCompleteAuthSession();

export type AuthUser = {
  user_id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  signupEmail: (email: string, password: string, name?: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);
const consumedSessionIds = new Set<string>();

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}

function extractSessionId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?#&]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function exchangeSession(sessionId: string): Promise<AuthUser> {
  if (consumedSessionIds.has(sessionId)) throw new Error("already consumed");
  consumedSessionIds.add(sessionId);
  const data = await api<{ session_token: string; user: AuthUser }>("/auth/session", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
  await setToken(data.session_token);
  return data.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      // Web: check URL for session_id first
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const url = window.location.href;
        const sid = extractSessionId(url);
        if (sid) {
          try {
            const u = await exchangeSession(sid);
            setUser(u);
            const clean = window.location.pathname + window.location.search.replace(/[?&]session_id=[^&]+/, "").replace(/^&/, "?");
            window.history.replaceState(window.history.state, "", clean);
            setLoading(false);
            return;
          } catch {}
        }
      } else {
        // Mobile: check cold-start deep link
        const initial = await Linking.getInitialURL();
        const sid = extractSessionId(initial);
        if (sid) {
          try {
            const u = await exchangeSession(sid);
            setUser(u);
            setLoading(false);
            return;
          } catch {}
        }
      }
      const token = await loadToken();
      if (token) {
        try {
          const u = await api<AuthUser>("/auth/me");
          setUser(u);
        } catch {
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    if (Platform.OS !== "web") {
      const sub = Linking.addEventListener("url", async (evt) => {
        const sid = extractSessionId(evt.url);
        if (sid) {
          try {
            const u = await exchangeSession(sid);
            setUser(u);
          } catch {}
        }
      });
      return () => sub.remove();
    }
  }, [bootstrap]);

  const loginEmail = useCallback(async (email: string, password: string) => {
    const data = await api<{ session_token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.session_token);
    setUser(data.user);
  }, []);

  const signupEmail = useCallback(async (email: string, password: string, name?: string) => {
    const data = await api<{ session_token: string; user: AuthUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    await setToken(data.session_token);
    setUser(data.user);
  }, []);

  const loginGoogle = useCallback(async () => {
    let redirectUrl: string;
    if (Platform.OS === "web") {
      redirectUrl = window.location.origin + "/";
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      window.location.href = authUrl;
      return;
    }
    redirectUrl = Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    let capturedUrl: string | null = null;
    const listener = Linking.addEventListener("url", (evt) => {
      capturedUrl = evt.url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let cbUrl: string | null = null;
      if (result.type === "success" && result.url) cbUrl = result.url;
      if (!cbUrl) cbUrl = capturedUrl;
      if (!cbUrl) cbUrl = await Linking.getInitialURL();
      const sid = extractSessionId(cbUrl);
      if (!sid) throw new Error("Connexion annulée");
      const u = await exchangeSession(sid);
      setUser(u);
    } finally {
      listener.remove();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, loginEmail, signupEmail, loginGoogle, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
