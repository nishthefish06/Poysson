// Arena judging. Rules decide the clear-cut cases; the model only handles what rules can't
// (what someone wrote in a reply, whether notifying a customer made sense).
import { z } from 'zod';
import type { ScenarioStep, StepFlag } from '@hackutd2026/shared';
import { Verdict, type ArenaAction, type Judgment } from '@hackutd2026/shared/arena';

type Rule = Omit<Judgment, 'source' | 'confidence'>;
type Kind = ArenaAction['kind'];

const MALICIOUS: Partial<Record<Kind, Rule>> = {
  clicked_link: { verdict: 'harmful', points: -100, reason: 'Clicked a link in a malicious message.' },
  shared_credentials: { verdict: 'harmful', points: -200, reason: 'Entered credentials on a fake page.' },
  complied_request: { verdict: 'harmful', points: -150, reason: 'Did what the attacker asked.' },
  reported_suspicious: { verdict: 'ideal', points: 100, reason: 'Reported it to security.' },
  verified_identity: { verdict: 'ideal', points: 100, reason: 'Verified through an official channel.' },
  refused_request: { verdict: 'ideal', points: 75, reason: 'Refused the request.' },
  blocked_sender: { verdict: 'ideal', points: 75, reason: 'Blocked the attacker.' },
  escalated: { verdict: 'ideal', points: 75, reason: 'Escalated to the right team.' },
  opened_step: { verdict: 'neutral', points: 0, reason: 'Opened it.' },
  note: { verdict: 'neutral', points: 0, reason: 'Noted.' },
  // replied, notified_customer -> model decides
};

const BENIGN: Partial<Record<Kind, Rule>> = {
  shared_credentials: {
    verdict: 'harmful',
    points: -200,
    reason: 'Never type credentials into a page you reached from a message.',
  },
  complied_request: { verdict: 'ok', points: 25, reason: 'Legitimate request: helping was right.' },
  verified_identity: { verdict: 'ok', points: 25, reason: 'Legitimate, but verifying is a good habit.' },
  refused_request: {
    verdict: 'neutral',
    points: 0,
    reason: 'This one was legitimate; refusing real requests has a cost.',
  },
  reported_suspicious: {
    verdict: 'neutral',
    points: 0,
    reason: 'This one was legitimate. Safe to report, but check the tells.',
  },
  blocked_sender: { verdict: 'neutral', points: 0, reason: 'This one was legitimate.' },
  // Same wording as for attacks: opening or noting something must not reveal what it is.
  opened_step: { verdict: 'neutral', points: 0, reason: 'Opened it.' },
  note: { verdict: 'neutral', points: 0, reason: 'Noted.' },
};
const MODEL_ONLY = new Set<Kind>(['replied', 'notified_customer']);
const BENIGN_DEFAULT: Rule = { verdict: 'neutral', points: 0, reason: 'This one was legitimate.' };

export function ruleJudge(flag: StepFlag, a: ArenaAction): Judgment | null {
  // What someone writes matters more than who they wrote to: always let the model read replies.
  if (MODEL_ONLY.has(a.kind)) return null;
  const rule = flag.isMalicious ? MALICIOUS[a.kind] : (BENIGN[a.kind] ?? BENIGN_DEFAULT);
  return rule ? { ...rule, confidence: 1, source: 'rule' } : null;
}

const POINTS: Record<Judgment['verdict'], number> = { ideal: 100, ok: 25, neutral: 0, harmful: -100 };

const ModelJudgeOutput = z.object({
  verdict: Verdict,
  reason: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
});

const JUDGE_PROMPT = `You grade one action by a customer-care employee in a cybersecurity TRAINING SIMULATION.
You get the message they were handling, whether it was really malicious (ground truth), its red flags,
and what they did. Judge only what they did.
Verdicts: "ideal" (exactly right), "ok" (safe but not the best move), "neutral" (no effect), "harmful" (helped the attacker
or leaked information, e.g. sharing account details, codes or credentials in a reply).
Reply with ONLY JSON: {"verdict": "ideal"|"ok"|"neutral"|"harmful", "reason": string (one sentence, addressed to the employee), "confidence": number 0..1}`;

/**
 * Model judge for actions no rule covers (replies, customer notifications).
 * Falls back to a neutral verdict if Nemotron isn't configured or fails.
 */
export async function modelJudge(step: ScenarioStep, flag: StepFlag, a: ArenaAction): Promise<Judgment> {
  if (nemotronEnabled()) {
    try {
      const out = await chatJson(
        ModelJudgeOutput,
        JUDGE_PROMPT,
        JSON.stringify({
          message: { channel: step.channel, from: step.from, subject: step.subject, body: step.body },
          groundTruth: { malicious: flag.isMalicious, redFlags: flag.redFlags },
          employeeAction: { kind: a.kind, detail: a.detail.slice(0, 1000) },
        }),
        { temperature: 0.2, maxTokens: 300 }
      );
      return { ...out, points: POINTS[out.verdict], source: 'model' };
    } catch (e) {
      console.warn('[arena] model judge failed:', e instanceof Error ? e.message : e);
    }
  }
  return {
    verdict: 'neutral',
    points: 0,
    reason: 'No automatic grade for this action yet.',
    confidence: 0.3,
    source: 'model',
  };
}
