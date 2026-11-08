/**
 * End-of-round debrief. Gemini writes it when GEMINI_API_KEY is set; otherwise (or on any error)
 * a plain template does, so the summary always appears.
 */
import type { ArenaSummary, RunbookRef } from '@hackutd2026/shared/arena';

type Facts = Omit<ArenaSummary, 'debrief' | 'debriefSource' | 'runbook' | 'attackerReveal'>;

const PROMPT = `You are a friendly security coach debriefing a customer-care employee after a TRAINING SIMULATION
(everything was fictional). Using the facts below, write 4-6 short sentences addressed to them ("you"):
what the attacker tried, what they did well, the most important thing they missed or should do differently,
and one habit to take back to work. Plain text only: no markdown, no headings, no lists.
Base your advice on the company runbook sections given below and cite the one you use by name and section
in parentheses, e.g. (Compromised account §2). Do not invent runbook sections or procedures.
Messages with "ignored": true were attacks the employee never acted on: that is safe, not a failure, but
reporting them would have helped Security warn others.`;

export function templateDebrief(f: Facts, score: number, runbook: RunbookRef[] = []): string {
  const missed = f.messages.filter((m) => m.malicious && !m.handledWell && !m.ignored);
  const ignored = f.messages.filter((m) => m.ignored);
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
  if (ignored.length)
    parts.push(
      `${ignored.length} attack message${ignored.length === 1 ? ' was' : 's were'} left alone: safe, but reporting ${ignored.length === 1 ? 'it' : 'them'} lets Security warn everyone else.`
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
  const top = runbook[0];
  if (top) parts.push(`From the runbook (${top.cite}): ${firstSentence(top.text)}`);
  else
    parts.push(
      'Habit to keep: verify unexpected requests through an official channel, and when something gets in, cut access first (reset password, revoke sessions), then clean up.'
    );
  return parts.join(' ');
}

function firstSentence(t: string): string {
  const m = t.match(/^.+?[.!?](\s|$)/);
  return (m ? m[0] : t).trim();
}

const PER_MODEL_MS = 6_000;

export async function writeDebrief(
  f: Facts,
  score: number,
  runbook: RunbookRef[] = []
): Promise<{ text: string; source: 'gemini' | 'template' }> {
  const deadline = Date.now() + 15_000; // whole debrief budget, across fallback models
  const contents = `${PROMPT}\n\nRunbook sections:\n${runbook.map((r) => `- ${r.cite}: ${r.text}`).join('\n') || '(none)'}\n\nFacts (JSON):\n${JSON.stringify({ ...f, score })}`;
  for (const model of geminiModels()) {
    const left = deadline - Date.now();
    if (left < 1_500) break;
    // cap each model so a slow one (504 after ~15 s) still leaves time for the fallbacks
    const ai = geminiClient(Math.min(left, PER_MODEL_MS));
    if (!ai) break; // no key
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: { temperature: 0.5, maxOutputTokens: 1000 },
      });
      const text = (res.text ?? '').replace(/[#*_`]/g, '').trim();
      if (text.length >= 40) return { text: text.slice(0, 1500), source: 'gemini' };
      console.warn(`[debrief] ${model}: reply too short, trying the next model`);
    } catch (e) {
      console.warn(`[debrief] ${model} failed:`, e instanceof Error ? e.message.slice(0, 200) : e);
    }
  }
  return { text: templateDebrief(f, score, runbook), source: 'template' };
}
