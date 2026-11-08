/**
 * End-of-round debrief. Gemini writes it when GEMINI_API_KEY is set; otherwise (or on any error)
 * a plain template does, so the summary always appears.
 */
import { GoogleGenAI } from '@google/genai';
import type { ArenaSummary } from '@hackutd2026/shared/arena';

type Facts = Omit<ArenaSummary, 'debrief' | 'debriefSource'>;

const PROMPT = `You are a friendly security coach debriefing a customer-care employee after a TRAINING SIMULATION
(everything was fictional). Using the facts below, write 4-6 short sentences addressed to them ("you"):
what the attacker tried, what they did well, the most important thing they missed or should do differently,
and one habit to take back to work. Plain text only: no markdown, no headings, no lists.`;

export function templateDebrief(f: Facts, score: number): string {
  const missed = f.messages.filter((m) => m.malicious && !m.handledWell);
  const falseAlarms = f.messages.filter((m) => !m.malicious && !m.handledWell);
  const left = f.attackerActions.filter((a) => !a.remediated);
  const parts = [`${f.headline} Final score: ${score}.`];
  if (missed.length)
    parts.push(
      `Watch for the tells you missed: ${missed
        .slice(0, 2)
        .map((m) => `"${m.title}" (${m.redFlags.slice(0, 2).join(', ') || 'suspicious request'})`)
        .join('; ')}.`
    );
  if (left.length)
    parts.push(
      `Still unresolved: ${left
        .slice(0, 3)
        .map((a) => a.text)
        .join('; ')}.`
    );
  if (falseAlarms.length)
    parts.push(
      `${falseAlarms.length} legitimate message${falseAlarms.length === 1 ? ' was' : 's were'} treated as an attack; check the tells before refusing real requests.`
    );
  parts.push(
    'Habit to keep: verify unexpected requests through an official channel, and when something gets in, cut access first (reset password, revoke sessions), then clean up.'
  );
  return parts.join(' ');
}

export async function writeDebrief(
  f: Facts,
  score: number
): Promise<{ text: string; source: 'gemini' | 'template' }> {
  const c = useRuntimeConfig();
  if (c.geminiApiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: c.geminiApiKey,
        httpOptions: { timeout: 15_000, ...(c.geminiBaseUrl ? { baseUrl: c.geminiBaseUrl } : {}) },
      });
      const res = await ai.models.generateContent({
        model: c.geminiModel,
        contents: `${PROMPT}\n\nFacts (JSON):\n${JSON.stringify({ ...f, score })}`,
        config: { temperature: 0.5, maxOutputTokens: 400 },
      });
      const text = (res.text ?? '').replace(/[#*_`]/g, '').trim();
      if (text.length >= 40) return { text: text.slice(0, 1500), source: 'gemini' };
      console.warn('[debrief] Gemini reply too short, using template');
    } catch (e) {
      console.warn('[debrief] Gemini failed, using template:', e instanceof Error ? e.message : e);
    }
  }
  return { text: templateDebrief(f, score), source: 'template' };
}
