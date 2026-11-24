import { Injectable } from "@nestjs/common";
import type { SentenceAttemptRequest } from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import { persistSentenceAttempt } from "../lessons/lesson-attempt.helper";

@Injectable()
export class DictationService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(
    userId: string,
    lessonId: string,
    input: SentenceAttemptRequest
  ) {
    // Apply slight penalty cap if hint count is high while enforcing server 0..100 bounds
    const adjustedScore = Math.max(
      0,
      Math.min(100, input.accuracyScore - Math.min(20, input.mistakesCount * 2))
    );

    return persistSentenceAttempt(this.prisma, {
      userId,
      lessonId,
      input: { ...input, accuracyScore: adjustedScore },
      policy: {
        passThresholdScore: 80,
        rewardDiamondsOnFirstPass: 3,
        rewardXpOnFirstPass: 15,
      },
    });
  }
}
