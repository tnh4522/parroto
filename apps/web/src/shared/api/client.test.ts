import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiClient, ApiClientError } from "./client";

describe("ApiClient", () => {
  it("deduplicates concurrent 401 refreshes into one /auth/refresh call", async () => {
    let token: string | null = "expired";
    let refreshCount = 0;

    const mockFetch: typeof fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCount += 1;
        return new Response(JSON.stringify({ accessToken: "fresh-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (token === "expired") {
        return new Response(
          JSON.stringify({ statusCode: 401, code: "TOKEN_EXPIRED", message: "Expired" }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const client = new ApiClient({
      baseUrl: "https://api.example.test/api/v1",
      getAccessToken: () => token,
      setAccessToken: (next) => {
        token = next;
      },
      fetchImpl: mockFetch,
    });

    const schema = z.object({ ok: z.boolean() });
    const [a, b] = await Promise.all([
      client.request("/users/me", { schema }),
      client.request("/users/me", { schema }),
    ]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCount).toBe(1);
    expect(token).toBe("fresh-token");
  });

  it("throws typed ApiClientError on structured error envelopes", async () => {
    const client = new ApiClient({
      baseUrl: "https://api.example.test/api/v1",
      getAccessToken: () => null,
      setAccessToken: () => {},
      fetchImpl: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              statusCode: 403,
              code: "ENTITLEMENT_REQUIRED",
              message: "PRO required",
            }),
            { status: 403, headers: { "content-type": "application/json" } }
          )
      ),
    });

    await expect(client.request("/lessons/pro-item")).rejects.toBeInstanceOf(
      ApiClientError
    );
  });
});
