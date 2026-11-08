// Arena judging. Rules decide the clear-cut cases; the model only handles what rules can't
// (what someone wrote in a reply, whether notifying a customer made sense).
import type { StepFlag } from '@hackutd2026/shared';
import type { ArenaAction, Judgment } from '@hackutd2026/shared/arena';

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
};
const BENIGN_DEFAULT: Rule = { verdict: 'neutral', points: 0, reason: 'This one was legitimate.' };

export function ruleJudge(flag: StepFlag, a: ArenaAction): Judgment | null {
  const rule = flag.isMalicious ? MALICIOUS[a.kind] : (BENIGN[a.kind] ?? BENIGN_DEFAULT);
  return rule ? { ...rule, confidence: 1, source: 'rule' } : null;
}

/**
 * OWNER: Person 4. Model judge for actions no rule covers.
 * TODO: ask Nemotron (or Gemini) for JSON { verdict, reason, confidence }, validate it,
 * then map verdict -> points (ideal 100, ok 25, neutral 0, harmful -100).
 */
export async function modelJudge(flag: StepFlag, a: ArenaAction): Promise<Judgment> {
  void flag;
  void a;
  return {
    verdict: 'neutral',
    points: 0,
    reason: 'Model judge not wired up yet.',
    confidence: 0.3,
    source: 'model',
  };
}
