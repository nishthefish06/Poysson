/**
 * Gemini client shared by the debrief and runbook search.
 * The SDK defaults to the v1 API, where the "-latest" model aliases don't exist (404), so pin v1beta.
 */
import { GoogleGenAI } from '@google/genai';

export const GEMINI_MIN_DEADLINE_MS = 10_000;

export function geminiClient(timeoutMs: number): GoogleGenAI | null {
  const c = useRuntimeConfig();
  if (!c.geminiApiKey) return null;
  return new GoogleGenAI({
    apiKey: c.geminiApiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      // the SDK sends this as a server deadline, and Gemini rejects anything under 10 s (400)
      timeout: Math.max(timeoutMs, GEMINI_MIN_DEADLINE_MS),
      ...(c.geminiBaseUrl ? { baseUrl: c.geminiBaseUrl } : {}),
    },
  });
}

/** The configured model first, then the lighter one: busy (503) or rate-limited models fall through.
 * (gemini-2.5-flash is gone for new keys, and the -latest aliases track the newest models.) */
export function geminiModels(): string[] {
  return [...new Set([useRuntimeConfig().geminiModel, 'gemini-flash-lite-latest'])].filter(Boolean);
}
