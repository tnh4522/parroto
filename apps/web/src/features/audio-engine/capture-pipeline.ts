import {
  confirmUploadResponseSchema,
  presignUploadRequestSchema,
  presignUploadResponseSchema,
  transcribeFallbackRequestSchema,
  transcribeFallbackResponseSchema,
} from "@linguacraft/contracts";
import { apiClient } from "@/shared/api/api-client";

export type MicPermissionState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported";

export interface RecordedClip {
  blob: Blob;
  objectUrl: string;
  mimeType: string;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

export function negotiateRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

export function isAudioCaptureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

export class AudioCapturePipeline {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private activeMimeType = "audio/webm";
  private lastObjectUrl: string | null = null;

  async start(): Promise<void> {
    if (!isAudioCaptureSupported()) {
      throw new Error("Microphone recording is not supported in this browser.");
    }

    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const preferredMime = negotiateRecorderMimeType();
    this.recorder = preferredMime
      ? new MediaRecorder(this.stream, { mimeType: preferredMime })
      : new MediaRecorder(this.stream);
    this.activeMimeType = this.recorder.mimeType || preferredMime || "audio/webm";

    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.start();
  }

  async stop(): Promise<RecordedClip> {
    const recorder = this.recorder;
    if (!recorder) {
      throw new Error("No active recording session.");
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: this.activeMimeType }));
      };
      recorder.onerror = () => {
        reject(new Error("Audio recording failed while finalizing stream."));
      };
      if (recorder.state !== "inactive") {
        recorder.stop();
      } else {
        resolve(new Blob(this.chunks, { type: this.activeMimeType }));
      }
    });

    this.releaseStream();
    this.revokePreviousObjectUrl();

    const objectUrl = URL.createObjectURL(blob);
    this.lastObjectUrl = objectUrl;

    return {
      blob,
      objectUrl,
      mimeType: this.activeMimeType,
    };
  }

  dispose(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        // Ignore stop errors during unmount cleanup
      }
    }
    this.releaseStream();
    this.revokePreviousObjectUrl();
    this.recorder = null;
  }

  private releaseStream(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
  }

  private revokePreviousObjectUrl(): void {
    if (this.lastObjectUrl) {
      URL.revokeObjectURL(this.lastObjectUrl);
      this.lastObjectUrl = null;
    }
  }
}

export async function transcribeRecordingFallback(
  blob: Blob,
  language = "en"
): Promise<string> {
  const presignPayload = presignUploadRequestSchema.parse({
    purpose: "SHADOWING_RECORDING",
    mimeType: blob.type || "audio/webm",
    contentLength: Math.max(1, blob.size),
  });

  const presign = await apiClient.request("/media/presign-upload", {
    method: "POST",
    body: presignPayload,
    schema: presignUploadResponseSchema,
  });

  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presignPayload.mimeType },
    body: blob,
  });

  if (!putResponse.ok) {
    throw new Error(`Audio upload failed (${putResponse.status}).`);
  }

  await apiClient.request(`/media/${encodeURIComponent(presign.assetId)}/confirm`, {
    method: "POST",
    schema: confirmUploadResponseSchema,
  });

  const transcribePayload = transcribeFallbackRequestSchema.parse({
    assetId: presign.assetId,
    language,
  });

  const result = await apiClient.request("/audio/transcribe-fallback", {
    method: "POST",
    body: transcribePayload,
    schema: transcribeFallbackResponseSchema,
  });

  return result.text;
}
