const PKCE_STORAGE_PREFIX = "lc_oauth_pkce_";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
}

export function savePkceState(
  state: string,
  payload: { provider: "google" | "apple"; codeVerifier: string; nextPath: string }
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${PKCE_STORAGE_PREFIX}${state}`, JSON.stringify(payload));
}

export function consumePkceState(state: string): {
  provider: "google" | "apple";
  codeVerifier: string;
  nextPath: string;
} | null {
  if (typeof sessionStorage === "undefined") return null;
  const key = `${PKCE_STORAGE_PREFIX}${state}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  sessionStorage.removeItem(key);
  try {
    return JSON.parse(raw) as {
      provider: "google" | "apple";
      codeVerifier: string;
      nextPath: string;
    };
  } catch {
    return null;
  }
}
