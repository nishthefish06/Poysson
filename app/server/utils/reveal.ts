/**
 * "The attacker explains itself": after the round, Nemotron (the same model that played the
 * attacker) tells the employee how it played them, from the move history this round recorded.
 * Falls back to a short scripted reveal built from the same facts.
 */
import { z } from 'zod';
import type { ArenaSummary } from '@hackutd2026/shared/arena';

type Facts = Omit<ArenaSummary, 'debrief' | 'debriefSource' | 'runbook' | 'attackerReveal'>;
type Reveal = NonNullable<ArenaSummary['attackerReveal']>;

const RevealOutput = z.object({ reveal: z.string().min(60).max(1400) });

const REVEAL_PROMPT = `You were the attacker in a cybersecurity TRAINING SIMULATION for mobile-carrier employees.
The round is over. Speak to the employee as the attacker, in the first person, in 3 to 5 sentences:
1. which lure you chose first and why you expected it to work on them,
2. how you adapted to one specific thing they did (name it),
3. what you did or were about to do next, and
4. the one habit that would have stopped you.
Stay inside the fiction: fictional company, ".example" domains only, no real brands or people, and no
step-by-step technique a real attacker could reuse. Plain text, no markdown.
Reply with ONLY JSON: {"reveal": string}`;

export function templateReveal(f: Facts, mode: 'bait' | 'breach' = 'bait'): string {
  const first = f.messages.find((m) => m.malicious);
  const fell = f.messages.find((m) => m.malicious && !m.handledWell && !m.ignored);
  // the action log is written about the attacker ("Added their own sign-in device"): make it first person
  const did = f.attackerActions.map(
    (a) => a.text.charAt(0).toLowerCase() + a.text.slice(1).replace(/\btheir own\b/g, 'my own')
  );
  const parts: string[] = [];
  if (mode === 'breach')
    parts.push('I was already inside before your shift started: one reused password was all it took.');
  else
    parts.push(
      first
        ? `I opened with "${first.title}" because urgent account messages get clicked before they get read.`
        : 'I kept my first moves quiet and waited for an opening.'
    );
  if (fell) parts.push(`"${fell.title}" worked on you, and that was my way in.`);
  else if (f.messages.some((m) => m.malicious && m.handledWell))
    parts.push('You reported my lure, so I had to switch channels and try again.');
  if (did.length)
    parts.push(
      `${mode === 'breach' ? 'From there' : 'Once inside'}, I ${did.slice(0, 3).join(', then I ')}.`
    );
  parts.push(
    f.outcome === 'compromised'
      ? 'Some of that is still in place, so I can come back.'
      : 'Verify through an official channel and report early: that is what shuts me out.'
  );
  return parts.join(' ');
}

export async function writeReveal(r: ArenaRound, f: Facts): Promise<Reveal> {
  if (nemotronEnabled() && r.attackerLive) {
    try {
      const user = [
        `Mode: ${r.mode}. Outcome: ${f.outcome}.`,
        `Your moves and what the employee did, in order:\n${r.history
          .slice(-40)
          .map((h) => `- ${h}`)
          .join('\n')}`,
        `Messages (revealed): ${JSON.stringify(f.messages.map(({ title, malicious, handledWell, ignored }) => ({ title, malicious, handledWell, ignored })))}`,
        `What you did inside their account: ${JSON.stringify(f.attackerActions)}`,
        'Your reveal. JSON only.',
      ].join('\n\n');
      const out = await chatJson(RevealOutput, REVEAL_PROMPT, user, { temperature: 0.7, maxTokens: 600 });
      return { text: fictionalize(out.reveal.replace(/[#*_`]/g, '').trim()), source: 'nemotron' };
    } catch (e) {
      console.warn('[reveal] Nemotron failed, using template:', e instanceof Error ? e.message : e);
    }
  }
  return { text: templateReveal(f, r.mode), source: 'template' };
}
