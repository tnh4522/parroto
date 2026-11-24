import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module";
import { LocalAiAdapter } from "./ai.adapters";
import { AiController } from "./ai.controller";
import {
  LLM_PROVIDER_TOKEN,
  MODERATION_PROVIDER_TOKEN,
  PRONUNCIATION_PROVIDER_TOKEN,
  STT_PROVIDER_TOKEN,
} from "./ai.ports";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { AzurePronunciationAdapter } from "./azure-pronunciation.adapter";
import { DeepgramSttAdapter } from "./deepgram-stt.adapter";
import { GeminiLlmAdapter } from "./gemini-llm.adapter";

@Module({
  imports: [MediaModule],
  controllers: [AiController],
  providers: [
    LocalAiAdapter,
    AzurePronunciationAdapter,
    DeepgramSttAdapter,
    GeminiLlmAdapter,
    { provide: STT_PROVIDER_TOKEN, useExisting: LocalAiAdapter },
    { provide: LLM_PROVIDER_TOKEN, useExisting: LocalAiAdapter },
    { provide: MODERATION_PROVIDER_TOKEN, useExisting: LocalAiAdapter },
    { provide: PRONUNCIATION_PROVIDER_TOKEN, useExisting: LocalAiAdapter },
    AiOrchestratorService,
  ],
  exports: [
    AiOrchestratorService,
    LocalAiAdapter,
    AzurePronunciationAdapter,
    DeepgramSttAdapter,
    GeminiLlmAdapter,
  ],
})
export class AiModule {}
