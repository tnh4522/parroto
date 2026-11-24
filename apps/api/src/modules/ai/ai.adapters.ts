import { Injectable } from "@nestjs/common";
import type { ZodType, ZodTypeDef } from "zod";
import { alignSpokenWordsToReference } from "./alignment.helper";
import type {
  AcousticAssessmentOutput,
  ILlmProvider,
  IModerationProvider,
  IPronunciationAssessmentProvider,
  ISttProvider,
  PronunciationAssessmentInput,
  SttTranscriptionResult,
} from "./ai.ports";

const BLOCKED_TERMS = [
  "buy cheap followers",
  "malware.example",
  "hate-slur-placeholder",
] as const;

@Injectable()
export class LocalAiAdapter
  implements
    ISttProvider,
    ILlmProvider,
    IModerationProvider,
    IPronunciationAssessmentProvider
{
  readonly capabilities = {
    providerName: "local_word_aligner",
    supportsPhonemes: false,
    supportsProsody: false,
  };

  isConfigured(): boolean {
    return true;
  }

  async transcribe(input: {
    mediaUrl: string;
    language: string;
    wordTimestamps: boolean;
  }): Promise<SttTranscriptionResult> {
    const sampleText = `Transcribed practice segment (${input.language}).`;
    return {
      provider: "whisper_local",
      model: "whisper-base.en",
      text: sampleText,
      segments: [
        {
          startMs: 0,
          endMs: 2800,
          text: sampleText,
        },
      ],
      words: sampleText.split(/\s+/).map((word, idx) => ({
        word,
        startMs: idx * 500,
        endMs: idx * 500 + 420,
        confidence: 0.9,
      })),
      durationSec: 3,
    };
  }

  async assess(
    input: PronunciationAssessmentInput
  ): Promise<AcousticAssessmentOutput> {
    const stt = await this.transcribe({
      mediaUrl: input.audioUrl,
      language: input.language,
      wordTimestamps: true,
    });
    const aligned = alignSpokenWordsToReference(
      input.referenceText,
      stt.words ?? [],
      stt.durationSec * 1000
    );

    return {
      provider: this.capabilities.providerName,
      measurementTier: "TRANSCRIPT_COMPARISON_ONLY",
      transcript: stt.text,
      durationMs: stt.durationSec * 1000,
      wordsPerMinute: aligned.wordsPerMinute,
      accuracyScore: aligned.accuracyScore,
      fluencyScore: aligned.fluencyScore,
      completenessScore: aligned.completenessScore,
      prosody: null,
      words: aligned.words,
    };
  }

  async generateStructured<TOutput>(input: {
    promptKey: string;
    promptVersion: string;
    schema: ZodType<TOutput, ZodTypeDef, unknown>;
    variables: Record<string, unknown>;
  }): Promise<{
    provider: string;
    model: string;
    data: TOutput;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    let rawCandidate: unknown = input.variables;

    if (input.promptKey === "lesson_enrich_v1") {
      rawCandidate = {
        cefrLevel: "B1",
        topics: ["daily-life"],
        sentences: [
          {
            startMs: 0,
            endMs: 3000,
            text: String(
              input.variables.rawText ?? "Welcome to your imported English lesson."
            ),
            translations: {
              vi: "Chào mừng bạn đến với bài học tiếng Anh vừa nhập.",
            },
          },
        ],
      };
    } else if (input.promptKey === "vocab_explain_v1") {
      const word = String(input.variables.word ?? "resilient");
      const cefrLevel = String(input.variables.cefrLevel ?? "B1");
      rawCandidate = {
        schemaVersion: "1.0",
        word,
        cefrLevel,
        partOfSpeech: "adjective",
        simpleDefinition: `Clear learner definition for "${word}" tailored to ${cefrLevel} study.`,
        nuanceNote: "Commonly used in spoken and academic writing contexts.",
        collocations: [`highly ${word}`, `increasingly ${word}`],
        examples: [
          {
            sentence:
              typeof input.variables.contextSentence === "string" &&
              input.variables.contextSentence.trim().length > 0
                ? input.variables.contextSentence
                : `Learners stayed ${word} throughout exam preparation.`,
            context: "Everyday / Exam Prep",
          },
        ],
      };
    } else if (input.promptKey === "toeic_explain_v1") {
      const correct = String(input.variables.correctAnswer ?? "A");
      const options = Array.isArray(input.variables.options)
        ? (input.variables.options as string[])
        : [];
      rawCandidate = {
        schemaVersion: "1.0",
        provider: "local_rule_llm",
        summary: `Dialogue review for question: ${String(
          input.variables.questionPrompt ?? ""
        ).slice(0, 120)}`,
        whyCorrect: `Option "${correct}" directly aligns with the stated facts in the listening transcript.`,
        distractorBreakdown: options
          .filter((opt) => opt !== correct)
          .map((opt) => ({
            option: opt,
            reason: "Partially echoes keywords from the audio without answering the prompt question.",
          })),
        keyVocabulary: [
          {
            term: "schedule adjustment",
            meaning: "a change to a planned meeting or event time",
            example: "The coordinator announced a brief schedule adjustment.",
          },
        ],
      };
    } else if (input.promptKey === "speech_coaching_v1") {
      const mode = String(input.variables.mode ?? "SHADOWING");
      const wpm = Number(input.variables.wordsPerMinute ?? 120);
      const ieltsPart =
        typeof input.variables.ieltsPart === "number"
          ? input.variables.ieltsPart
          : 2;

      rawCandidate = {
        disclaimer:
          "Pedagogical AI coaching based on transcript and measured speech rate; not an official exam score.",
        fluencyNotes: [
          `Measured speech rate is ${wpm} words per minute. Aim for natural 120–160 WPM pauses between clauses.`,
        ],
        intonationGuidance: [
          "Emphasize content nouns and main verbs cleanly, with falling pitch on completed statements.",
        ],
        grammarCorrections: [],
        ieltsCoaching:
          mode === "IELTS_SPEAKING"
            ? {
                part: ieltsPart === 1 || ieltsPart === 3 ? ieltsPart : 2,
                estimatedBandRange: "6.0 - 7.0",
                isOfficialScore: false,
                criteria: {
                  fluencyAndCoherence: {
                    comment: "Response maintains topic continuity across sentences.",
                    strengths: ["Clear main idea development"],
                    improvements: ["Use discourse markers to link supporting reasons"],
                  },
                  lexicalResource: {
                    comment: "Adequate everyday vocabulary for general discussion.",
                    upgradedPhrases: ["consequently", "a notable shift"],
                  },
                  grammaticalRange: {
                    comment: "Mostly accurate simple and compound clause structures.",
                    corrections: [],
                  },
                  pronunciationGuidance: {
                    comment:
                      "Practice sentence-level stress contrasts; acoustic phoneme scoring requires an acoustic phoneme engine.",
                  },
                },
              }
            : null,
        toeicCoaching:
          mode === "TOEIC_SPEAKING"
            ? {
                taskType: "TOEIC Speaking Practice",
                relevanceCheck: "Response addresses the prompt directly.",
                deliveryFeedback: [
                  "Maintain even cadence across multi-clause answers within the response timer.",
                ],
                suggestedResponse:
                  "Keep a concise topic sentence followed by two concrete supporting reasons.",
              }
            : null,
      };
    }

    const validated = input.schema.parse(rawCandidate);
    return {
      provider: "local_rule_llm",
      model: "deterministic-v1",
      data: validated,
      usage: { inputTokens: 64, outputTokens: 96 },
    };
  }

  async classifyText(text: string): Promise<{
    provider: string;
    model: string;
    flagged: boolean;
    categories: string[];
    confidence: number;
  }> {
    const lower = text.toLowerCase();
    const matched = BLOCKED_TERMS.filter((term) => lower.includes(term));
    return {
      provider: "rule_moderation",
      model: "moderation-rules-v1",
      flagged: matched.length > 0,
      categories: matched.length > 0 ? ["policy_violation"] : [],
      confidence: matched.length > 0 ? 0.99 : 0.01,
    };
  }
}
