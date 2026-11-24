import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .default(
      "postgresql://linguacraft:linguacraft_dev_password@localhost:5432/linguacraft?schema=public"
    ),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default("linguacraft-dev-access-secret-key-min-32-chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default("linguacraft-dev-refresh-secret-key-min-32-chars"),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("linguacraft-media"),
  S3_ACCESS_KEY_ID: z.string().default("linguacraft_minio"),
  S3_SECRET_ACCESS_KEY: z.string().default("linguacraft_minio_password"),
  S3_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(true),
  AI_PROVIDER: z.enum(["mock", "gemini", "hybrid"]).default("mock"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),
  GEMINI_API_KEY: z.string().optional(),
  AZURE_SPEECH_KEY: z.string().optional(),
  AZURE_SPEECH_REGION: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  BILLING_WEBHOOK_SECRET_STRIPE: z.string().default("whsec_dev_secret"),
  BILLING_WEBHOOK_SECRET_PADDLE: z.string().default("pdl_dev_secret"),
  BILLING_WEBHOOK_SECRET_VIETQR: z.string().default("vqr_dev_secret"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getAppEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function resetAppEnvCache(): void {
  cachedEnv = null;
}
