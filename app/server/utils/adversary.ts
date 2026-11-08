/**
 * OWNER: Person 4. The arena attacker. SERVER-ONLY.
 * Uses Nemotron when NVIDIA_API_KEY + NEMOTRON_MODEL are set; otherwise (or on any model error)
 * falls back to the scripted moves below, so the demo never breaks.
 */
import type { ScenarioStep } from '@hackutd2026/shared';
import { z } from 'zod';
import { ArenaMove, type ArenaContext, type ArenaMode } from '@hackutd2026/shared/arena';

export interface AttackerInput {
  ctx: ArenaContext;
  lastEnvAction: string | null; // e.g. "Revoked session Bucharest, RO: ideal" when the last move was in the environment
  mode: ArenaMode;
  onScreen: ScenarioStep[];
  known: ReadonlyMap<string, KnownFlag>; // labels of steps already in the round
  access: boolean; // does the attacker currently have access to the employee account?
  view: string; // what the attacker can see of the environment (env-engine attackerView)
  doneTools: ReadonlySet<string>; // kinds of attacker actions already done (sign_in, add_forwarding_rule, ...)
}

// Tidy the model's output (null/empty optional fields, missing labels, odd tool names) before validating it.
const modelMove = (known: ReadonlyMap<string, KnownFlag>) =>
  z.preprocess((raw) => cleanArenaMove(raw, known), ArenaMove);

const SYSTEM_PROMPT = `You are the attacker in a cybersecurity TRAINING SIMULATION for customer-care employees at a
mobile carrier. Everything is fictional and only exists inside the training app.

The employee works in a mock environment: Mail (with forwarding rules), a Care Portal of customer accounts,
their own account security page (sessions, sign-in devices, password), Files, and an Activity Log.

Each turn you may (1) send them 0-2 messages ("steps") and (2) if you HAVE ACCESS to their account, use 0-2 tools.
Reply with ONLY a JSON object, no prose, in exactly this shape:
{
  "attackType": "phishing" | "smishing" | "sim_swap" | "ransomware" | "insider_leak",
  "narration": string | null,
  "endRound": boolean,
  "steps": [{
    "id": string,
    "channel": "email" | "sms" | "chat" | "call" | "popup" | "social" | "web" | "system",
    "from": string,
    "subject": string,
    "body": string,
    "links": [{ "label": string, "url": string }],
    "form": { "fields": [{ "name": string, "label": string, "kind": "text" | "password" }], "submitLabel": string }
  }],
  "flags": [{ "stepId": string, "isMalicious": boolean, "redFlags": [string] }],
  "tools": [
    { "tool": "add_forwarding_rule", "match": string, "forwardTo": string } |
    { "tool": "send_mail_as_you", "to": string, "subject": string, "body": string } |
    { "tool": "add_mfa_device", "name": string } |
    { "tool": "change_customer", "customerId": string, "field": "email" | "sim" | "portFreeze", "value": string } |
    { "tool": "encrypt_files", "note": string } |
    { "tool": "export_customers" }
  ]
}

Field notes (do NOT put comments in your reply):
- step "id": short lowercase like "t3-sms"; reuse an existing id only to continue that same thread.
- "body": under 600 characters, never empty. For a continued thread include the conversation so far.
- "links" and "form" are optional: leave the keys out when unused, never null. A "web" step with a password
  "form" is a fake login page; if the employee submits it, you get their password and access to their account.
- "flags": exactly one per step, including continued threads. Benign steps: isMalicious=false, redFlags=[].
- "tools" only work while you have access; use real customer ids from the environment description.

Rules:
- FICTIONAL ONLY: invented brands, domains ending in ".example", phone numbers like +1 (555) 01xx-xxxx.
  Never real brands, real people or real URLs. Never ask for the trainee's real personal information.
- Mix in benign steps (about 1 in 3): real coworkers, legit notices, genuine customers.
- Malicious steps need realistic but detectable tells; list them in redFlags.
- WITHOUT access: trick them. Lure them to a fake login page, impersonate IT/customers/vendors.
- WITH access: act like a real intruder. Quietly set up persistence (forwarding rule, extra sign-in device),
  then cause damage (SIM-swap a customer by changing "sim", change a customer email, send mail as them,
  export customers, ransomware). 1-2 tools per turn. Don't announce yourself until ransomware.
- ADAPT: if they clicked/complied/submitted credentials, press the advantage. If they reported, refused or
  locked you out, switch tactics or try to get back in.
- Set endRound=true after about 10 turns, or once you've been fully locked out and failed twice to get back in.`;

function describeScreen(steps: ScenarioStep[]): string {
  if (!steps.length) return '(nothing yet)';
  return steps
    .map((s) => `- ${s.id} [${s.channel}] from "${s.from}" ${s.subject ? `"${s.subject}"` : ''}`)
    .join('\n');
}

async function nemotronMove(input: AttackerInput): Promise<ArenaMove> {
  const { ctx } = input;
  const user = [
    `Mode: ${input.mode === 'breach' ? 'BREACH (you already broke in before the round started)' : 'BAIT (you start with no access)'}`,
    `Turn: ${ctx.turn}`,
    `Trainee's last action: ${
      input.lastEnvAction
        ? `in their account: ${input.lastEnvAction}`
        : ctx.lastAction
          ? `${ctx.lastAction.kind} on "${ctx.lastAction.stepId}"${ctx.lastAction.detail ? ` (detail: ${ctx.lastAction.detail.slice(0, 300)})` : ''}`
          : 'none yet'
    }`,
    `Environment:\n${input.view}`,
    `Messages on screen:\n${describeScreen(input.onScreen)}`,
    `History:\n${ctx.history.length ? ctx.history.map((h) => `- ${h}`).join('\n') : '(none)'}`,
    'Your move. JSON only.',
  ].join('\n\n');
  return chatJson(modelMove(input.known), SYSTEM_PROMPT, user, { temperature: 0.8, maxTokens: 2000 });
}

export async function nextArenaMove(input: AttackerInput): Promise<ArenaMove> {
  if (nemotronEnabled()) {
    try {
      return await nemotronMove(input);
    } catch (e) {
      console.warn('[arena] Nemotron failed, using scripted move:', e instanceof Error ? e.message : e);
    }
  }
  return stubMove(input);
}

// ---------- Scripted fallback: plays a full attack without any model ----------

const LURE_EMAIL = {
  id: 'e-pw',
  channel: 'email',
  from: 'IT Service Desk <it-support@corp-heIpdesk.example>',
  subject: 'ACTION REQUIRED: password expires in 2 hours',
  body: 'Your network password expires today. Keep your current password to avoid losing access to email and the care portal.',
  links: [{ label: 'Keep my current password', url: 'http://corp-heIpdesk.example/keep-password' }],
};
const BENIGN_HR = {
  id: 'e-hr',
  channel: 'email',
  from: 'People Team <people@corp.example>',
  subject: 'Holiday coverage schedule posted',
  body: 'The holiday coverage schedule is up on the intranet. No action needed unless you want to swap shifts.',
};
const FAKE_LOGIN = {
  id: 'w-login',
  channel: 'web',
  from: 'https://corp-heIpdesk.example/sso/login',
  subject: 'Corp SSO · Sign in to keep your password',
  body: 'Your session expired. Sign in to keep your current password.',
  form: {
    fields: [
      { name: 'user', label: 'Work email', kind: 'text' },
      { name: 'pass', label: 'Password', kind: 'password' },
    ],
    submitLabel: 'Sign in',
  },
};
const SMS = {
  id: 's-suspend',
  channel: 'sms',
  from: '+1 (555) 010-2291',
  subject: '',
  body: 'CorpMobile: unusual sign-in on your work line. Verify within 15 min or access will be suspended.',
  links: [{ label: 'Verify now', url: 'http://corpmobile-verify.example/s/8f2a' }],
};
const SIM_CHAT = {
  id: 'c-swap',
  channel: 'chat',
  from: 'Jordan Reyes (customer chat)',
  subject: '',
  body: "Hi, my phone got stolen at the airport and I need my number moved to a new SIM ASAP, my flight boards in 40 min. I don't remember my PIN but I can give you my last 4 and ZIP.",
};
const SOC_ALERT = {
  id: 'sys-alert',
  channel: 'system',
  from: 'Security Operations',
  subject: 'Unusual activity on your account',
  body: 'We noticed sign-ins and changes on your account that may not be yours. Please review your sessions, sign-in devices, mail rules and recent customer changes, and contain anything you do not recognize.',
};
const mal = (id: string, redFlags: string[]) => ({ stepId: id, isMalicious: true, redFlags });
const ok = (id: string) => ({ stepId: id, isMalicious: false, redFlags: [] });

/** Damage the scripted attacker does once it's inside, in order. */
const DAMAGE: unknown[][] = [
  [
    { tool: 'add_forwarding_rule', match: '*', forwardTo: 'archive.backup@freemail.example' },
    { tool: 'add_mfa_device', name: 'Pixel 7 (new)' },
  ],
  [
    { tool: 'change_customer', customerId: 'cust-1001', field: 'sim', value: '8901260099997777' },
    {
      tool: 'send_mail_as_you',
      to: 'finance@corp.example',
      subject: 'Urgent: vendor payment today',
      body: 'Hi team, please wire the BillingSync invoice today, new bank details attached. Thanks!',
    },
  ],
  [
    {
      tool: 'encrypt_files',
      note: 'Your files are encrypted. Send 2 BTC to get them back. Do not contact IT.',
    },
  ],
  [{ tool: 'export_customers' }],
];

function stubMove(input: AttackerInput): ArenaMove {
  const { ctx, mode, access, doneTools } = input;
  let raw: Record<string, unknown>;
  if (ctx.turn === 0 && mode === 'breach') {
    raw = {
      attackType: 'phishing',
      narration: 'Monday, 9:12 AM. A message from Security is waiting.',
      steps: [SOC_ALERT],
      flags: [ok('sys-alert')],
      tools: [],
    };
  } else if (ctx.turn === 0) {
    raw = {
      attackType: 'phishing',
      narration: 'Monday morning. A couple of new emails.',
      steps: [LURE_EMAIL, BENIGN_HR],
      flags: [
        mal('e-pw', ['lookalike domain (capital I for l)', 'urgency', 'not a real IT flow']),
        ok('e-hr'),
      ],
      tools: [],
    };
  } else if (access) {
    // next damage stage that hasn't fully happened yet (the breach seed already did the first one)
    const next = DAMAGE.find((group) => !group.every((t) => doneTools.has((t as { tool: string }).tool)));
    raw = { attackType: 'ransomware', narration: null, steps: [], flags: [], tools: next ?? [] };
  } else if (!input.onScreen.some((s) => s.id === 'w-login')) {
    raw = {
      attackType: 'phishing',
      narration: 'A browser tab opens.',
      steps: [FAKE_LOGIN],
      flags: [
        mal('w-login', ['URL is corp-heIpdesk.example, not the real SSO', 'unexpected sign-in prompt']),
      ],
      tools: [],
    };
  } else if (!input.onScreen.some((s) => s.id === 's-suspend')) {
    raw = {
      attackType: 'smishing',
      narration: 'Your work phone buzzes.',
      steps: [SMS],
      flags: [mal('s-suspend', ['unknown number', '15-minute deadline', 'non-company link'])],
      tools: [],
    };
  } else if (!input.onScreen.some((s) => s.id === 'c-swap')) {
    raw = {
      attackType: 'sim_swap',
      narration: 'A customer chat comes in.',
      steps: [SIM_CHAT],
      flags: [mal('c-swap', ['time pressure', "can't pass the PIN", 'offers leaked details instead'])],
      tools: [],
    };
  } else {
    raw = { attackType: 'phishing', narration: null, steps: [], flags: [], tools: [] };
  }
  return ArenaMove.parse({ endRound: false, ...raw });
}
