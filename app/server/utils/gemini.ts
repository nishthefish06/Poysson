/**
 * Gemini client shared by the debrief and runbook search.
 * The SDK defaults to the v1 API, where the "-latest" model aliases don't exist (404), so pin v1beta.
 */
import { GoogleGenAI } from '@google/genai';

export function geminiClient(timeoutMs: number): GoogleGenAI | null {
  const c = useRuntimeConfig();
  if (!c.geminiApiKey) return null;
  return new GoogleGenAI({
    apiKey: c.geminiApiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      timeout: timeoutMs,
      ...(c.geminiBaseUrl ? { baseUrl: c.geminiBaseUrl } : {}),
    },
  });
}

/** The configured model first, then lighter ones: busy (503), rate-limited or missing models fall through. */
export function geminiModels(): string[] {
  return [
    ...new Set([useRuntimeConfig().geminiModel, 'gemini-flash-lite-latest', 'gemini-2.5-flash']),
  ].filter(Boolean);
}
