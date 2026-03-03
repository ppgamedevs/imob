import OpenAI from "openai";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";

import type { LlmTokenUsage } from "./types";

const MAX_RETRIES = 3;
const TIMEOUT_MS = 15_000;
const BACKOFF_BASE_MS = 500;

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: key, timeout: TIMEOUT_MS });
  }
  return _client;
}

export interface StructuredCallOpts {
  model?: string;
  systemPrompt: string;
  userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] | string;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
}

export interface StructuredCallResult<T> {
  data: T;
  usage: LlmTokenUsage;
}

export async function callStructured<T>(
  opts: StructuredCallOpts,
): Promise<StructuredCallResult<T> | null> {
  const client = getClient();
  if (!client) {
    logger.warn("OPENAI_API_KEY not set, skipping LLM call");
    return null;
  }

  const model = opts.model ?? "gpt-4o-mini";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: opts.systemPrompt },
          {
            role: "user",
            content: typeof opts.userContent === "string"
              ? opts.userContent
              : opts.userContent,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: opts.schemaName,
            strict: true,
            schema: opts.jsonSchema,
          },
        },
        max_tokens: opts.maxTokens ?? 2000,
        temperature: 0.1,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty LLM response");

      const parsed = JSON.parse(raw) as T;
      const usage: LlmTokenUsage = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      };

      trackUsage(model, usage).catch(() => {});

      return { data: parsed, usage };
    } catch (err: unknown) {
      const isRetryable =
        err instanceof OpenAI.APIError &&
        (err.status === 429 || err.status === 500 || err.status === 503);

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
        logger.warn({ attempt, delay, err }, "LLM call failed, retrying");
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      logger.error({ err, model, attempt }, "LLM call failed permanently");
      return null;
    }
  }
  return null;
}

async function trackUsage(model: string, usage: LlmTokenUsage): Promise<void> {
  try {
    await prisma.apiAudit.create({
      data: {
        endpoint: "openai",
        action: "llm_call",
        details: {
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
      },
    });
  } catch (err) {
    logger.warn({ err }, "Failed to track LLM usage");
  }
}
