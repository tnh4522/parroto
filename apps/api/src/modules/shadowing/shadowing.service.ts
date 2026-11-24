import { Injectable } from "@nestjs/common";
import type { SentenceAttemptRequest } from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import { persistSentenceAttempt } from "../lessons/lesson-attempt.helper";

@Injectable()
export class ShadowingService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(
    userId: string,
    lessonId: string,
    input: SentenceAttemptRequest
  ) {
    return persistSentenceAttempt(this.prisma, {
      userId,
      lessonId,
      input,
      policy: {
        passThresholdScore: 75,
        rewardDiamondsOnFirstPass: 4,
        rewardXpOnFirstPass: 20,
      },
    });
  }
}
