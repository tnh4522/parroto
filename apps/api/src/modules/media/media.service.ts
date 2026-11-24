import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { EntitlementTier } from "@linguacraft/contracts";
import { PrismaService } from "../../core/database/prisma.service";
import { StorageService } from "../../core/storage/storage.service";

const ALLOWED_AUDIO_MIME_PREFIXES = [
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
];

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function extensionFromMime(mimeType: string): string {
  const base = (mimeType.split(";")[0] ?? "").trim().toLowerCase();
  switch (base) {
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
      return "wav";
    default:
      return "webm";
  }
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async presignUpload(
    userId: string,
    input: {
      purpose: "SHADOWING_RECORDING" | "SPEAKING_CLIP";
      mimeType: string;
      contentLength: number;
      consentAccepted?: boolean;
    }
  ): Promise<{ assetId: string; uploadUrl: string; expiresAt: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { audioConsentAt: true },
    });

    if (!user?.audioConsentAt && input.consentAccepted !== true) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "AUDIO_CONSENT_REQUIRED",
        message:
          "Explicit recording and cloud processing consent is required before uploading audio",
      });
    }

    if (!user?.audioConsentAt && input.consentAccepted === true) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          audioConsentAt: new Date(),
          audioConsentVersion: "2026-11",
        },
      });
    }

    const cleanMime = input.mimeType.trim().toLowerCase();
    const isAllowed = ALLOWED_AUDIO_MIME_PREFIXES.some((prefix) =>
      cleanMime.startsWith(prefix)
    );
    if (!isAllowed) {
      throw new BadRequestException({
        statusCode: 400,
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Only audio MIME types (webm, mp4, ogg, mp3, wav) are permitted",
      });
    }

    if (input.contentLength <= 0 || input.contentLength > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        statusCode: 400,
        code: "FILE_TOO_LARGE",
        message: "Audio upload must be between 1 byte and 25 MB",
      });
    }

    const assetId = randomUUID();
    const ext = extensionFromMime(cleanMime);
    const objectKey = `uploads/${userId}/${assetId}.${ext}`;
    const expiresAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.mediaAsset.create({
      data: {
        id: assetId,
        ownerId: userId,
        purpose:
          input.purpose === "SHADOWING_RECORDING"
            ? "user_recording"
            : "speaking_clip",
        bucket: this.storage.bucket,
        objectKey,
        mimeType: cleanMime,
        sizeBytes: input.contentLength,
        status: "PENDING_UPLOAD",
        expiresAt: expiresAtDate,
      },
    });

    const signed = await this.storage.createPresignedPutUrl({
      objectKey,
      mimeType: cleanMime,
      contentLength: input.contentLength,
      expiresInSeconds: 600,
    });

    return {
      assetId,
      uploadUrl: signed.uploadUrl,
      expiresAt: signed.expiresAt,
    };
  }

  async confirmUpload(
    userId: string,
    assetId: string
  ): Promise<{ assetId: string; status: "CONFIRMED" | "PROCESSING" | "FAILED" }> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException({
        statusCode: 404,
        code: "MEDIA_ASSET_NOT_FOUND",
        message: "Media asset not found",
      });
    }
    if (asset.ownerId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this media asset",
      });
    }

    const head = await this.storage.headObject(asset.objectKey);
    if (!head.exists) {
      throw new BadRequestException({
        statusCode: 400,
        code: "OBJECT_NOT_UPLOADED",
        message: "Uploaded audio object was not found in storage",
      });
    }

    if (head.contentLength !== null && head.contentLength > MAX_UPLOAD_BYTES) {
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { status: "FAILED" },
      });
      throw new BadRequestException({
        statusCode: 400,
        code: "FILE_TOO_LARGE",
        message: "Uploaded object exceeds maximum allowed 25 MB size",
      });
    }

    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: "READY",
        sizeBytes: head.contentLength ?? asset.sizeBytes,
      },
    });

    return {
      assetId: asset.id,
      status: "CONFIRMED",
    };
  }

  async getSignedStreamUrl(
    assetId: string,
    caller: { userId: string; entitlementTier: EntitlementTier } | null
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset || asset.status !== "READY") {
      throw new NotFoundException({
        statusCode: 404,
        code: "MEDIA_NOT_READY",
        message: "Media stream is unavailable",
      });
    }

    if (
      (asset.purpose === "user_recording" || asset.purpose === "speaking_clip") &&
      asset.ownerId !== caller?.userId
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Private user recording cannot be accessed by another user",
      });
    }

    return this.storage.createPresignedGetUrl(asset.objectKey, 900);
  }

  async deleteMediaAsset(
    userId: string,
    assetId: string
  ): Promise<{ deleted: boolean; assetId: string }> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException({
        statusCode: 404,
        code: "MEDIA_ASSET_NOT_FOUND",
        message: "Media asset not found",
      });
    }

    if (asset.ownerId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not own this media asset",
      });
    }

    await this.storage.deleteObject(asset.objectKey);

    await this.prisma.$transaction(async (tx) => {
      await tx.speechAssessment.updateMany({
        where: { mediaAssetId: asset.id },
        data: { mediaAssetId: null, audioDeletedAt: new Date() },
      });
      await tx.mediaAsset.delete({
        where: { id: asset.id },
      });
    });

    return { deleted: true, assetId: asset.id };
  }
}
