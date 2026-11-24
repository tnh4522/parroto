import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApp } from "../../app.bootstrap";
import { AppModule } from "../../app.module";
import { getAppEnv } from "../../core/config/env";
import { PrismaService } from "../../core/database/prisma.service";
import { StorageService } from "../../core/storage/storage.service";
import { scrubPii } from "../ai/ai-orchestrator.service";

interface MediaRow {
  id: string;
  ownerId: string | null;
  purpose: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  expiresAt: Date | null;
}

describe("Media & AI Orchestration (/api/v1/media, /api/v1/audio)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const mediaAssets = new Map<string, MediaRow>();
  const auditLogs: Array<Record<string, unknown>> = [];

  const fakeStorage = {
    bucket: "linguacraft-test",
    createPresignedPutUrl: vi.fn(async ({ objectKey }: { objectKey: string }) => ({
      uploadUrl: `https://s3.example.test/linguacraft-test/${objectKey}?sig=put`,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    })),
    createPresignedGetUrl: vi.fn(async (objectKey: string) => ({
      signedUrl: `https://s3.example.test/linguacraft-test/${objectKey}?sig=get`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    })),
    headObject: vi.fn(async () => ({
      exists: true,
      contentLength: 12345,
      contentType: "audio/webm",
    })),
    deleteObject: vi.fn(async () => {}),
  };

  const fakePrisma = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        email: `${where.id}@example.test`,
        role: "USER",
        status: "ACTIVE",
        ageVerifiedAt: new Date(),
        audioConsentAt: new Date(),
        entitlements: [],
      }),
    },
    mediaAsset: {
      create: async ({ data }: { data: MediaRow }) => {
        mediaAssets.set(data.id, data);
        return data;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        mediaAssets.get(where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<MediaRow>;
      }) => {
        const existing = mediaAssets.get(where.id);
        if (!existing) throw { code: "P2025" };
        const updated = { ...existing, ...data };
        mediaAssets.set(where.id, updated);
        return updated;
      },
    },
    aiAuditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditLogs.push(data);
        return data;
      },
    },
  };

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.REDIS_URL = "memory";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(StorageService)
      .useValue(fakeStorage)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  beforeEach(() => {
    mediaAssets.clear();
    auditLogs.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it("scrubs PII emails and phone numbers before AI processing", () => {
    expect(scrubPii("Contact jane@example.com or +1 555-234-9988")).toBe(
      "Contact [EMAIL_REDACTED] or [PHONE_REDACTED]"
    );
  });

  it("presigns upload, verifies S3 object ownership, blocks foreign playback, and records AI fallback audit logs", async () => {
    const token = await jwtService.signAsync(
      { sub: userId, email: "owner@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );
    const otherToken = await jwtService.signAsync(
      { sub: otherUserId, email: "other@example.test", role: "USER" },
      { secret: getAppEnv().JWT_ACCESS_SECRET }
    );

    // 1. Reject unsupported MIME type
    await request(app.getHttpServer())
      .post("/api/v1/media/presign-upload")
      .set("Authorization", `Bearer ${token}`)
      .send({
        purpose: "SHADOWING_RECORDING",
        mimeType: "application/x-msdownload",
        contentLength: 1024,
      })
      .expect(400);

    // 2. Presign valid audio upload
    const presignRes = await request(app.getHttpServer())
      .post("/api/v1/media/presign-upload")
      .set("Authorization", `Bearer ${token}`)
      .send({
        purpose: "SHADOWING_RECORDING",
        mimeType: "audio/webm;codecs=opus",
        contentLength: 12345,
      })
      .expect(200);

    const assetId = presignRes.body.assetId as string;
    expect(presignRes.body.uploadUrl).toContain(assetId);

    // 3. Confirm via HeadObject
    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/media/${assetId}/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(confirmRes.body.status).toBe("CONFIRMED");

    // 4. Another user cannot get signed stream URL for private recording
    await request(app.getHttpServer())
      .get(`/api/v1/media/${assetId}/stream-url`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);

    // 5. Owner triggers cloud STT fallback + writes immutable AiAuditLog
    const sttRes = await request(app.getHttpServer())
      .post("/api/v1/audio/transcribe-fallback")
      .set("Authorization", `Bearer ${token}`)
      .send({ assetId, language: "en" })
      .expect(200);

    expect(sttRes.body.text).toContain("Transcribed practice segment");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.taskType).toBe("stt_transcribe");
    expect(auditLogs[0]?.status).toBe("SUCCESS");
  });
});
