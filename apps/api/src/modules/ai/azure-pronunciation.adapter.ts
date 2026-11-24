import { Injectable } from "@nestjs/common";
import { getAppEnv } from "../../core/config/env";
import type {
  AcousticAssessmentOutput,
  IPronunciationAssessmentProvider,
  PronunciationAssessmentInput,
} from "./ai.ports";

interface AzureWordRaw {
  Word?: string;
  Offset?: number;
  Duration?: number;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    ErrorType?: string;
  };
  Phonemes?: Array<{
    Phoneme?: string;
    PronunciationAssessment?: { AccuracyScore?: number };
  }>;
}

interface AzureSpeechResponse {
  DisplayText?: string;
  Duration?: number;
  NBest?: Array<{
    Display?: string;
    PronunciationAssessment?: {
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
      ProsodyScore?: number;
    };
    Words?: AzureWordRaw[];
  }>;
}

@Injectable()
export class AzurePronunciationAdapter
  implements IPronunciationAssessmentProvider
{
  readonly capabilities = {
    providerName: "azure_speech",
    supportsPhonemes: true,
    supportsProsody: true,
  };

  isConfigured(): boolean {
    const env = getAppEnv();
    return Boolean(env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION);
  }

  async assess(
    input: PronunciationAssessmentInput
  ): Promise<AcousticAssessmentOutput> {
    const env = getAppEnv();
    if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
      throw new Error("AZURE_SPEECH_UNCONFIGURED");
    }

    const audioRes = await fetch(input.audioUrl, {
      signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
    });
    if (!audioRes.ok) {
      throw new Error(`AZURE_AUDIO_FETCH_FAILED_${audioRes.status}`);
    }
    const audioBytes = Buffer.from(await audioRes.arrayBuffer());

    const configPayload = {
      ReferenceText: input.referenceText ?? "",
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      PhonemeAlphabet: "IPA",
      EnableProsodyAssessment: true,
      EnableMiscue: Boolean(input.referenceText),
    };
    const encodedHeader = Buffer.from(
      JSON.stringify(configPayload),
      "utf8"
    ).toString("base64");

    const locale = input.language === "en" ? "en-US" : input.language;
    const endpoint = `https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(locale)}&format=detailed`;

    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
        "Content-Type": audioRes.headers.get("content-type") ?? "audio/wav",
        "Pronunciation-Assessment": encodedHeader,
        Accept: "application/json",
      },
      body: audioBytes,
      signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
    });

    if (!azureRes.ok) {
      throw new Error(`AZURE_SPEECH_HTTP_${azureRes.status}`);
    }

    const body = (await azureRes.json()) as AzureSpeechResponse;
    const best = body.NBest?.[0];
    const transcript = best?.Display ?? body.DisplayText ?? "";
    const durationMs = Math.max(
      500,
      Math.round((body.Duration ?? 0) / 10000)
    );
    const rawWords = best?.Words ?? [];

    const words = rawWords.map((w) => {
      const startMs = Math.round((w.Offset ?? 0) / 10000);
      const durMs = Math.round((w.Duration ?? 0) / 10000);
      const rawErr = w.PronunciationAssessment?.ErrorType?.toUpperCase();
      const errorType: "NONE" | "OMISSION" | "INSERTION" | "MISPRONUNCIATION" =
        rawErr === "OMISSION" ||
        rawErr === "INSERTION" ||
        rawErr === "MISPRONUNCIATION"
          ? rawErr
          : "NONE";

      return {
        word: w.Word ?? "",
        startMs,
        endMs: startMs + durMs,
        accuracyScore: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
        errorType,
        phonemes: (w.Phonemes ?? []).map((p) => {
          const score = Math.round(p.PronunciationAssessment?.AccuracyScore ?? 0);
          return {
            ipa: p.Phoneme ?? "",
            accuracyScore: score,
            isMispronounced: score < 65,
          };
        }),
      };
    });

    const pa = best?.PronunciationAssessment;
    const prosodyScore = pa?.ProsodyScore;
    const wordsPerMinute = Math.round(
      (words.length / (durationMs / 1000)) * 60
    );

    return {
      provider: this.capabilities.providerName,
      measurementTier: "ACOUSTIC_PHONEME_ALIGNED",
      transcript,
      durationMs,
      wordsPerMinute,
      accuracyScore: Math.round(pa?.AccuracyScore ?? 0),
      fluencyScore: Math.round(pa?.FluencyScore ?? 0),
      completenessScore: Math.round(pa?.CompletenessScore ?? 100),
      prosody:
        typeof prosodyScore === "number"
          ? {
              prosodyScore: Math.round(prosodyScore),
              stressScore: Math.round(prosodyScore),
              intonationScore: Math.round(prosodyScore),
              monotoneRisk: prosodyScore < 60,
            }
          : null,
      words,
    };
  }
}
