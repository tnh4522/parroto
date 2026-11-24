import { Injectable, NotFoundException } from "@nestjs/common";
import type { SrsCardState, SrsReviewRequest } from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import { calculateSm2NextState } from "./sm2";

function normalizeState(raw: string): SrsCardState {
  if (
    raw === "NEW" ||
    raw === "LEARNING" ||
    raw === "REVIEW" ||
    raw === "RELEARNING"
  ) {
    return raw;
  }
  return "REVIEW";
}

@Injectable()
export class SrsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDueCards(userId: string, limit = 20, deckSlug?: string) {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const now = new Date();

    const reviews = await this.prisma.userVocabReview.findMany({
      where: {
        userId,
        nextReviewAt: { lte: now },
        ...(deckSlug ? { card: { deck: { slug: deckSlug } } } : {}),
      },
      include: {
        card: {
          include: { deck: { select: { slug: true, title: true } } },
        },
      },
      orderBy: { nextReviewAt: "asc" },
      take: safeLimit,
    });

    const totalDue = await this.prisma.userVocabReview.count({
      where: {
        userId,
        nextReviewAt: { lte: now },
        ...(deckSlug ? { card: { deck: { slug: deckSlug } } } : {}),
      },
    });

    return {
      dueCount: totalDue,
      cards: reviews.map((r) => {
        const defs = (r.card.definitionsJson ?? {}) as Record<string, unknown>;
        return {
          id: r.card.id,
          term: r.card.term,
          phonetic: r.card.phonetic,
          partOfSpeech: r.card.partOfSpeech,
          meaning: typeof defs.meaning === "string" ? defs.meaning : "",
          exampleSentence:
            typeof defs.exampleSentence === "string"
              ? defs.exampleSentence
              : null,
          audioUrl: r.card.audioUrl,
          deckSlug: r.card.deck.slug,
          deckTitle: r.card.deck.title,
          intervalDays: r.intervalDays,
          easeFactor: r.easeFactor,
          repetitions: r.repetitions,
          state: normalizeState(r.state),
          nextReviewAt: r.nextReviewAt.toISOString(),
        };
      }),
    };
  }

  async submitReview(userId: string, input: SrsReviewRequest) {
    const card = await this.prisma.vocabCard.findUnique({
      where: { id: input.cardId },
      select: { id: true },
    });

    if (!card) {
      throw new NotFoundException({
        statusCode: 404,
        code: "CARD_NOT_FOUND",
        message: "Vocabulary card not found",
      });
    }

    const existing = await this.prisma.userVocabReview.findUnique({
      where: { userId_cardId: { userId, cardId: input.cardId } },
    });

    const next = calculateSm2NextState(
      {
        easeFactor: existing?.easeFactor ?? 2.5,
        intervalDays: existing?.intervalDays ?? 0,
        repetitions: existing?.repetitions ?? 0,
      },
      input.rating
    );

    await this.prisma.userVocabReview.upsert({
      where: { userId_cardId: { userId, cardId: input.cardId } },
      create: {
        userId,
        cardId: input.cardId,
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        state: next.state,
        nextReviewAt: next.nextReviewAt,
        lastResult: String(input.rating),
      },
      update: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        state: next.state,
        nextReviewAt: next.nextReviewAt,
        lastResult: String(input.rating),
      },
    });

    return {
      nextReviewAt: next.nextReviewAt.toISOString(),
      intervalDays: next.intervalDays,
      easeFactor: next.easeFactor,
      state: next.state,
    };
  }
}
