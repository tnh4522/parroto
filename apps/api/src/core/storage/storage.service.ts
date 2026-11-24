import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { getAppEnv } from "../config/env";

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  readonly bucket: string;

  constructor() {
    const env = getAppEnv();
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async createPresignedPutUrl(params: {
    objectKey: string;
    mimeType: string;
    contentLength: number;
    expiresInSeconds?: number;
  }): Promise<{ uploadUrl: string; expiresAt: string }> {
    const ttl = params.expiresInSeconds ?? 600;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.objectKey,
      ContentType: params.mimeType,
      ContentLength: params.contentLength,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: ttl });
    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  async createPresignedGetUrl(
    objectKey: string,
    expiresInSeconds = 900
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return {
      signedUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async headObject(objectKey: string): Promise<{
    exists: boolean;
    contentLength: number | null;
    contentType: string | null;
  }> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        })
      );
      return {
        exists: true,
        contentLength: head.ContentLength ?? null,
        contentType: head.ContentType ?? null,
      };
    } catch {
      return { exists: false, contentLength: null, contentType: null };
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      })
    );
  }
}
