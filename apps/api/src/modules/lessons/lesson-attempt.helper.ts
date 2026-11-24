import type { SentenceAttemptRequest } from "@linguacraft/contracts";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/database/prisma.service";

export interface ModeGradingPolicy {
  passThresholdScore: number;
  rewardDiamondsOnFirstPass: number;
  rewardXpOnFirstPass: number;
}

export async function persistSentenceAttempt(
  prisma: PrismaService,
  params: {
    userId: string;
    lessonId: string;
    input: SentenceAttemptRequest;
    policy: ModeGradingPolicy;
  }
): Promise<{
  passed: boolean;
  sentenceScore: number;
  diamondsEarned: number;
  streakUpdated: boolean;
}> {
  const { userId, lessonId, input, policy } = params;

  const sentence = await prisma.lessonSentence.findFirst({
    where: { id: input.sentenceId, lessonId },
    select: { id: true },
  });

  if (!sentence) {
    throw new NotFoundException({
      statusCode: 404,
      code: "SENTENCE_NOT_FOUND",
      message: "Sentence does not belong to this lesson",
    });
  }

  const totalSentences = await prisma.lessonSentence.count({
    where: { lessonId },
  });

  const sentenceScore = Math.max(0, Math.min(100, input.accuracyScore));
  const passed = sentenceScore >= policy.passThresholdScore;

  return prisma.$transaction(async (tx) => {
    await tx.sentenceAttempt.create({
      data: {
        userId,
        sentenceId: input.sentenceId,
        mode: input.mode,
        accuracyScore: sentenceScore,
        mistakesCount: input.mistakesCount,
        replayCount: input.replayCount,
        passed,
      },
    });

    const existingProgress = await tx.lessonProgress.findUnique({
      where: {
        userId_lessonId_mode: { userId, lessonId, mode: input.mode },
      },
    });

    const prevCompleted = existingProgress?.completedCount ?? 0;
    const nextCompleted = passed
      ? Math.min(Math.max(1, totalSentences), prevCompleted + 1)
      : prevCompleted;

    await tx.lessonProgress.upsert({
      where: {
        userId_lessonId_mode: { userId, lessonId, mode: input.mode },
      },
      create: {
        userId,
        lessonId,
        mode: input.mode,
        completedCount: nextCompleted,
        totalSentences: Math.max(1, totalSentences),
        averageScore: sentenceScore,
        completedAt:
          nextCompleted >= Math.max(1, totalSentences) ? new Date() : null,
      },
      update: {
        completedCount: nextCompleted,
        averageScore: existingProgress?.averageScore
          ? (existingProgress.averageScore + sentenceScore) / 2
          : sentenceScore,
        completedAt:
          nextCompleted >= Math.max(1, totalSentences)
            ? existingProgress?.completedAt ?? new Date()
            : null,
      },
    });

    let diamondsEarned = 0;
    let streakUpdated = false;

    if (passed) {
      const ledgerKey = `sentence:${input.mode}:${userId}:${input.sentenceId}:first_pass`;
      const existingReward = await tx.diamondLedger.findUnique({
        where: { idempotencyKey: ledgerKey },
        select: { id: true },
      });

      if (!existingReward) {
        const currentStats = await tx.userStats.findUnique({
          where: { userId },
        });
        const prevDiamonds = currentStats?.diamondBalance ?? 0;
        const prevXp = currentStats?.xpTotal ?? 0;
        const nextDiamonds = prevDiamonds + policy.rewardDiamondsOnFirstPass;
        const nextXp = prevXp + policy.rewardXpOnFirstPass;
        const nextLevel = Math.max(1, Math.floor(nextXp / 250) + 1);

        await tx.userStats.upsert({
          where: { userId },
          create: {
            userId,
            diamondBalance: nextDiamonds,
            xpTotal: nextXp,
            level: nextLevel,
          },
          update: {
            diamondBalance: nextDiamonds,
            xpTotal: nextXp,
            level: nextLevel,
          },
        });

        await tx.diamondLedger.create({
          data: {
            userId,
            delta: policy.rewardDiamondsOnFirstPass,
            balanceAfter: nextDiamonds,
            reason: "SENTENCE_REWARD",
            idempotencyKey: ledgerKey,
          },
        });

        await tx.xpLedger.create({
          data: {
            userId,
            delta: policy.rewardXpOnFirstPass,
            reason: `${input.mode}_SENTENCE_PASS`,
            idempotencyKey: `xp:${ledgerKey}`,
          },
        });

        diamondsEarned = policy.rewardDiamondsOnFirstPass;
        streakUpdated = true;
      }
    }

    return {
      passed,
      sentenceScore,
      diamondsEarned,
      streakUpdated,
    };
  });
}
