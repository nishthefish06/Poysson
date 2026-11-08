/**
 * End-of-round debrief. Gemini writes it when GEMINI_API_KEY is set; if Gemini is unset or fails,
 * Nemotron writes it; if that fails too, a plain template does, so the summary always appears.
 */
import { z } from 'zod';
import type { ArenaSummary, RunbookRef } from '@hackutd2026/shared/arena';

type Facts = Omit<ArenaSummary, 'debrief' | 'debriefSource' | 'runbook' | 'attackerReveal'>;

// cap on the Nemotron fallback so a slow model can't hold up the summary screen
const NEMOTRON_MS = 10_000;

const PROMPT = `You are a friendly security coach debriefing a customer-care employee after a TRAINING SIMULATION
(everything was fictional). Using the facts below, write 4-6 short sentences addressed to them ("you"):
what the attacker tried, what they did well, the most important thing they missed or should do differently,
and one habit to take back to work. Plain text only: no markdown, no headings, no lists.
Base your advice on the company runbook sections given below and cite the one you use by name and section
in parentheses, e.g. (Compromised account §2). Do not invent runbook sections or procedures.
Messages with "ignored": true were attacks the employee never acted on: that is safe, not a failure, but
reporting them would have helped Security warn others.
Only praise what the facts show they did well (a message they "handled it well", an action undone or reported);
if nothing qualifies, say so kindly instead of inventing praise.
Priorities: if any message is MISSED or anything the attacker did is STILL IN PLACE, that is the most
important thing they missed; never call an ignored message the most important miss when one was MISSED.
If a real-world pattern is listed, add one sentence saying this round mirrored it, naming the source and year
exactly as given (e.g. "This round mirrored ... (FBI IC3 PSA I-020822, 2022)."). Never invent a source.`;

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

// Gemini rejects deadlines under 10 s, so each model gets 10 s and the budget covers two of them
const PER_MODEL_MS = GEMINI_MIN_DEADLINE_MS;
const GEMINI_BUDGET_MS = 2 * PER_MODEL_MS + 2_000; // slack so a timed-out first model still leaves the fallback its full 10 s

/** Plain-language record of the round, so the coach can't credit the employee for something they missed. */
function whatHappened(f: Facts): string {
  const msgs = f.messages.map((m) => {
    const did = m.ignored ? 'never acted on it (ignored)' : m.handledWell ? 'handled it well' : 'MISSED it (handled it wrongly)';
    return `- "${m.title}" (${m.malicious ? 'attack' : 'legitimate'}): the employee ${did}`;
  });
  const acts = f.attackerActions.map((a) => `- ${a.text}: ${a.remediated ? 'undone or reported' : 'STILL IN PLACE'}`);
  return [
    `Outcome: ${f.outcome}`,
    'Messages:',
    ...(msgs.length ? msgs : ['- (none)']),
    'Attacker actions:',
    ...(acts.length ? acts : ['- (none)']),
  ].join('\n');
}

export async function writeDebrief(
  f: Facts,
  score: number,
  runbook: RunbookRef[] = [],
  basedOn: string[] = [] // real-world patterns this round mirrored (incident-playbook.ts basedOnLines)
): Promise<{ text: string; source: 'gemini' | 'nemotron' | 'template' }> {
  const deadline = Date.now() + GEMINI_BUDGET_MS; // whole Gemini budget, across fallback models
  const contents = `${PROMPT}\n\nWhat actually happened (use only this; never say the employee spotted or handled a message marked MISSED):\n${whatHappened(f)}\n\nReal-world pattern this round mirrored:\n${basedOn.map((b) => `- ${b}`).join('\n') || '(none)'}\n\nRunbook sections:\n${runbook.map((r) => `- ${r.cite}: ${r.text}`).join('\n') || '(none)'}\n\nFacts (JSON):\n${JSON.stringify({ ...f, score })}`;
  for (const model of geminiModels()) {
    const left = deadline - Date.now();
    if (left < PER_MODEL_MS) break;
    // cap each model so a slow one (504 after ~15 s) still leaves time for the fallback
    const ai = geminiClient(PER_MODEL_MS);
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
  // Gemini busy or not configured: the same model that played the attacker writes the coach's notes.
  if (nemotronEnabled()) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const out = await Promise.race([
        chatJson(
          z.object({ debrief: z.string().min(40).max(1500) }),
          `${PROMPT}\nReply with ONLY JSON: {"debrief": string}`,
          contents.slice(PROMPT.length).trim(),
          { temperature: 0.5, maxTokens: 700 }
        ),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timed out after 10 s')), NEMOTRON_MS);
        }),
      ]);
      return { text: fictionalize(out.debrief.replace(/[#*_`]/g, '').trim()), source: 'nemotron' };
    } catch (e) {
      console.warn('[debrief] Nemotron failed too, using the template:', e instanceof Error ? e.message : e);
    } finally {
      clearTimeout(timer);
    }
  }
  const mirrored = basedOn.length ? ` This round mirrored a real pattern: ${basedOn[0]}.` : '';
  return { text: templateDebrief(f, score, runbook) + mirrored, source: 'template' };
}
