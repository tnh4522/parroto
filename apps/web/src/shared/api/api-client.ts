import { useAuthStore } from "@/shared/stores/auth-store";
import { ApiClient } from "./client";

export const apiClient = new ApiClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
  onAuthExpired: () => useAuthStore.getState().clearSession(),
});
