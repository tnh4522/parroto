import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  EntitlementTier,
  ExamTrack,
  StartExamSessionRequest,
} from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import { RedisService } from "../../core/redis/redis.service";
import { StorageService } from "../../core/storage/storage.service";
import {
  answersMatch,
  calculateIeltsBand,
  calculateToeicScaled,
} from "./exam-scoring";

function extractJsonLabel(raw: unknown, fallback: string): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    if (typeof obj.title === "string") return obj.title;
  }
  return fallback;
}

function isEntitledForPro(tier: EntitlementTier | null | undefined): boolean {
  return tier === "PRO" || tier === "LIFETIME";
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService
  ) {}

  async listExamSets(track: ExamTrack) {
    const cacheKey = `exams:sets:${track}`;
    const cached = await this.redis.getJson<{ sets: unknown[] }>(cacheKey);
    if (cached) return cached;

    const sets = await this.prisma.examSet.findMany({
      where: {
        isActive: true,
        examType: { code: track },
      },
      include: { examType: { select: { code: true } } },
      orderBy: { sortOrder: "asc" },
    });

    const payload = {
      sets: sets.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: extractJsonLabel(s.nameJson, s.slug),
        description: `${s.source} (${s.year})`,
        track: s.examType.code,
        examCount: s.totalExams,
        coverImageUrl: null,
      })),
    };

    await this.redis.setJson(cacheKey, payload, 300);
    return payload;
  }

  async getExamSetDetail(setSlug: string) {
    const examSet = await this.prisma.examSet.findUnique({
      where: { slug: setSlug },
      include: {
        examType: { select: { code: true } },
        exams: { orderBy: [{ isFree: "desc" }, { sortOrder: "asc" }] },
      },
    });

    if (!examSet) {
      throw new NotFoundException({
        statusCode: 404,
        code: "EXAM_SET_NOT_FOUND",
        message: "Exam set not found",
      });
    }

    return {
      examSet: {
        id: examSet.id,
        slug: examSet.slug,
        title: extractJsonLabel(examSet.nameJson, examSet.slug),
        description: `${examSet.source} (${examSet.year})`,
        track: examSet.examType.code,
        examCount: examSet.totalExams,
        coverImageUrl: null,
      },
      exams: examSet.exams.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: extractJsonLabel(e.titleJson, e.slug),
        track: examSet.examType.code,
        totalQuestions: e.totalQuestions,
        durationMinutes: Math.max(1, Math.round(e.totalDurationSeconds / 60)),
        isFree: e.isFree,
        attemptsCount: e.attemptCount,
      })),
    };
  }

  async getExamOverview(slug: string, callerUserId: string | null) {
    const exam = await this.prisma.exam.findUnique({
      where: { slug },
      include: {
        examSet: { include: { examType: { select: { code: true } } } },
        parts: { orderBy: { partNumber: "asc" } },
      },
    });

    if (!exam) {
      throw new NotFoundException({
        statusCode: 404,
        code: "EXAM_NOT_FOUND",
        message: "Exam not found",
      });
    }

    const activeSession = callerUserId
      ? await this.prisma.examSession.findFirst({
          where: {
            userId: callerUserId,
            examId: exam.id,
            status: "IN_PROGRESS",
          },
          select: { id: true },
        })
      : null;

    return {
      exam: {
        id: exam.id,
        slug: exam.slug,
        title: extractJsonLabel(exam.titleJson, exam.slug),
        track: exam.examSet.examType.code,
        totalQuestions: exam.totalQuestions,
        durationMinutes: Math.max(1, Math.round(exam.totalDurationSeconds / 60)),
        isFree: exam.isFree,
        attemptsCount: exam.attemptCount,
      },
      parts: exam.parts.map((p) => ({
        partNumber: p.partNumber,
        title: p.name,
        questionCount: p.questionCount,
        skill:
          p.section.toLowerCase() === "listening"
            ? ("LISTENING" as const)
            : ("READING" as const),
      })),
      userInProgressSessionId: activeSession?.id ?? null,
    };
  }

  async startSession(
    userId: string,
    tier: EntitlementTier,
    input: StartExamSessionRequest
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: input.examId },
      include: {
        examSet: { include: { examType: { select: { code: true } } } },
        parts: { orderBy: { partNumber: "asc" } },
      },
    });

    if (!exam) {
      throw new NotFoundException({
        statusCode: 404,
        code: "EXAM_NOT_FOUND",
        message: "Exam not found",
      });
    }

    if (!exam.isFree && !isEntitledForPro(tier)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "ENTITLEMENT_REQUIRED",
        message: "Active PRO or LIFETIME entitlement is required for this exam",
      });
    }

    const existingActive = await this.prisma.examSession.findFirst({
      where: {
        userId,
        examId: exam.id,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    });

    if (existingActive) {
      throw new ConflictException({
        statusCode: 409,
        code: "SESSION_ALREADY_ACTIVE",
        message: "You already have an active session in progress for this exam",
      });
    }

    const selectedParts = input.parts ?? [];
    const activeParts =
      selectedParts.length > 0
        ? exam.parts.filter((p) => selectedParts.includes(p.partNumber))
        : exam.parts;

    const totalQuestions =
      activeParts.reduce((sum, p) => sum + p.questionCount, 0) ||
      exam.totalQuestions;

    const proportionalDurationSec = Math.max(
      60,
      Math.round(
        (totalQuestions / Math.max(1, exam.totalQuestions)) *
          exam.totalDurationSeconds
      )
    );
    const now = new Date();
    const deadlineAt =
      input.mode === "TEST"
        ? new Date(now.getTime() + proportionalDurationSec * 1000)
        : null;

    const session = await this.prisma.examSession.create({
      data: {
        userId,
        examId: exam.id,
        mode: input.mode,
        selectedParts,
        status: "IN_PROGRESS",
        startedAt: now,
        deadlineAt,
        totalQuestions,
      },
    });

    return {
      session: {
        id: session.id,
        examId: session.examId,
        track: exam.examSet.examType.code,
        mode: session.mode,
        status: session.status,
        selectedParts: session.selectedParts,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.deadlineAt?.toISOString() ?? null,
      },
    };
  }

  async getSessionQuestions(
    userId: string,
    sessionId: string,
    partFilter?: number
  ) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            examSet: { include: { examType: { select: { code: true } } } },
            parts: {
              orderBy: { partNumber: "asc" },
              include: {
                groups: {
                  orderBy: { orderIndex: "asc" },
                  include: { questions: { orderBy: { orderIndex: "asc" } } },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "Exam session not found",
      });
    }

    if (session.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this exam session",
      });
    }

    const activeParts = session.exam.parts.filter(
      (p) =>
        (session.selectedParts.length === 0 ||
          session.selectedParts.includes(p.partNumber)) &&
        (!partFilter || p.partNumber === partFilter)
    );

    const groupsOut = await Promise.all(
      activeParts.flatMap((part) =>
        part.groups.map(async (group) => {
          let audioSignedUrl: string | null = null;
          if (part.mediaAssetId) {
            const asset = await this.prisma.mediaAsset.findUnique({
              where: { id: part.mediaAssetId },
            });
            if (asset && asset.status === "READY") {
              const signed = await this.storage.createPresignedGetUrl(
                asset.objectKey,
                1800
              );
              audioSignedUrl = signed.signedUrl;
            }
          }

          return {
            id: group.id,
            partNumber: part.partNumber,
            instruction: null,
            passageText: group.stimulusHtml,
            audioSignedUrl,
            questions: group.questions.map((q) => ({
              questionNumber: q.questionNumber,
              partNumber: part.partNumber,
              questionType:
                q.answerFormat === "text"
                  ? ("FILL_BLANK" as const)
                  : ("MCQ" as const),
              promptText: q.promptHtml ?? `Question ${q.questionNumber}`,
              options:
                (q.choicesJson as Array<{ value: string; label: string }> | null) ??
                [],
            })),
          };
        })
      )
    );

    const savedAnswers: Record<
      string,
      { selectedValue: string; isFlagged: boolean }
    > = {};
    for (const ans of session.answers) {
      savedAnswers[String(ans.questionNumber)] = {
        selectedValue: ans.selectedValue,
        isFlagged: ans.isFlagged,
      };
    }

    return {
      session: {
        id: session.id,
        examId: session.examId,
        track: session.exam.examSet.examType.code,
        mode: session.mode,
        status: session.status,
        selectedParts: session.selectedParts,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.deadlineAt?.toISOString() ?? null,
      },
      parts: activeParts.map((p) => ({
        partNumber: p.partNumber,
        title: p.name,
        questionCount: p.questionCount,
        skill:
          p.section.toLowerCase() === "listening"
            ? ("LISTENING" as const)
            : ("READING" as const),
      })),
      groups: groupsOut,
      savedAnswers,
    };
  }

  async saveAnswers(
    userId: string,
    sessionId: string,
    answers: Array<{
      questionNumber: number;
      selectedValue: string;
      isFlagged?: boolean;
    }>
  ) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "Exam session not found",
      });
    }
    if (session.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this exam session",
      });
    }
    if (session.status !== "IN_PROGRESS") {
      throw new BadRequestException({
        statusCode: 400,
        code: "SESSION_CLOSED",
        message: "Cannot modify answers after exam session is finalized",
      });
    }
    if (
      session.mode === "TEST" &&
      session.deadlineAt &&
      Date.now() > session.deadlineAt.getTime() + 5000
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "EXAM_EXPIRED",
        message: "Test deadline has expired",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const ans of answers) {
        await tx.sessionAnswer.upsert({
          where: {
            sessionId_questionNumber: {
              sessionId,
              questionNumber: ans.questionNumber,
            },
          },
          create: {
            sessionId,
            questionNumber: ans.questionNumber,
            selectedValue: ans.selectedValue,
            isFlagged: ans.isFlagged ?? false,
          },
          update: {
            selectedValue: ans.selectedValue,
            isFlagged: ans.isFlagged ?? false,
          },
        });
      }
    });

    return {
      savedCount: answers.length,
      updatedAt: new Date().toISOString(),
    };
  }

  async checkPracticeQuestion(
    userId: string,
    sessionId: string,
    questionNumber: number
  ) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
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
        answers: { where: { questionNumber } },
      },
    });

    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "Exam session not found",
      });
    }
    if (session.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this exam session",
      });
    }
    if (session.mode !== "PRACTICE") {
      throw new ForbiddenException({
        statusCode: 403,
        code: "PRACTICE_MODE_ONLY",
        message: "Inline answer verification is only allowed in Practice mode",
      });
    }

    const question = session.exam.parts
      .flatMap((p) => p.groups)
      .flatMap((g) => g.questions)
      .find((q) => q.questionNumber === questionNumber);

    if (!question) {
      throw new NotFoundException({
        statusCode: 404,
        code: "QUESTION_NOT_FOUND",
        message: `Question ${questionNumber} was not found in this exam`,
      });
    }

    const saved = session.answers[0];
    const isCorrect = answersMatch(
      question.answerFormat,
      saved?.selectedValue,
      question.correctAnswer
    );

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanationHtml: question.explanationHtml ?? "",
    };
  }

  async submitSession(userId: string, sessionId: string) {
    const lockKey = `lock:exam-submit:${sessionId}`;
    const locked = await this.redis.acquireLock(lockKey, 15000);
    if (!locked) {
      throw new ConflictException({
        statusCode: 409,
        code: "SUBMIT_IN_PROGRESS",
        message: "Session grading is already in progress",
      });
    }

    try {
      const session = await this.prisma.examSession.findUnique({
        where: { id: sessionId },
        include: {
          exam: {
            include: {
              examSet: { include: { examType: { select: { code: true } } } },
              parts: {
                include: {
                  groups: { include: { questions: true } },
                },
              },
            },
          },
          answers: true,
        },
      });

      if (!session) {
        throw new NotFoundException({
          statusCode: 404,
          code: "SESSION_NOT_FOUND",
          message: "Exam session not found",
        });
      }
      if (session.userId !== userId) {
        throw new ForbiddenException({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "You do not own this exam session",
        });
      }
      if (session.status !== "IN_PROGRESS") {
        throw new BadRequestException({
          statusCode: 400,
          code: "SESSION_ALREADY_FINALIZED",
          message: "Exam session has already been completed or abandoned",
        });
      }

      const activeParts = session.exam.parts.filter(
        (p) =>
          session.selectedParts.length === 0 ||
          session.selectedParts.includes(p.partNumber)
      );

      const answersByQn = new Map(
        session.answers.map((a) => [a.questionNumber, a])
      );

      let totalCorrect = 0;
      let totalQuestions = 0;
      let listeningCorrect = 0;
      let listeningTotal = 0;
      let readingCorrect = 0;
      let readingTotal = 0;

      const gradedUpdates: Array<{ questionNumber: number; isCorrect: boolean }> =
        [];

      for (const part of activeParts) {
        const isListening = part.section.toLowerCase() === "listening";
        for (const group of part.groups) {
          for (const q of group.questions) {
            totalQuestions += 1;
            const userAns = answersByQn.get(q.questionNumber);
            const ok = answersMatch(
              q.answerFormat,
              userAns?.selectedValue,
              q.correctAnswer
            );
            if (ok) totalCorrect += 1;
            if (isListening) {
              listeningTotal += 1;
              if (ok) listeningCorrect += 1;
            } else {
              readingTotal += 1;
              if (ok) readingCorrect += 1;
            }
            if (userAns) {
              gradedUpdates.push({
                questionNumber: q.questionNumber,
                isCorrect: ok,
              });
            }
          }
        }
      }

      const safeTotal = Math.max(1, totalQuestions);
      const track = session.exam.examSet.examType.code;
      const completedAt = new Date();
      const timeSpentSeconds = Math.max(
        1,
        Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000)
      );

      let ieltsBand: number | null = null;
      let toeicListening: number | null = null;
      let toeicReading: number | null = null;
      let toeicTotalScaled: number | null = null;
      let scoreDisplay = "";

      if (track === "IELTS") {
        ieltsBand = calculateIeltsBand(totalCorrect, safeTotal);
        scoreDisplay = `Band ${ieltsBand.toFixed(1)}`;
      } else {
        const toeic = calculateToeicScaled(
          listeningCorrect,
          listeningTotal,
          readingCorrect,
          readingTotal
        );
        toeicListening = toeic.listening;
        toeicReading = toeic.reading;
        toeicTotalScaled = toeic.total;
        scoreDisplay = String(toeic.total);
      }

      await this.prisma.$transaction(async (tx) => {
        for (const update of gradedUpdates) {
          await tx.sessionAnswer.update({
            where: {
              sessionId_questionNumber: {
                sessionId,
                questionNumber: update.questionNumber,
              },
            },
            data: { isCorrect: update.isCorrect },
          });
        }

        await tx.examSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            completedAt,
            timeSpentSeconds,
            totalCorrect,
            totalQuestions: safeTotal,
            ieltsBand,
            toeicListening,
            toeicReading,
            toeicTotalScaled,
          },
        });

        await tx.exam.update({
          where: { id: session.examId },
          data: { attemptCount: { increment: 1 } },
        });
      });

      return {
        sessionResult: {
          id: session.id,
          examId: session.examId,
          examSlug: session.exam.slug,
          examTitle: extractJsonLabel(session.exam.titleJson, session.exam.slug),
          track,
          mode: session.mode,
          status: "COMPLETED" as const,
          scoreDisplay,
          accuracyPct: Math.round((totalCorrect / safeTotal) * 100),
          startedAt: session.startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        },
      };
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  async abandonSession(userId: string, sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "Exam session not found",
      });
    }
    if (session.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this exam session",
      });
    }

    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "ABANDONED" },
    });

    return { status: "ABANDONED" as const };
  }

  async getSessionResult(userId: string, sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            examSet: { include: { examType: { select: { code: true } } } },
            parts: {
              orderBy: { partNumber: "asc" },
              include: {
                groups: {
                  orderBy: { orderIndex: "asc" },
                  include: { questions: { orderBy: { orderIndex: "asc" } } },
                },
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "Exam session not found",
      });
    }
    if (session.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this exam session",
      });
    }
    if (session.status !== "COMPLETED") {
      throw new BadRequestException({
        statusCode: 400,
        code: "RESULT_UNAVAILABLE",
        message: "Exam session must be submitted before viewing results",
      });
    }

    const activeParts = session.exam.parts.filter(
      (p) =>
        session.selectedParts.length === 0 ||
        session.selectedParts.includes(p.partNumber)
    );

    const userAnsByQn = new Map(
      session.answers.map((a) => [a.questionNumber, a])
    );

    const answersMap: Record<
      string,
      {
        selectedValue: string | null;
        correctAnswer: string;
        isCorrect: boolean;
        explanationHtml: string | null;
      }
    > = {};

    for (const part of activeParts) {
      for (const group of part.groups) {
        for (const q of group.questions) {
          const userAns = userAnsByQn.get(q.questionNumber);
          answersMap[String(q.questionNumber)] = {
            selectedValue: userAns?.selectedValue ?? null,
            correctAnswer: q.correctAnswer,
            isCorrect:
              userAns?.isCorrect ??
              answersMatch(q.answerFormat, userAns?.selectedValue, q.correctAnswer),
            explanationHtml: q.explanationHtml,
          };
        }
      }
    }

    const track = session.exam.examSet.examType.code;
    const scoreDisplay =
      track === "IELTS" && session.ieltsBand !== null
        ? `Band ${session.ieltsBand.toFixed(1)}`
        : session.toeicTotalScaled !== null
          ? String(session.toeicTotalScaled)
          : null;

    return {
      session: {
        id: session.id,
        examId: session.examId,
        examSlug: session.exam.slug,
        examTitle: extractJsonLabel(session.exam.titleJson, session.exam.slug),
        track,
        mode: session.mode,
        status: session.status,
        scoreDisplay,
        accuracyPct:
          session.totalCorrect !== null && session.totalQuestions > 0
            ? Math.round((session.totalCorrect / session.totalQuestions) * 100)
            : null,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      },
      parts: activeParts.map((p) => ({
        partNumber: p.partNumber,
        title: p.name,
        questionCount: p.questionCount,
        skill:
          p.section.toLowerCase() === "listening"
            ? ("LISTENING" as const)
            : ("READING" as const),
      })),
      groups: activeParts.flatMap((part) =>
        part.groups.map((group) => ({
          id: group.id,
          partNumber: part.partNumber,
          instruction: null,
          passageText: group.stimulusHtml,
          audioSignedUrl: null,
          questions: group.questions.map((q) => ({
            questionNumber: q.questionNumber,
            partNumber: part.partNumber,
            questionType:
              q.answerFormat === "text"
                ? ("FILL_BLANK" as const)
                : ("MCQ" as const),
            promptText: q.promptHtml ?? `Question ${q.questionNumber}`,
            options:
              (q.choicesJson as Array<{ value: string; label: string }> | null) ??
              [],
          })),
        }))
      ),
      answersMap,
    };
  }
}
