import {
  apiErrorSchema,
  refreshTokenResponseSchema,
  type ApiError,
} from "@linguacraft/contracts";
import type { ZodType, ZodTypeDef } from "zod";

export type SchemaOf<T> = ZodType<T, ZodTypeDef, unknown>;

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly traceId?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.traceId = error.traceId;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  onAuthExpired?: () => void;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions<TResponse> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  schema?: SchemaOf<TResponse>;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function resolveTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | null;
  private readonly setAccessToken: (token: string | null) => void;
  private readonly onAuthExpired?: () => void;
  private readonly fetchFn: typeof fetch;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = (
      config.baseUrl ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:4000/api/v1"
    ).replace(/\/+$/, "");
    this.getAccessToken = config.getAccessToken;
    this.setAccessToken = config.setAccessToken;
    this.onAuthExpired = config.onAuthExpired;
    this.fetchFn = config.fetchImpl ?? ((...args) => fetch(...args));
  }

  async request<TResponse>(
    path: string,
    options: RequestOptions<TResponse> = {}
  ): Promise<TResponse> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    const response = await this.executeFetch(url, options);

    if (response.status === 401 && !options.skipAuthRefresh) {
      const nextToken = await this.refreshAccessToken();
      if (nextToken) {
        const retried = await this.executeFetch(url, options);
        return this.parseResponse(retried, options.schema);
      }
      this.onAuthExpired?.();
    }

    return this.parseResponse(response, options.schema);
  }

  private executeFetch<TResponse>(
    url: string,
    options: RequestOptions<TResponse>
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    const tz = resolveTimezone();
    if (tz) {
      headers["X-User-Timezone"] = tz;
    }

    const token = this.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let serializedBody: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      serializedBody = JSON.stringify(options.body);
    }

    return this.fetchFn(url, {
      method: options.method ?? "GET",
      headers,
      body: serializedBody,
      credentials: "include",
      signal: options.signal,
    });
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await this.executeFetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          skipAuthRefresh: true,
        });
        if (!res.ok) {
          this.setAccessToken(null);
          return null;
        }
        const json: unknown = await res.json();
        const parsed = refreshTokenResponseSchema.parse(json);
        this.setAccessToken(parsed.accessToken);
        return parsed.accessToken;
      } catch {
        this.setAccessToken(null);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async parseResponse<TResponse>(
    response: Response,
    schema?: SchemaOf<TResponse>
  ): Promise<TResponse> {
    if (response.status === 204) {
      return undefined as TResponse;
    }

    let rawJson: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      rawJson = await response.json();
    } else if (!response.ok) {
      throw new ApiClientError({
        statusCode: response.status,
        code: "HTTP_ERROR",
        message: response.statusText || "Request failed",
      });
    }

    if (!response.ok) {
      const parsedError = apiErrorSchema.safeParse(rawJson);
      if (parsedError.success) {
        throw new ApiClientError(parsedError.data);
      }
      throw new ApiClientError({
        statusCode: response.status,
        code: "HTTP_ERROR",
        message: response.statusText || "Unexpected server error",
      });
    }

    if (schema) {
      return schema.parse(rawJson);
    }
    return rawJson as TResponse;
  }
}
