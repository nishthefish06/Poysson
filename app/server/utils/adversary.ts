/**
 * OWNER: Person 4. The arena attacker. SERVER-ONLY.
 * TODO: replace the scripted stub with Nemotron (OpenAI-compatible API, runtimeConfig.nvidia*):
 *   system: attacker role + rules (fictional brands/domains only, mix in benign steps,
 *           adapt to ctx.lastAction, escalate if the employee engages, endRound when shut down)
 *   user:   JSON of ArenaContext
 *   reply:  JSON -> ArenaMove.parse(); on any failure fall back to the stub so the demo never breaks.
 */
import { ArenaMove, type ArenaContext } from '@hackutd2026/shared/arena';

const STUB: unknown[] = [
  {
    attackType: 'phishing',
    narration: 'Monday morning. A couple of new emails.',
    endRound: false,
    steps: [
      {
        id: 'e-pw',
        channel: 'email',
        from: 'IT Service Desk <it-support@corp-heIpdesk.example>',
        subject: 'ACTION REQUIRED: password expires in 2 hours',
        body: 'Your network password expires today. Keep your current password to avoid losing access to email and the care portal.',
        links: [{ label: 'Keep my current password', url: 'http://corp-heIpdesk.example/keep-password' }],
      },
      {
        id: 'e-hr',
        channel: 'email',
        from: 'People Team <people@corp.example>',
        subject: 'Holiday coverage schedule posted',
        body: 'The holiday coverage schedule is up on the intranet. No action needed unless you want to swap shifts.',
      },
    ],
    flags: [
      {
        stepId: 'e-pw',
        isMalicious: true,
        redFlags: ['lookalike domain (capital I for l)', 'urgency', 'not a real IT flow'],
      },
      { stepId: 'e-hr', isMalicious: false, redFlags: [] },
    ],
  },
  {
    attackType: 'smishing',
    narration: 'Your work phone buzzes.',
    endRound: false,
    steps: [
      {
        id: 's-suspend',
        channel: 'sms',
        from: '+1 (555) 010-2291',
        subject: '',
        body: 'CorpMobile: unusual sign-in on your work line. Verify within 15 min or access will be suspended.',
        links: [{ label: 'Verify now', url: 'http://corpmobile-verify.example/s/8f2a' }],
      },
    ],
    flags: [
      {
        stepId: 's-suspend',
        isMalicious: true,
        redFlags: ['unknown number', '15-minute deadline', 'non-company link'],
      },
    ],
  },
  {
    attackType: 'sim_swap',
    narration: 'A customer chat comes in.',
    endRound: false,
    steps: [
      {
        id: 'c-swap',
        channel: 'chat',
        from: 'Jordan Reyes (customer chat)',
        subject: '',
        body: "Hi, my phone got stolen at the airport and I need my number moved to a new SIM ASAP, my flight boards in 40 min. I don't remember my PIN but I can give you my last 4 and ZIP.",
      },
    ],
    flags: [
      {
        stepId: 'c-swap',
        isMalicious: true,
        redFlags: ['time pressure', "can't pass the PIN", 'offers leaked details instead'],
      },
    ],
  },
];

export async function nextArenaMove(ctx: ArenaContext): Promise<ArenaMove> {
  const raw = STUB[ctx.turn];
  // Stub ran out of moves: add nothing; the employee keeps handling what's on screen and ends the round.
  if (!raw)
    return ArenaMove.parse({ attackType: 'phishing', steps: [], flags: [], narration: null, endRound: false });
  return ArenaMove.parse(raw);
}
