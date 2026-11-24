import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CefrLevel,
  EntitlementTier,
  SentenceAttemptRequest,
} from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../core/http/pagination";
import { QUEUE_NAMES, QueueService } from "../../core/queue/queue.service";
import { RedisService } from "../../core/redis/redis.service";
import { StorageService } from "../../core/storage/storage.service";
import { DictationService } from "../dictation/dictation.service";
import { ShadowingService } from "../shadowing/shadowing.service";

function extractYoutubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\/+/, "").split("/")[0];
      return id && id.length >= 6 ? id : null;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && v.length >= 6) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        return parts[embedIdx + 1] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isEntitledForPro(tier: EntitlementTier | null | undefined): boolean {
  return tier === "PRO" || tier === "LIFETIME";
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly dictationService: DictationService,
    private readonly shadowingService: ShadowingService
  ) {}

  async listLessons(filters: {
    topic?: string;
    level?: CefrLevel;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = normalizePagination(filters.page, filters.limit);

    const where = {
      status: "READY",
      visibility: { in: ["SYSTEM" as const, "COMMUNITY_PUBLIC" as const] },
      ...(filters.level ? { cefrLevel: filters.level } : {}),
      ...(filters.topic
        ? { topics: { some: { topic: { slug: filters.topic } } } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        include: {
          topics: { include: { topic: { select: { slug: true } } } },
        },
        orderBy: [{ isDailyFeatured: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return {
      items: rows.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        mediaType: lesson.mediaType,
        thumbnailUrl: lesson.thumbnailUrl,
        cefrLevel: lesson.cefrLevel,
        durationSec: lesson.durationSec,
        isPro: lesson.isPro,
        viewCount: lesson.viewCount,
        topics: lesson.topics.map((lt) => lt.topic.slug),
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getDailyLessons() {
    const dateKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `lessons:daily:${dateKey}`;
    const cached = await this.redis.getJson<{ dateKey: string; items: unknown[] }>(
      cacheKey
    );
    if (cached) return cached;

    const rows = await this.prisma.lesson.findMany({
      where: {
        status: "READY",
        visibility: "SYSTEM",
        isDailyFeatured: true,
      },
      include: {
        topics: { include: { topic: { select: { slug: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const payload = {
      dateKey,
      items: rows.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        mediaType: lesson.mediaType,
        thumbnailUrl: lesson.thumbnailUrl,
        cefrLevel: lesson.cefrLevel,
        durationSec: lesson.durationSec,
        isPro: lesson.isPro,
        viewCount: lesson.viewCount,
        topics: lesson.topics.map((lt) => lt.topic.slug),
      })),
    };

    await this.redis.setJson(cacheKey, payload, 300);
    return payload;
  }

  async getLessonDetail(
    slug: string,
    caller: { userId: string; entitlementTier: EntitlementTier } | null
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      include: {
        topics: { include: { topic: { select: { slug: true } } } },
        sentences: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!lesson) {
      throw new NotFoundException({
        statusCode: 404,
        code: "LESSON_NOT_FOUND",
        message: "Lesson not found",
      });
    }

    const canAccessContent =
      !lesson.isPro ||
      isEntitledForPro(caller?.entitlementTier) ||
      (caller?.userId !== undefined && lesson.authorId === caller.userId);

    let signedMediaUrl: string | null = null;
    if (canAccessContent && lesson.mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findUnique({
        where: { id: lesson.mediaAssetId },
      });
      if (asset && asset.status === "READY") {
        const signed = await this.storage.createPresignedGetUrl(
          asset.objectKey,
          900
        );
        signedMediaUrl = signed.signedUrl;
      }
    }

    return {
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        mediaType: lesson.mediaType,
        youtubeVideoId: lesson.youtubeVideoId,
        thumbnailUrl: lesson.thumbnailUrl,
        cefrLevel: lesson.cefrLevel,
        durationSec: lesson.durationSec,
        isPro: lesson.isPro,
        viewCount: lesson.viewCount,
        topics: lesson.topics.map((lt) => lt.topic.slug),
      },
      signedMediaUrl,
      sentences: canAccessContent
        ? lesson.sentences.map((s) => ({
            id: s.id,
            orderIndex: s.orderIndex,
            startMs: s.startMs,
            endMs: s.endMs,
            text: s.text,
            ipaText: s.ipaText,
            translations:
              (s.translationsJson as Record<string, string> | null) ?? undefined,
            words:
              (s.wordsTimingJson as Array<{
                word: string;
                startMs: number;
                endMs: number;
                ipa?: string;
              }> | null) ?? undefined,
          }))
        : null,
    };
  }

  async submitAttempt(
    userId: string,
    lessonId: string,
    input: SentenceAttemptRequest
  ) {
    if (input.mode === "DICTATION") {
      return this.dictationService.recordAttempt(userId, lessonId, input);
    }
    return this.shadowingService.recordAttempt(userId, lessonId, input);
  }

  async queueYoutubeImport(
    userId: string,
    youtubeUrl: string,
    topicIds?: string[]
  ): Promise<{ jobId: string; lessonId: string }> {
    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new BadRequestException({
        statusCode: 400,
        code: "INVALID_YOUTUBE_URL",
        message: "Provide a valid youtube.com or youtu.be video link",
      });
    }

    const lessonId = randomUUID();
    const slug = `yt-${videoId.toLowerCase()}-${lessonId.slice(0, 6)}`;

    await this.prisma.lesson.create({
      data: {
        id: lessonId,
        slug,
        title: `Imported Lesson (${videoId})`,
        description: "Queued for automated transcription & CEFR enrichment",
        mediaType: "YOUTUBE",
        youtubeVideoId: videoId,
        cefrLevel: "B1",
        durationSec: 0,
        isPro: false,
        visibility: "PRIVATE",
        authorId: userId,
        status: "PROCESSING",
      },
    });

    const queued = await this.queue.enqueue(
      QUEUE_NAMES.MEDIA_INGESTION,
      "import-youtube-lesson",
      {
        lessonId,
        userId,
        youtubeUrl,
        videoId,
        topicIds: topicIds ?? [],
      }
    );

    return {
      jobId: queued.jobId,
      lessonId,
    };
  }

  async listGrammar(level?: CefrLevel) {
    const cacheKey = `grammar:list:${level ?? "ALL"}`;
    const cached = await this.redis.getJson<{ items: unknown[] }>(cacheKey);
    if (cached) return cached;

    const items = await this.prisma.grammarTopic.findMany({
      where: level ? { cefrLevel: level } : undefined,
      orderBy: { orderInSyllabus: "asc" },
    });

    const payload = { items };
    await this.redis.setJson(cacheKey, payload, 600);
    return payload;
  }

  async listStories(filters: {
    level?: CefrLevel;
    collection?: string;
    page?: number;
  }) {
    const { page, limit, skip } = normalizePagination(filters.page, 12);
    const where = {
      ...(filters.level ? { cefrLevel: filters.level } : {}),
      ...(filters.collection ? { collection: filters.collection } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.story.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.story.count({ where }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getStoryDetail(
    slug: string,
    caller: { entitlementTier: EntitlementTier } | null
  ) {
    const story = await this.prisma.story.findUnique({
      where: { slug },
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });

    if (!story) {
      throw new NotFoundException({
        statusCode: 404,
        code: "STORY_NOT_FOUND",
        message: "Story not found",
      });
    }

    const unlocked = !story.isPro || isEntitledForPro(caller?.entitlementTier);
    let signedAudioUrl: string | null = null;
    if (unlocked && story.mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findUnique({
        where: { id: story.mediaAssetId },
      });
      if (asset && asset.status === "READY") {
        const signed = await this.storage.createPresignedGetUrl(
          asset.objectKey,
          900
        );
        signedAudioUrl = signed.signedUrl;
      }
    }

    return {
      story: {
        id: story.id,
        slug: story.slug,
        title: story.title,
        description: story.description,
        collection: story.collection,
        cefrLevel: story.cefrLevel,
        wordCount: story.wordCount,
        readingTimeMin: story.readingTimeMin,
        coverImageUrl: story.coverImageUrl,
        isPro: story.isPro,
      },
      signedAudioUrl,
      scenes: unlocked ? story.scenes : null,
    };
  }
}
