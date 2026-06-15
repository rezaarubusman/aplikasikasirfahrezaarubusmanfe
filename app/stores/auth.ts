import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "~/api/auth";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        if (typeof window !== "undefined") window.localStorage.setItem("pos.token", token);
        set({ token, user });
      },
      logout: () => {
        if (typeof window !== "undefined") window.localStorage.removeItem("pos.token");
        set({ token: null, user: null });
      },
    }),
    { name: "pos.auth" },
  ),
);
