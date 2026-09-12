import { storage } from "./utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL as string;

let inMemoryToken: string | null = null;

export const TOKEN_KEY = "mpa_session_token";

export async function loadToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  const t = await storage.secureGet<string>(TOKEN_KEY, "");
  inMemoryToken = t && t.length > 0 ? t : null;
  return inMemoryToken;
}

export async function setToken(t: string | null) {
  inMemoryToken = t;
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await loadToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  if (res.status === 401) {
    await setToken(null);
    throw new Error("Unauthorized");
  }
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const detail = data && data.detail;
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(", ") : `Erreur serveur (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
