"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { authUserSchema, refreshTokenResponseSchema } from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";
import { useAuthStore } from "@/shared/stores/auth-store";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    let active = true;
    const store = useAuthStore.getState();
    if (store.status !== "loading") {
      return;
    }

    (async () => {
      try {
        const refreshed = await apiClient.request("/auth/refresh", {
          method: "POST",
          schema: refreshTokenResponseSchema,
          skipAuthRefresh: true,
        });
        if (!active) return;
        store.setAccessToken(refreshed.accessToken);
        const me = await apiClient.request("/users/me", {
          schema: authUserSchema,
        });
        if (!active) return;
        store.setSession(refreshed.accessToken, me);
      } catch {
        if (active) {
          store.clearSession();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
