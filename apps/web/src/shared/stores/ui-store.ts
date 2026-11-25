import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "linguacraft-theme";

function applyThemeClass(theme: ThemeMode): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
}

export interface GlobalUiState {
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  isLoginModalOpen: boolean;
  loginReason: string | null;
  isDictionaryModalOpen: boolean;
  dictionaryInitialWord: string;
  theme: ThemeMode;
  toggleSidebarCollapsed: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  openLoginModal: (reason?: string) => void;
  closeLoginModal: () => void;
  openDictionaryModal: (initialWord?: string) => void;
  closeDictionaryModal: () => void;
  hydrateTheme: () => void;
  toggleTheme: () => void;
}

export const useGlobalUiStore = create<GlobalUiState>((set) => ({
  isSidebarCollapsed: false,
  isMobileDrawerOpen: false,
  isLoginModalOpen: false,
  loginReason: null,
  isDictionaryModalOpen: false,
  dictionaryInitialWord: "",
  theme: "light",
  toggleSidebarCollapsed: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setMobileDrawerOpen: (isMobileDrawerOpen) => set({ isMobileDrawerOpen }),
  openLoginModal: (reason) =>
    set({ isLoginModalOpen: true, loginReason: reason ?? null }),
  closeLoginModal: () => set({ isLoginModalOpen: false, loginReason: null }),
  openDictionaryModal: (word = "") =>
    set({ isDictionaryModalOpen: true, dictionaryInitialWord: word }),
  closeDictionaryModal: () =>
    set({ isDictionaryModalOpen: false, dictionaryInitialWord: "" }),
  hydrateTheme: () => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      const preferred: ThemeMode =
        saved === "dark" || saved === "light"
          ? saved
          : window.matchMedia?.("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      applyThemeClass(preferred);
      set({ theme: preferred });
    } catch {
      // Ignore storage access errors in restricted browsers
    }
  },
  toggleTheme: () =>
    set((state) => {
      const next: ThemeMode = state.theme === "light" ? "dark" : "light";
      applyThemeClass(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Ignore storage write errors
        }
      }
      return { theme: next };
    }),
}));
