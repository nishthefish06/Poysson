/**
 * Nemotron via NVIDIA's OpenAI-compatible API (build.nvidia.com). SERVER-ONLY.
 * chatJson() asks for JSON, extracts it (json-extract.ts), validates it with zod, and retries once
 * with the validation error so the model can fix it. Network/API errors are NOT retried: they throw
 * straight away so callers can fall back quickly.
 */
import OpenAI from 'openai';
import type { ZodType } from 'zod';
import { describeIssues } from '@hackutd2026/shared';
import { extractJson } from './json-extract';

let client: OpenAI | null = null;

export function nemotronEnabled(): boolean {
  const c = useRuntimeConfig();
  return Boolean(c.nvidiaApiKey && c.nemotronModel);
}

function getClient(): OpenAI {
  const c = useRuntimeConfig();
  client ??= new OpenAI({ apiKey: c.nvidiaApiKey, baseURL: c.nvidiaBaseUrl, timeout: 20_000, maxRetries: 0 });
  return client;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export async function chatJson<T>(
  schema: ZodType<T>,
  system: string,
  user: string,
  opts: ChatOptions = {}
): Promise<T> {
  const model = useRuntimeConfig().nemotronModel;
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    // Nemotron 3.x are reasoning models: with thinking on, the reasoning eats the token budget
    // and slows every turn. Turn it off (NEMOTRON_THINKING=1 to re-enable).
    const params = {
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
      chat_template_kwargs: { enable_thinking: useRuntimeConfig().nemotronThinking === '1' },
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
    const res = await getClient().chat.completions.create(params);
    const msg = res.choices[0]?.message as
      (OpenAI.Chat.ChatCompletionMessage & { reasoning_content?: string | null }) | undefined;
    // Some reasoning models put everything in reasoning_content; fall back to it if content is empty.
    const text = msg?.content || msg?.reasoning_content || '';
    try {
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastError = describeIssues(parsed.error);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    console.warn(
      `[nemotron] attempt ${attempt + 1} invalid (${lastError}). Reply started: ${JSON.stringify(text.slice(0, 200))}`
    );
    // one retry: show the model its own output and what was wrong
    messages.push(
      { role: 'assistant', content: text || '(empty reply)' },
      { role: 'user', content: `That was invalid: ${lastError}. Reply with ONLY the corrected JSON object.` }
    );
  }
  throw new Error(`Nemotron returned invalid JSON: ${lastError}`);
}
