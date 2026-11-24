import type { AuthUser } from "@linguacraft/contracts";
import { create } from "zustand";

export type AuthStatus = "loading" | "authenticated" | "guest";

export interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setAccessToken: (token: string | null) => void;
  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "loading",
  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      status: accessToken ? state.status : "guest",
    })),
  setSession: (accessToken, user) =>
    set({
      accessToken,
      user,
      status: "authenticated",
    }),
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "guest",
    }),
  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      status: "guest",
    }),
}));
