import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import type {
  CefrLevel,
  CreateSpeakingRoomRequest,
} from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../core/http/pagination";
import { AiOrchestratorService } from "../ai/ai-orchestrator.service";

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiOrchestratorService
  ) {}

  async listComments(params: {
    targetType: "LESSON" | "STORY" | "EXAM";
    targetId: string;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = normalizePagination(
      params.page,
      params.limit ?? 20
    );

    const targetFilter =
      params.targetType === "LESSON"
        ? { lessonId: params.targetId }
        : params.targetType === "STORY"
          ? { storyId: params.targetId }
          : { examId: params.targetId };

    const where = {
      ...targetFilter,
      deletedAt: null,
    };

    const [rows, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { author: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      items: rows.map((c) => ({
        id: c.id,
        targetType: params.targetType,
        targetId: params.targetId,
        authorDisplayName: c.author.displayName,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async createComment(
    userId: string,
    input: {
      targetType: "LESSON" | "STORY" | "EXAM";
      targetId: string;
      content: string;
    }
  ) {
    const mod = await this.ai.moderateText({
      userId,
      text: input.content,
    });
    if (mod.flagged) {
      throw new BadRequestException({
        statusCode: 400,
        code: "CONTENT_MODERATED",
        message: "Comment violates community content guidelines",
      });
    }

    const created = await this.prisma.comment.create({
      data: {
        authorId: userId,
        lessonId: input.targetType === "LESSON" ? input.targetId : null,
        storyId: input.targetType === "STORY" ? input.targetId : null,
        examId: input.targetType === "EXAM" ? input.targetId : null,
        content: input.content,
      },
      include: { author: { select: { displayName: true } } },
    });

    return {
      comment: {
        id: created.id,
        targetType: input.targetType,
        targetId: input.targetId,
        authorDisplayName: created.author.displayName,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
      },
    };
  }

  async listSpeakingRooms(filters: {
    cefrLevel?: CefrLevel;
    topic?: string;
  }) {
    const rooms = await this.prisma.speakingRoom.findMany({
      where: {
        isActive: true,
        ...(filters.cefrLevel ? { cefrLevel: filters.cefrLevel } : {}),
        ...(filters.topic
          ? { topic: { equals: filters.topic, mode: "insensitive" } }
          : {}),
      },
      include: { host: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return {
      items: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        topic: r.topic,
        cefrLevel: r.cefrLevel,
        maxParticipants: r.maxParticipants,
        currentParticipants: r.currentParticipants,
        isPrivate: r.isPrivate,
        hostDisplayName: r.host.displayName,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async createSpeakingRoom(userId: string, input: CreateSpeakingRoomRequest) {
    const mod = await this.ai.moderateText({
      userId,
      text: `${input.name} ${input.topic}`,
    });
    if (mod.flagged) {
      throw new BadRequestException({
        statusCode: 400,
        code: "CONTENT_MODERATED",
        message: "Room title or topic violates community safety guidelines",
      });
    }

    const room = await this.prisma.speakingRoom.create({
      data: {
        hostId: userId,
        name: input.name,
        topic: input.topic,
        cefrLevel: input.cefrLevel,
        maxParticipants: input.maxParticipants,
        currentParticipants: 1,
        isPrivate: input.isPrivate,
        isActive: true,
      },
      include: { host: { select: { displayName: true } } },
    });

    return {
      room: {
        id: room.id,
        name: room.name,
        topic: room.topic,
        cefrLevel: room.cefrLevel,
        maxParticipants: room.maxParticipants,
        currentParticipants: room.currentParticipants,
        isPrivate: room.isPrivate,
        hostDisplayName: room.host.displayName,
        createdAt: room.createdAt.toISOString(),
      },
    };
  }
}
