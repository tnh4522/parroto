import { Injectable } from "@nestjs/common";
import { getAppEnv } from "../../core/config/env";
import type { ISttProvider, SttTranscriptionResult } from "./ai.ports";

interface DeepgramResponse {
  metadata?: { duration?: number };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: Array<{
          word?: string;
          start?: number;
          end?: number;
          confidence?: number;
        }>;
      }>;
    }>;
  };
}

@Injectable()
export class DeepgramSttAdapter implements ISttProvider {
  isConfigured(): boolean {
    return Boolean(getAppEnv().DEEPGRAM_API_KEY);
  }

  async transcribe(input: {
    mediaUrl: string;
    language: string;
    wordTimestamps: boolean;
  }): Promise<SttTranscriptionResult> {
    const env = getAppEnv();
    if (!env.DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_UNCONFIGURED");
    }

    const res = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true&language=${encodeURIComponent(
        input.language
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: input.mediaUrl }),
        signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
      }
    );

    if (!res.ok) {
      throw new Error(`DEEPGRAM_HTTP_${res.status}`);
    }

    const body = (await res.json()) as DeepgramResponse;
    const alt = body.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript ?? "";
    const durationSec = Math.max(1, Math.round(body.metadata?.duration ?? 1));
    const words = (alt?.words ?? []).map((w) => ({
      word: w.word ?? "",
      startMs: Math.round((w.start ?? 0) * 1000),
      endMs: Math.round((w.end ?? 0) * 1000),
      confidence: w.confidence,
    }));

    return {
      provider: "deepgram",
      model: "nova-3",
      text: transcript,
      segments: [
        {
          startMs: 0,
          endMs: durationSec * 1000,
          text: transcript,
        },
      ],
      words,
      durationSec,
    };
  }
}
