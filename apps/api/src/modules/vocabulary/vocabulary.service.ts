import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateVocabDeckRequest,
  EntitlementTier,
  VocabDeck,
} from "@linguacraft/contracts";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../core/database/prisma.service";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../core/http/pagination";
import { RedisService } from "../../core/redis/redis.service";

function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "deck"}-${randomUUID().slice(0, 6)}`;
}

function mapDeckVisibilityToContract(
  visibility: "SYSTEM" | "PUBLIC" | "PRIVATE"
): "PUBLIC" | "PRIVATE" {
  return visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC";
}

function parseDefinitionsJson(raw: unknown): {
  meaning: string;
  exampleSentence: string | null;
} {
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return {
      meaning: typeof obj.meaning === "string" ? obj.meaning : "",
      exampleSentence:
        typeof obj.exampleSentence === "string" ? obj.exampleSentence : null,
    };
  }
  return { meaning: "", exampleSentence: null };
}

@Injectable()
export class VocabularyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async listDecks(params: {
    visibility?: "PUBLIC" | "PRIVATE";
    q?: string;
    page?: number;
    callerUserId?: string | null;
  }) {
    const { page, limit, skip } = normalizePagination(params.page, 12);
    const search = params.q?.trim();

    const visibilityFilter =
      params.visibility === "PRIVATE"
        ? { visibility: "PRIVATE" as const, ownerId: params.callerUserId ?? "__none__" }
        : params.visibility === "PUBLIC"
          ? { visibility: { in: ["SYSTEM" as const, "PUBLIC" as const] } }
          : params.callerUserId
            ? {
                OR: [
                  { visibility: { in: ["SYSTEM" as const, "PUBLIC" as const] } },
                  { visibility: "PRIVATE" as const, ownerId: params.callerUserId },
                ],
              }
            : { visibility: { in: ["SYSTEM" as const, "PUBLIC" as const] } };

    const where = {
      ...visibilityFilter,
      ...(search
        ? {
            title: { contains: search, mode: "insensitive" as const },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.vocabDeck.findMany({
        where,
        include: { owner: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.vocabDeck.count({ where }),
    ]);

    const items: VocabDeck[] = rows.map((deck) => ({
      id: deck.id,
      slug: deck.slug,
      title: deck.title,
      description: deck.description,
      cefrLevel: deck.cefrLevel,
      visibility: mapDeckVisibilityToContract(deck.visibility),
      isPro: deck.isPro,
      cardCount: deck.wordCount,
      ownerDisplayName: deck.owner?.displayName ?? null,
    }));

    return {
      items,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async createDeck(userId: string, input: CreateVocabDeckRequest) {
    const slug = slugifyTitle(input.title);
    const created = await this.prisma.vocabDeck.create({
      data: {
        slug,
        title: input.title,
        description: input.description ?? null,
        cefrLevel: input.cefrLevel,
        ownerId: userId,
        visibility: input.visibility,
        isPro: false,
        wordCount: input.cards.length,
        cards: {
          create: input.cards.map((card, idx) => ({
            term: card.term,
            definitionsJson: {
              meaning: card.meaning,
              exampleSentence: card.exampleSentence ?? null,
            },
            orderIndex: idx,
          })),
        },
      },
      include: { owner: { select: { displayName: true } } },
    });

    return {
      deck: {
        id: created.id,
        slug: created.slug,
        title: created.title,
        description: created.description,
        cefrLevel: created.cefrLevel,
        visibility: mapDeckVisibilityToContract(created.visibility),
        isPro: created.isPro,
        cardCount: created.wordCount,
        ownerDisplayName: created.owner?.displayName ?? null,
      },
    };
  }

  async getDeckDetail(
    slug: string,
    caller: { userId: string; entitlementTier: EntitlementTier } | null
  ) {
    const deck = await this.prisma.vocabDeck.findUnique({
      where: { slug },
      include: {
        owner: { select: { displayName: true } },
        cards: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!deck) {
      throw new NotFoundException({
        statusCode: 404,
        code: "DECK_NOT_FOUND",
        message: "Vocabulary deck not found",
      });
    }

    if (deck.visibility === "PRIVATE" && deck.ownerId !== caller?.userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not have access to this private deck",
      });
    }

    const isEntitled =
      caller?.entitlementTier === "PRO" || caller?.entitlementTier === "LIFETIME";
    const visibleSlice =
      deck.isPro && !isEntitled ? deck.cards.slice(0, 24) : deck.cards;

    return {
      deck: {
        id: deck.id,
        slug: deck.slug,
        title: deck.title,
        description: deck.description,
        cefrLevel: deck.cefrLevel,
        visibility: mapDeckVisibilityToContract(deck.visibility),
        isPro: deck.isPro,
        cardCount: deck.wordCount,
        ownerDisplayName: deck.owner?.displayName ?? null,
      },
      previewCards: visibleSlice.map((card) => {
        const parsed = parseDefinitionsJson(card.definitionsJson);
        return {
          id: card.id,
          term: card.term,
          phonetic: card.phonetic,
          partOfSpeech: card.partOfSpeech,
          meaning: parsed.meaning,
          exampleSentence: parsed.exampleSentence,
          audioUrl: card.audioUrl,
        };
      }),
      totalCards: deck.cards.length || deck.wordCount,
    };
  }

  async searchDictionary(q: string, locale = "en") {
    const normalized = q.trim().toLowerCase();
    const cacheKey = `dict:search:${locale}:${normalized}`;
    const cached = await this.redis.getJson<{ items: unknown[] }>(cacheKey);
    if (cached) return cached;

    const entries = await this.prisma.dictionaryEntry.findMany({
      where: {
        locale,
        word: { contains: normalized, mode: "insensitive" },
      },
      take: 10,
      orderBy: { word: "asc" },
    });

    const items = entries.map((entry) => {
      const phonetics = (entry.phoneticsJson as Array<{ ipa?: string }>) ?? [];
      const meanings =
        (entry.meaningsJson as Array<{
          partOfSpeech?: string;
          definition?: string;
        }>) ?? [];
      return {
        word: entry.word,
        phonetic: phonetics[0]?.ipa ?? null,
        partOfSpeech: meanings[0]?.partOfSpeech ?? null,
        shortMeaning: meanings[0]?.definition ?? "",
      };
    });

    const payload = { items };
    await this.redis.setJson(cacheKey, payload, 3600);
    return payload;
  }

  async getDictionaryWord(rawWord: string) {
    const word = rawWord.trim().toLowerCase();
    const cacheKey = `dict:word:${word}`;
    const cached = await this.redis.getJson<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const entry = await this.prisma.dictionaryEntry.findUnique({
      where: { word },
    });

    if (!entry) {
      throw new NotFoundException({
        statusCode: 404,
        code: "WORD_NOT_FOUND",
        message: `Dictionary entry for "${word}" was not found`,
      });
    }

    const payload = {
      word: entry.word,
      phonetics: entry.phoneticsJson,
      meanings: entry.meaningsJson,
    };
    await this.redis.setJson(cacheKey, payload, 86400);
    return payload;
  }
}
