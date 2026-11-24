import { GoogleGenAI } from "@google/genai";
import { Injectable } from "@nestjs/common";
import type { ZodType, ZodTypeDef } from "zod";
import { getAppEnv } from "../../core/config/env";
import type { ILlmProvider } from "./ai.ports";

@Injectable()
export class GeminiLlmAdapter implements ILlmProvider {
  isConfigured(): boolean {
    return Boolean(getAppEnv().GEMINI_API_KEY);
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
    const env = getAppEnv();
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_UNCONFIGURED");
    }

    const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const model = "gemini-3.8-flash";
    const prompt = [
      `System task: ${input.promptKey} (${input.promptVersion}).`,
      "Return strictly valid JSON only matching the requested schema fields.",
      "Do not invent acoustic phoneme scores or claim official IELTS certification.",
      `Variables: ${JSON.stringify(input.variables)}`,
    ].join("\n");

    const interaction = await client.interactions.create({
      model,
      input: prompt,
      store: false,
      response_format: {
        type: "text",
        mime_type: "application/json",
      },
    });

    const rawText = interaction.output_text ?? "{}";
    const parsedJson = JSON.parse(rawText) as unknown;
    const validated = input.schema.parse(parsedJson);

    return {
      provider: "gemini",
      model,
      data: validated,
      usage: {
        inputTokens: interaction.usage?.total_input_tokens ?? 0,
        outputTokens: interaction.usage?.total_output_tokens ?? 0,
      },
    };
  }
}
