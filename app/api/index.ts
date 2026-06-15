// Mock API layer. Replace each function with real HTTP calls when backend is ready.
// All functions simulate ~500ms latency and read the mock auth token from localStorage.

export const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

export function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("pos.token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function requireToken() {
  const h = authHeader();
  if (!h.Authorization) throw new Error("Not authenticated");
}

export function rupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function uid(prefix = "ID") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}
