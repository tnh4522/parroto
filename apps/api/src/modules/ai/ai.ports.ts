import type {
  CefrLevel,
  MeasurementTier,
  SpeechAssessmentMode,
} from "@linguacraft/contracts";
import type { ZodType, ZodTypeDef } from "zod";
import type { AssessedWord, SpokenWordSpan } from "./alignment.helper";

export const STT_PROVIDER_TOKEN = Symbol("STT_PROVIDER_TOKEN");
export const LLM_PROVIDER_TOKEN = Symbol("LLM_PROVIDER_TOKEN");
export const MODERATION_PROVIDER_TOKEN = Symbol("MODERATION_PROVIDER_TOKEN");
export const PRONUNCIATION_PROVIDER_TOKEN = Symbol(
  "PRONUNCIATION_PROVIDER_TOKEN"
);

export interface SttSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface SttTranscriptionResult {
  provider: string;
  model: string;
  text: string;
  segments: SttSegment[];
  words?: SpokenWordSpan[];
  durationSec: number;
}

export interface ISttProvider {
  transcribe(input: {
    mediaUrl: string;
    language: string;
    wordTimestamps: boolean;
  }): Promise<SttTranscriptionResult>;
}

export interface PronunciationAssessmentInput {
  audioUrl: string;
  language: string;
  mode: SpeechAssessmentMode;
  referenceText?: string;
}

export interface AcousticAssessmentOutput {
  provider: string;
  measurementTier: MeasurementTier;
  transcript: string;
  durationMs: number;
  wordsPerMinute: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosody: {
    prosodyScore: number;
    stressScore: number;
    intonationScore: number;
    monotoneRisk: boolean;
  } | null;
  words: AssessedWord[];
}

export interface IPronunciationAssessmentProvider {
  readonly capabilities: {
    providerName: string;
    supportsPhonemes: boolean;
    supportsProsody: boolean;
  };
  isConfigured(): boolean;
  assess(
    input: PronunciationAssessmentInput
  ): Promise<AcousticAssessmentOutput>;
}

export interface ILlmProvider {
  generateStructured<TOutput>(input: {
    promptKey: string;
    promptVersion: string;
    schema: ZodType<TOutput, ZodTypeDef, unknown>;
    variables: Record<string, unknown>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    provider: string;
    model: string;
    data: TOutput;
    usage: { inputTokens: number; outputTokens: number };
  }>;
}

export interface IModerationProvider {
  classifyText(text: string): Promise<{
    provider: string;
    model: string;
    flagged: boolean;
    categories: string[];
    confidence: number;
  }>;
}

export interface LessonEnrichmentPayload {
  cefrLevel: CefrLevel;
  topics: string[];
  sentences: Array<{
    startMs: number;
    endMs: number;
    text: string;
    translations: Record<string, string>;
  }>;
}
