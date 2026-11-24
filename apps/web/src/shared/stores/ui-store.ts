import { create } from "zustand";

export type ThemeMode = "light" | "dark";

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
  toggleTheme: () =>
    set((state) => {
      const next: ThemeMode = state.theme === "light" ? "dark" : "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return { theme: next };
    }),
}));
