import { ConflictException, Injectable } from "@nestjs/common";
import type { ExamTrack } from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../core/http/pagination";
import { RedisService } from "../../core/redis/redis.service";

function extractExamTitle(raw: unknown, fallback: string): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    if (typeof obj.title === "string") return obj.title;
  }
  return fallback;
}

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async getExamHistory(userId: string, track?: ExamTrack, page?: number) {
    const { page: safePage, limit, skip } = normalizePagination(page, 10);
    const where = {
      userId,
      ...(track ? { exam: { examSet: { examType: { code: track } } } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.examSession.findMany({
        where,
        include: {
          exam: {
            include: { examSet: { include: { examType: { select: { code: true } } } } },
          },
        },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.examSession.count({ where }),
    ]);

    return {
      items: rows.map((session) => {
        const resolvedTrack = session.exam.examSet.examType.code;
        const scoreDisplay =
          resolvedTrack === "IELTS" && session.ieltsBand !== null
            ? `Band ${session.ieltsBand.toFixed(1)}`
            : session.toeicTotalScaled !== null
              ? String(session.toeicTotalScaled)
              : null;

        return {
          id: session.id,
          examId: session.examId,
          examSlug: session.exam.slug,
          examTitle: extractExamTitle(session.exam.titleJson, session.exam.slug),
          track: resolvedTrack,
          mode: session.mode,
          status: session.status,
          scoreDisplay,
          accuracyPct:
            session.totalCorrect !== null && session.totalQuestions > 0
              ? Math.round((session.totalCorrect / session.totalQuestions) * 100)
              : null,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
        };
      }),
      pagination: buildPaginationMeta(safePage, limit, total),
    };
  }

  async getExamAnalytics(userId: string, track: ExamTrack) {
    const completedSessions = await this.prisma.examSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        exam: { examSet: { examType: { code: track } } },
      },
      include: {
        exam: {
          include: {
            parts: {
              include: {
                groups: { include: { questions: true } },
              },
            },
          },
        },
        answers: true,
      },
      orderBy: { completedAt: "asc" },
    });

    const scores = completedSessions.map((s) =>
      track === "IELTS" ? s.ieltsBand ?? 0 : s.toeicTotalScaled ?? 0
    );
    const totalCompleted = completedSessions.length;
    const averageScore =
      totalCompleted > 0
        ? Number(
            (scores.reduce((sum, n) => sum + n, 0) / totalCompleted).toFixed(1)
          )
        : 0;
    const bestScore = totalCompleted > 0 ? Math.max(...scores) : 0;
    const totalStudyMinutes = Math.round(
      completedSessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0) / 60
    );

    const skillBuckets = new Map<
      string,
      { total: number; correct: number }
    >();

    for (const s of completedSessions) {
      const qMetaByNumber = new Map<number, string>();
      for (const p of s.exam.parts) {
        for (const g of p.groups) {
          for (const q of g.questions) {
            qMetaByNumber.set(q.questionNumber, q.skillTag);
          }
        }
      }

      for (const ans of s.answers) {
        const tag = qMetaByNumber.get(ans.questionNumber) ?? "General";
        const bucket = skillBuckets.get(tag) ?? { total: 0, correct: 0 };
        bucket.total += 1;
        if (ans.isCorrect) bucket.correct += 1;
        skillBuckets.set(tag, bucket);
      }
    }

    const topWeakAreas = Array.from(skillBuckets.entries())
      .map(([tag, counts]) => ({
        tag,
        accuracyPct:
          counts.total > 0
            ? Math.round((counts.correct / counts.total) * 100)
            : 0,
        questionCount: counts.total,
      }))
      .sort((a, b) => a.accuracyPct - b.accuracyPct)
      .slice(0, 6);

    return {
      summary: {
        totalCompleted,
        averageScore,
        bestScore,
        totalStudyMinutes,
      },
      scoreTrend: completedSessions.map((s) => ({
        sessionId: s.id,
        examTitle: extractExamTitle(s.exam.titleJson, s.exam.slug),
        score: track === "IELTS" ? s.ieltsBand ?? 0 : s.toeicTotalScaled ?? 0,
        completedAt: (s.completedAt ?? s.startedAt).toISOString(),
      })),
      topWeakAreas,
    };
  }

  async dailyCheckin(userId: string) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const lockKey = `lock:streak:${userId}:${todayIso}`;
    const acquired = await this.redis.acquireLock(lockKey, 10000);
    if (!acquired) {
      throw new ConflictException({
        statusCode: 409,
        code: "CHECKIN_IN_PROGRESS",
        message: "Daily check-in already processing",
      });
    }

    try {
      const idempotencyKey = `streak:${userId}:${todayIso}`;
      const existingEntry = await this.prisma.diamondLedger.findUnique({
        where: { idempotencyKey },
      });

      const stats = await this.prisma.userStats.findUnique({
        where: { userId },
      });

      if (existingEntry) {
        return {
          checkedIn: true,
          currentStreakDays: stats?.currentStreakDays ?? 1,
          diamondsEarned: 0,
          diamondBalance: stats?.diamondBalance ?? existingEntry.balanceAfter,
        };
      }

      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const lastIso = stats?.lastCheckInDate
        ? stats.lastCheckInDate.toISOString().slice(0, 10)
        : null;

      const nextStreak =
        lastIso === yesterdayDate
          ? (stats?.currentStreakDays ?? 0) + 1
          : 1;
      const longestStreak = Math.max(
        nextStreak,
        stats?.longestStreakDays ?? 0
      );
      const reward = 5;
      const nextBalance = (stats?.diamondBalance ?? 0) + reward;
      const todayDateObj = new Date(`${todayIso}T00:00:00.000Z`);

      await this.prisma.$transaction(async (tx) => {
        await tx.userStats.upsert({
          where: { userId },
          create: {
            userId,
            diamondBalance: nextBalance,
            currentStreakDays: nextStreak,
            longestStreakDays: longestStreak,
            lastCheckInDate: todayDateObj,
          },
          update: {
            diamondBalance: nextBalance,
            currentStreakDays: nextStreak,
            longestStreakDays: longestStreak,
            lastCheckInDate: todayDateObj,
          },
        });

        await tx.diamondLedger.create({
          data: {
            userId,
            delta: reward,
            balanceAfter: nextBalance,
            reason: "STREAK_CHECKIN",
            idempotencyKey,
          },
        });
      });

      return {
        checkedIn: true,
        currentStreakDays: nextStreak,
        diamondsEarned: reward,
        diamondBalance: nextBalance,
      };
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  async getMonthlyLeaderboard(month?: string) {
    const cleanMonth =
      month && /^\d{6}$/.test(month)
        ? month
        : new Date().toISOString().slice(0, 7).replace("-", "");
    const cacheKey = `leaderboard:monthly:${cleanMonth}`;
    const cached = await this.redis.getJson<{ month: string; entries: unknown[] }>(
      cacheKey
    );
    if (cached) return cached;

    const topStats = await this.prisma.userStats.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { xpTotal: "desc" },
      take: 25,
    });

    const payload = {
      month: cleanMonth,
      entries: topStats.map((row, idx) => ({
        rank: idx + 1,
        userId: row.userId,
        username: row.user.username,
        displayName: row.user.displayName,
        avatarUrl: row.user.avatarUrl,
        xpTotal: row.xpTotal,
        level: row.level,
      })),
    };

    await this.redis.setJson(cacheKey, payload, 120);
    return payload;
  }
}
