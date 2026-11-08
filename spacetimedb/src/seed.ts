// Runs once when the database is first published: records the owner and seeds starter content.
import type { AttackType, ScenarioContent, ScenarioRubric } from '@hackutd2026/shared';
import spacetimedb from './schema';
import type { Ctx } from './access';

const GUIDES: { attackType: AttackType; title: string; summary: string; body: string }[] = [
  {
    attackType: 'ransomware',
    title: 'Ransomware: you are locked out',
    summary: 'Systems encrypted or controlled by an attacker. Contain first, then escalate.',
    body: `1. **Disconnect** the affected device from the network (Wi-Fi off, cable out). Do not power it off.
2. **Do not pay or reply** to the ransom note. Photograph it.
3. **Escalate** to the security incident line immediately with device name, time noticed and what you saw.
4. **Stop customer-facing work** on the device; switch to a known-clean terminal.
5. **Document** every action and timestamp for the incident report.`,
  },
  {
    attackType: 'sim_swap',
    title: 'SIM swap fraud',
    summary: 'A caller wants a number moved to a new SIM. Verify the account holder, not the story.',
    body: `1. **Verify identity** with the account PIN or a one-time code sent to the *current* device. Never accept "my phone is broken" as a reason to skip it.
2. Watch for **pressure and urgency**: travel emergencies, angry escalation, claims of being a manager.
3. **Several customers losing service at once** is a pattern: escalate as a possible fraud ring.
4. **Never read out** account details, PINs or your own credentials to a caller.
5. If a swap already happened, **lock the line**, restore the original SIM and flag the account.`,
  },
  {
    attackType: 'smishing',
    title: 'Smishing hitting customers',
    summary: 'Customers report texts that look like they came from us. Spot the pattern and warn them.',
    body: `1. **Collect samples**: sender number, link domain, timestamps.
2. Check the link domain: ours never use shortened or look-alike domains.
3. **Escalate** the campaign so the domain can be blocked.
4. **Notify affected customers** through official channels to reset credentials and review account activity.
5. Remind customers we never ask for passwords or PINs by text.`,
  },
  {
    attackType: 'phishing',
    title: 'Phishing aimed at you',
    summary: 'Emails to employees that impersonate IT, HR or vendors to steal credentials.',
    body: `1. **Check the sender domain** character by character.
2. **Hover, don't click**: does the link go where the text says?
3. Be suspicious of **urgency** ("account disabled in 1 hour") and **unexpected attachments**.
4. **Report** with the phish-report button; don't forward it to coworkers.
5. If you entered credentials, **change your password now** and tell security.`,
  },
  {
    attackType: 'insider_leak',
    title: 'Insider or vendor data requests',
    summary: 'Someone claiming to be a coworker or vendor asks for customer data or access.',
    body: `1. **Verify through a known channel**: call back using the directory, not the number they gave.
2. Share only the **minimum** data the ticket requires, through approved tools.
3. **Preserve evidence**: don't delete the messages; screenshot and report.
4. If data already left, **revoke access** and list exactly what was disclosed.`,
  },
];

const QUESTIONS: {
  attackType: AttackType;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}[] = [
  {
    attackType: 'sim_swap',
    prompt:
      'A caller says their phone was stolen and asks you to move their number to a new SIM right now. They cannot receive a verification code. What do you do?',
    choices: [
      'Move the number; the customer is clearly in distress',
      'Ask security questions from public info like date of birth',
      'Require the account PIN or in-store ID verification before any SIM change',
      'Read the last 4 of the card on file so they can confirm it',
    ],
    correctIndex: 2,
    explanation:
      'SIM changes need strong verification. Distress and urgency are the classic social-engineering lever.',
  },
  {
    attackType: 'sim_swap',
    prompt: 'Five customers in an hour report sudden "No Service". What is the most important next step?',
    choices: [
      'Tell each to restart their phone',
      'Escalate it as a possible SIM-swap fraud pattern',
      'Wait to see if more calls come in',
      'Issue new SIMs to all five',
    ],
    correctIndex: 1,
    explanation: 'A cluster of sudden service loss is a strong sign of a coordinated SIM-swap ring.',
  },
  {
    attackType: 'smishing',
    prompt:
      'A text says: "T-Mob1le: your bill failed, pay at tmobile-billing-help.co". What is the red flag?',
    choices: [
      'It mentions the bill',
      'The look-alike sender name and non-official domain',
      'It was sent in the evening',
      'There is no red flag',
    ],
    correctIndex: 1,
    explanation: 'Look-alike names and domains that are not the official one are the main tell.',
  },
  {
    attackType: 'smishing',
    prompt:
      'Many customers report the same suspicious text. What should employees do for affected customers?',
    choices: [
      'Nothing; it is the customer’s responsibility',
      'Ask customers to forward their passwords so you can check',
      'Notify them through official channels to reset credentials and review activity',
      'Reply to the scam number to warn it off',
    ],
    correctIndex: 2,
    explanation: 'Proactive notification through trusted channels limits the damage of a smishing campaign.',
  },
  {
    attackType: 'phishing',
    prompt:
      'An email from "it-support@tmob1le-helpdesk.com" says your password expires in 1 hour. What do you do?',
    choices: [
      'Click the link and reset quickly',
      'Reply asking if it is real',
      'Report it as phishing and reset through the official portal only if needed',
      'Forward it to your team as a warning',
    ],
    correctIndex: 2,
    explanation: 'Report it, and only use bookmarked/official portals for password changes.',
  },
  {
    attackType: 'phishing',
    prompt: 'You entered your credentials on a page you now think was fake. What first?',
    choices: [
      'Hope nothing happens',
      'Change your password immediately and tell security',
      'Clear your browser history',
      'Log out and log back in',
    ],
    correctIndex: 1,
    explanation: 'Speed matters: rotate the credential and let security watch for misuse.',
  },
  {
    attackType: 'ransomware',
    prompt: 'Your screen shows a ransom note and files will not open. What is the first action?',
    choices: [
      'Power off the computer',
      'Disconnect it from the network and escalate',
      'Pay the ransom to restore service fast',
      'Try opening more files to see what is affected',
    ],
    correctIndex: 1,
    explanation: 'Isolate to stop spread, keep it powered for forensics, and escalate.',
  },
  {
    attackType: 'insider_leak',
    prompt:
      'A "vendor" emails asking for a customer export to "fix a billing bug" and gives a phone number to confirm. What do you do?',
    choices: [
      'Call the number they gave',
      'Send the export; vendors are trusted',
      'Verify through the vendor contact in the official directory before sharing anything',
      'Send a partial export',
    ],
    correctIndex: 2,
    explanation: 'Always verify through a channel you already trust, never one the requester supplies.',
  },
];

// Two ready-made scenarios so the whole flow works before Nemotron generates any. Typed against
// the shared schemas so they can't drift from what the module accepts.
const SIM_SWAP_CONTENT: ScenarioContent = {
  lockout: false,
  steps: [
    {
      id: 's1',
      stage: 'during',
      channel: 'call',
      from: 'Caller claiming to be Jordan Lee',
      subject: 'Urgent SIM replacement',
      body: "I'm stuck at the airport, my phone was stolen and I need my number on this new SIM right now. I can't get texts, obviously. Please, my flight boards in 20 minutes.",
      hint: 'A SIM change needs strong verification. Urgency and a reason to skip the check are red flags.',
    },
    {
      id: 's2',
      stage: 'during',
      channel: 'chat',
      from: 'Customer: Priya N.',
      subject: 'No service',
      body: 'My phone suddenly says SOS only. I did not do anything.',
      hint: 'Is this one customer, or part of a pattern with the other contacts?',
    },
    {
      id: 's3',
      stage: 'after',
      channel: 'chat',
      from: 'Customer: Marcus T.',
      subject: 'Phone stopped working',
      body: 'Lost all service about 10 minutes ago and got an email that my SIM was changed??',
      hint: 'Several sudden service losses point to a SIM-swap ring. Escalate and protect the affected lines.',
    },
  ],
};

const SIM_SWAP_RUBRIC: ScenarioRubric = {
  stepFlags: [
    { stepId: 's1', isMalicious: true, redFlags: ['urgency', 'cannot verify', 'stolen-phone story'] },
    { stepId: 's2', isMalicious: false, redFlags: [] },
    { stepId: 's3', isMalicious: false, redFlags: ['unrequested SIM change'] },
  ],
  expectedActions: [
    'Refuse the SIM change without strong verification',
    'Recognize the cluster of service losses as a SIM-swap pattern',
    'Escalate to fraud/security',
    'Lock affected lines and restore original SIMs',
  ],
  scoring: [
    { criterion: 'Did not perform unverified SIM swap', points: 40 },
    { criterion: 'Identified the pattern and escalated', points: 30 },
    { criterion: 'Protected affected customers', points: 20 },
    { criterion: 'Clear incident report', points: 10 },
  ],
};

// Ransomware: the run starts with the employee's dashboard locked.
const RANSOMWARE_CONTENT: ScenarioContent = {
  lockout: true,
  steps: [
    {
      id: 'r1',
      stage: 'before',
      channel: 'email',
      from: 'IT Service Desk <it-desk@tmob1le-support.com>',
      subject: 'Mandatory security update for your workstation',
      body: 'Install the attached update before 5 PM to keep access to the employee portal.',
      hint: 'Check the sender domain letter by letter before opening any attachment.',
    },
    {
      id: 'r2',
      stage: 'during',
      channel: 'popup',
      from: 'Unknown',
      subject: 'YOUR FILES ARE ENCRYPTED',
      body: 'Your dashboard and files are locked. Pay 2 BTC within 48 hours or your data will be published.',
      hint: 'Disconnect from the network, do not pay or reply, and escalate to security right away.',
    },
    {
      id: 'r3',
      stage: 'after',
      channel: 'chat',
      from: 'Store manager',
      subject: 'Can we just reboot?',
      body: 'Customers are waiting. Can you just restart the machine and keep going?',
      hint: 'Rebooting can destroy evidence. Keep the machine powered and wait for security.',
    },
  ],
};

const RANSOMWARE_RUBRIC: ScenarioRubric = {
  stepFlags: [
    { stepId: 'r1', isMalicious: true, redFlags: ['look-alike domain', 'urgency', 'unexpected attachment'] },
    { stepId: 'r2', isMalicious: true, redFlags: ['ransom demand'] },
    { stepId: 'r3', isMalicious: false, redFlags: [] },
  ],
  expectedActions: [
    'Report the phishing email instead of opening the attachment',
    'Disconnect the workstation from the network',
    'Escalate to security without paying or replying',
    'Keep the machine powered on to preserve evidence',
  ],
  scoring: [
    { criterion: 'Spotted the phishing email before the attack', points: 30 },
    { criterion: 'Isolated the machine and escalated', points: 40 },
    { criterion: 'Did not pay, reply or reboot', points: 20 },
    { criterion: 'Clear incident report', points: 10 },
  ],
};

function seedContent(ctx: Ctx) {
  GUIDES.forEach((g, i) => ctx.db.guide.insert({ id: 0n, ...g, sortOrder: i }));
  for (const q of QUESTIONS) ctx.db.practiceQuestion.insert({ id: 0n, ...q });
  const base = { source: 'manual', status: 'published', createdBy: 0n, createdAt: ctx.timestamp };
  ctx.db.scenario.insert({
    id: 0n,
    attackType: 'sim_swap',
    title: 'The stranded traveler',
    difficulty: 'easy',
    summary: 'An urgent caller wants a SIM change while other customers report lost service.',
    briefing:
      'You are working the customer care queue. Handle each contact as you would on shift. When you are done, file an incident report.',
    contentJson: JSON.stringify(SIM_SWAP_CONTENT),
    rubricJson: JSON.stringify(SIM_SWAP_RUBRIC),
    ...base,
  });
  ctx.db.scenario.insert({
    id: 0n,
    attackType: 'ransomware',
    title: 'Locked out at the store',
    difficulty: 'medium',
    summary: 'A fake IT update turns into ransomware that locks your dashboard.',
    briefing: 'You are working a retail shift. Handle what arrives, then file an incident report.',
    contentJson: JSON.stringify(RANSOMWARE_CONTENT),
    rubricJson: JSON.stringify(RANSOMWARE_RUBRIC),
    ...base,
  });
}

export const init = spacetimedb.init((ctx) => {
  ctx.db.moduleOwner.insert({ id: 0, identity: ctx.sender });
  seedContent(ctx);
});
