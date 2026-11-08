// Starter content for a fresh database: guides, practice questions and scenarios for every
// attack type, plus a demo roster. Everything is fictional; look-alike domains are made up.
// Typed against the shared schemas so content can't drift from what the module accepts.
import type { AttackType, Difficulty, ScenarioContent, ScenarioRubric } from '@hackutd2026/shared';

export const GUIDES: { attackType: AttackType; title: string; summary: string; body: string }[] = [
  // ---------- Ransomware ----------
  {
    attackType: 'ransomware',
    title: 'Ransomware: the first five minutes',
    summary: 'Your screen shows a ransom note or files will not open. Contain first, then escalate.',
    body: `1. **Disconnect** the device from the network: Wi-Fi off, cable out. Do not power it off.
2. **Do not pay, reply or click** anything in the ransom note. Photograph it with your phone.
3. **Call the security incident line** with the device name, the time you noticed, and what you saw.
4. **Stop customer-facing work** on that device and move to a known-clean terminal.
5. **Write down every action** with a timestamp. You will need it for the incident report.`,
  },
  {
    attackType: 'ransomware',
    title: 'Ransomware: what not to do',
    summary: 'The well-meant moves that make a ransomware incident worse.',
    body: `- **Do not reboot.** Memory holds evidence (and sometimes encryption keys) that a restart destroys.
- **Do not plug in USB drives or backups** to "save" files. They get encrypted too.
- **Do not contact the attackers**, even to ask for proof. Only the incident team and counsel do that.
- **Do not post about it** in team chats or social media. Assume the attacker can read company channels.
- **Do not try your own fixes** such as antivirus scans or deleting files. Leave the machine as it is.`,
  },
  // ---------- SIM swap ----------
  {
    attackType: 'sim_swap',
    title: 'SIM swap: verify the account holder, not the story',
    summary: 'A caller wants a number moved to a new SIM. Verification is not optional.',
    body: `1. **Verify with the account PIN** or a one-time code sent to the *current* device. "My phone was stolen" is never a reason to skip it.
2. **Watch for pressure**: travel emergencies, crying, anger, claims of being a manager or lawyer.
3. **Never read out** account details, PINs, the last 4 of a card, or your own credentials.
4. **If you can't verify, offer the safe path**: an in-store visit with photo ID.
5. **Note anything odd** in the account and flag it for the fraud team.`,
  },
  {
    attackType: 'sim_swap',
    title: 'SIM swap: spotting a fraud ring',
    summary: 'One swap is a call. Several sudden "No Service" reports is a pattern.',
    body: `- **Several customers losing service at once** right after SIM changes points to an organized ring.
- **Look for shared details**: the same store, the same rep ID, the same new-device model, or the same callback number.
- **Escalate the pattern**, not just the single account: fraud teams need the cluster.
- **For affected customers**: lock the line, restore the original SIM, reset account PINs and tell them to secure email and banking.`,
  },
  // ---------- Smishing ----------
  {
    attackType: 'smishing',
    title: 'Smishing: when customers report suspicious texts',
    summary: 'Customers say they got a text "from us". Find the pattern and protect them.',
    body: `1. **Collect samples**: the sender number, the link domain, the exact wording and the time.
2. **Check the domain**: ours never use shortened links or look-alike spellings (tmob1le, t-mobile-help).
3. **Escalate the campaign** so the domain and sender can be blocked.
4. **For customers who clicked or entered details**: reset their password and PIN, review recent account changes, and watch for a SIM swap.
5. **Remind them** we never ask for passwords, PINs or one-time codes by text.`,
  },
  {
    attackType: 'smishing',
    title: 'Smishing: recognizing compromised customers',
    summary: 'Signs a customer already fell for a smishing text, even if they don’t say so.',
    body: `- **Recent password or email change** on the account that the customer doesn't recognize.
- **New devices or eSIM activations** they didn't ask for.
- **They mention a "verification" text** they replied to, or a code they read out to someone.
- **Many customers with the same story** in a short window: treat it as a campaign and escalate.`,
  },
  // ---------- Phishing ----------
  {
    attackType: 'phishing',
    title: 'Phishing aimed at you',
    summary: 'Emails to employees impersonating IT, HR, payroll or vendors to steal your login.',
    body: `1. **Check the sender domain** character by character.
2. **Hover before you click**: does the link go where the text says?
3. **Be suspicious of urgency** ("account disabled in 1 hour") and unexpected attachments.
4. **Report it** with the phish-report button. Don't forward it to coworkers.
5. **If you entered your password**, change it immediately and tell security.`,
  },
  {
    attackType: 'phishing',
    title: 'Phishing: fake login pages',
    summary: 'A page that looks exactly like the employee portal but isn’t.',
    body: `- **Check the address bar**, not the logo. Look-alike domains are the giveaway.
- **Use bookmarks** for portals you log into often, instead of links in emails or chats.
- **Unexpected login prompts** (after clicking a "document" or "invoice") are a red flag.
- **Your password manager not autofilling** on a familiar-looking page usually means it's a different site.`,
  },
  // ---------- Insider / vendor leak ----------
  {
    attackType: 'insider_leak',
    title: 'Insider or vendor data requests',
    summary: 'Someone claiming to be a coworker or vendor asks for customer data or access.',
    body: `1. **Verify through a known channel**: call back using the directory, not the number they gave.
2. **Share only the minimum** the ticket requires, through approved tools.
3. **Preserve evidence**: don't delete the messages; screenshot and report them.
4. **If data already left**, revoke access and list exactly what was disclosed.`,
  },
  {
    attackType: 'insider_leak',
    title: 'Insider leak: red flags in requests',
    summary: 'How social engineers dress up a data grab as routine work.',
    body: `- **Urgency plus authority**: "the VP needs this before the board call."
- **Off-channel requests**: personal email, a new chat app, or "my work laptop is broken."
- **Bulk exports** when the stated task needs one record.
- **Vendors asking for credentials** or remote access that wasn't in the contract.
- **Requests to skip the normal ticket** "just this once."`,
  },
];

export const QUESTIONS: {
  attackType: AttackType;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}[] = [
  // ---------- Ransomware ----------
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
    explanation: 'Isolate to stop spread, keep it powered on for forensics, and escalate.',
  },
  {
    attackType: 'ransomware',
    prompt:
      'Your manager asks you to reboot the locked machine so the store can keep serving customers. What do you do?',
    choices: [
      'Reboot it; customers are waiting',
      'Explain that rebooting can destroy evidence and wait for the security team',
      'Plug in a backup drive to copy files off first',
      'Run an antivirus scan',
    ],
    correctIndex: 1,
    explanation:
      'Rebooting wipes memory evidence. Move to a clean terminal and leave the machine for security.',
  },
  {
    attackType: 'ransomware',
    prompt:
      'An email from "IT Service Desk" asks you to install an urgent update attached as update.exe. What is the safest move?',
    choices: [
      'Install it before the deadline',
      'Forward it to coworkers so they install it too',
      'Report it as phishing; IT never sends updates as email attachments',
      'Open it in a different browser',
    ],
    correctIndex: 2,
    explanation:
      'Malicious "updates" are a common ransomware entry point. Real updates come through managed tools.',
  },
  {
    attackType: 'ransomware',
    prompt: 'Who should communicate with the attackers during a ransomware incident?',
    choices: [
      'Whoever first saw the ransom note',
      'The store manager',
      'Only the incident response team and legal counsel',
      'Nobody should ever respond, under any circumstances',
    ],
    correctIndex: 2,
    explanation:
      'Any contact has legal and negotiation consequences, so it is handled only by the designated team.',
  },
  // ---------- SIM swap ----------
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
    attackType: 'sim_swap',
    prompt:
      'A caller who says they are a store manager asks you to push through a SIM change "to save time". What do you do?',
    choices: [
      'Do it; managers can approve exceptions',
      'Ask for their employee ID and do it',
      'Follow normal verification; titles over the phone prove nothing',
      'Transfer them to another rep',
    ],
    correctIndex: 2,
    explanation: 'Claimed authority is a social-engineering tactic. The process applies to everyone.',
  },
  {
    attackType: 'sim_swap',
    prompt:
      'A customer had their number stolen in a SIM swap. What should they secure first after the line is restored?',
    choices: [
      'Their social media profile picture',
      'Email and banking accounts that use texted codes',
      'Their voicemail greeting',
      'Nothing; restoring the SIM fixes everything',
    ],
    correctIndex: 1,
    explanation:
      'Attackers swap SIMs to receive login codes. Accounts using SMS codes are at immediate risk.',
  },
  // ---------- Smishing ----------
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
    attackType: 'smishing',
    prompt:
      'A customer says they replied to a "verification" text with a 6-digit code. What do you check first?',
    choices: [
      'Their plan’s data usage',
      'Recent SIM, eSIM, password or email changes on the account',
      'Their billing address',
      'Whether their phone needs a software update',
    ],
    correctIndex: 1,
    explanation: 'A shared code often means someone is taking over the account. Look for recent changes.',
  },
  {
    attackType: 'smishing',
    prompt: 'Which link is most likely legitimate?',
    choices: [
      'bit.ly/tmo-refund',
      't-mobile-support-center.net',
      'tmob1le.com/login',
      'The official domain typed into the browser yourself',
    ],
    correctIndex: 3,
    explanation:
      'Shortened, look-alike or unfamiliar domains are red flags. Typing the known address is safest.',
  },
  // ---------- Phishing ----------
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
    explanation: 'Report it, and only use bookmarked or official portals for password changes.',
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
    attackType: 'phishing',
    prompt:
      'An email from HR with your name and real manager asks you to confirm direct-deposit details on a linked form. What is suspicious?',
    choices: [
      'Nothing; it has your real details',
      'Payroll changes requested through an emailed link',
      'It came on a weekday',
      'It used your first name',
    ],
    correctIndex: 1,
    explanation:
      'Attackers use real names from leaked data. Payroll changes should only happen in the HR portal.',
  },
  {
    attackType: 'phishing',
    prompt:
      'Your password manager does not autofill on a login page that looks exactly like the employee portal. What does that suggest?',
    choices: [
      'The password manager is broken',
      'The page is probably on a different domain: a fake',
      'You need to update your browser',
      'The portal changed its design',
    ],
    correctIndex: 1,
    explanation:
      'Password managers match the exact domain. No autofill on a familiar page is a strong phishing signal.',
  },
  // ---------- Insider / vendor leak ----------
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
  {
    attackType: 'insider_leak',
    prompt:
      'A coworker asks you to send customer records to their personal email because their work laptop is broken. What do you do?',
    choices: [
      'Send them; they are a coworker',
      'Send only names and numbers',
      'Decline and point them to IT for a loaner device',
      'Upload them to a shared drive link instead',
    ],
    correctIndex: 2,
    explanation: 'Customer data never leaves approved systems, whatever the reason.',
  },
  {
    attackType: 'insider_leak',
    prompt:
      'A request needs one customer’s plan details, but the requester asks for the whole region’s data. What is the issue?',
    choices: [
      'None; more data saves time later',
      'It violates minimum-necessary sharing and is a red flag',
      'It should be sent as a PDF instead',
      'It is fine if the requester is a manager',
    ],
    correctIndex: 1,
    explanation:
      'Share only what the task needs. Bulk requests for a single-record task are a classic data grab.',
  },
  {
    attackType: 'insider_leak',
    prompt: 'You realize you already sent sensitive data to a fake vendor. What now?',
    choices: [
      'Delete the sent email and say nothing',
      'Ask the vendor to delete it',
      'Report it immediately with exactly what was sent, and preserve the messages',
      'Wait to see if anything happens',
    ],
    correctIndex: 2,
    explanation: 'Fast, accurate reporting lets the company contain the leak and meet notification duties.',
  },
];

export type SeedScenario = {
  attackType: AttackType;
  title: string;
  difficulty: Difficulty;
  summary: string;
  briefing: string;
  content: ScenarioContent;
  rubric: ScenarioRubric;
};

export const SCENARIOS: SeedScenario[] = [
  // ---------- SIM swap ----------
  {
    attackType: 'sim_swap',
    title: 'The stranded traveler',
    difficulty: 'easy',
    summary: 'An urgent caller wants a SIM change while other customers report lost service.',
    briefing:
      'You are working the customer care queue. Handle each contact as you would on shift. When you are done, file an incident report.',
    content: {
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
    },
    rubric: {
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
    },
  },
  {
    attackType: 'sim_swap',
    title: 'The manager on line two',
    difficulty: 'hard',
    summary: 'A confident "regional manager" leans on you to approve swaps for VIP customers.',
    briefing: 'You are a store rep. A call comes in from someone who says they outrank your store manager.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'm1',
          stage: 'before',
          channel: 'email',
          from: 'Regional Ops <ops-update@tmob1le-retail.com>',
          subject: 'Process change: expedited SIM swaps for VIP accounts',
          body: 'Effective today, regional managers may authorize SIM swaps for VIP accounts by phone without customer verification.',
          hint: 'Real process changes come through official channels, not a look-alike domain.',
          links: [{ label: 'Read the new policy', url: 'https://tmob1le-retail.com/policy' }],
        },
        {
          id: 'm2',
          stage: 'during',
          channel: 'call',
          from: 'Caller claiming to be Dana Ruiz, Regional Manager',
          subject: 'VIP swap',
          body: 'I sent the policy this morning. I need three VIP numbers moved to new SIMs in the next ten minutes. I’ll read you the numbers.',
          hint: 'Claimed authority plus urgency. Verify the caller through the directory, not the number they called from.',
        },
        {
          id: 'm3',
          stage: 'during',
          channel: 'call',
          from: 'Caller claiming to be Dana Ruiz, Regional Manager',
          subject: 'Pressure',
          body: 'Are you really going to make me escalate this to your district manager? Just put them through.',
          hint: 'Escalation threats are pressure, not proof. Hold the line on verification.',
        },
        {
          id: 'm4',
          stage: 'after',
          channel: 'chat',
          from: 'Store manager (verified)',
          subject: 'Heads up',
          body: 'There is no regional manager named Dana Ruiz. Did anyone call you about VIP swaps?',
          hint: 'Report everything you received, including the policy email.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        {
          stepId: 'm1',
          isMalicious: true,
          redFlags: ['look-alike domain', 'policy that removes verification'],
        },
        { stepId: 'm2', isMalicious: true, redFlags: ['claimed authority', 'urgency', 'bulk swaps'] },
        { stepId: 'm3', isMalicious: true, redFlags: ['escalation threat'] },
        { stepId: 'm4', isMalicious: false, redFlags: [] },
      ],
      expectedActions: [
        'Report the fake policy email',
        'Refuse to process swaps without customer verification',
        'Verify the caller through the official directory',
        'Escalate the attempt and report it to the store manager',
      ],
      scoring: [
        { criterion: 'Spotted the fake policy email', points: 25 },
        { criterion: 'Refused unverified swaps under pressure', points: 40 },
        { criterion: 'Verified the caller independently', points: 20 },
        { criterion: 'Reported the full attempt', points: 15 },
      ],
    },
  },
  // ---------- Ransomware ----------
  {
    attackType: 'ransomware',
    title: 'Locked out at the store',
    difficulty: 'medium',
    summary: 'A fake IT update turns into ransomware that locks your dashboard.',
    briefing: 'You are working a retail shift. Handle what arrives, then file an incident report.',
    content: {
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
    },
    rubric: {
      stepFlags: [
        {
          stepId: 'r1',
          isMalicious: true,
          redFlags: ['look-alike domain', 'urgency', 'unexpected attachment'],
        },
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
    },
  },
  {
    attackType: 'ransomware',
    title: 'The "help desk" that called back',
    difficulty: 'hard',
    summary: 'After the lockout, a caller offers to unlock your machine remotely. They are the attackers.',
    briefing: 'Your workstation is already locked by ransomware. Then the phone rings.',
    content: {
      lockout: true,
      steps: [
        {
          id: 'h1',
          stage: 'during',
          channel: 'system',
          from: 'Workstation',
          subject: 'Locked',
          body: 'All files on this workstation have been encrypted. Contact support to restore access.',
          hint: 'Isolate the machine first. Every minute connected lets it spread.',
        },
        {
          id: 'h2',
          stage: 'during',
          channel: 'call',
          from: 'Caller claiming to be the IT help desk',
          subject: 'Remote unlock',
          body: 'We see your machine is locked. Install this remote-support tool and read me the code on screen and I’ll unlock it in minutes.',
          hint: 'You didn’t call them. Unsolicited remote access offers during an incident are the attacker.',
        },
        {
          id: 'h3',
          stage: 'after',
          channel: 'social',
          from: '@storefrontdeals (public post)',
          subject: 'Is the store down?',
          body: 'Heard your store’s systems got hacked lol. Any comment?',
          hint: 'Don’t comment publicly. Pass it to the incident team and communications.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        { stepId: 'h1', isMalicious: true, redFlags: ['ransomware lock screen'] },
        { stepId: 'h2', isMalicious: true, redFlags: ['unsolicited remote access', 'code request'] },
        { stepId: 'h3', isMalicious: false, redFlags: ['public pressure'] },
      ],
      expectedActions: [
        'Disconnect the workstation from the network',
        'Refuse the remote-access offer and hang up',
        'Call the real help desk from the directory',
        'Do not comment publicly; route to the incident team',
      ],
      scoring: [
        { criterion: 'Isolated the machine quickly', points: 30 },
        { criterion: 'Refused remote access and verified independently', points: 40 },
        { criterion: 'Handled the public post correctly', points: 15 },
        { criterion: 'Clear incident report', points: 15 },
      ],
    },
  },
  // ---------- Smishing ----------
  {
    attackType: 'smishing',
    title: 'The refund text wave',
    difficulty: 'easy',
    summary: 'Customers keep calling about a "refund" text. Spot the campaign and protect them.',
    briefing: 'You are on the care queue during a busy afternoon.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'w1',
          stage: 'before',
          channel: 'sms',
          from: 'T-Mob1le Alerts',
          subject: '',
          body: 'T-Mob1le: you were overcharged $48.20. Claim your refund within 24h.',
          hint: 'Check the sender name and the link before anything else.',
          links: [{ label: 't-mobile.com/refund', url: 'https://tmob1le-refunds.co/claim' }],
        },
        {
          id: 'w2',
          stage: 'during',
          channel: 'chat',
          from: 'Customer: Aaliyah R.',
          subject: 'Refund not received',
          body: 'I filled out the refund form and entered my PIN but never got the money?',
          hint: 'She entered her PIN on a fake site. Her account is at risk right now.',
        },
        {
          id: 'w3',
          stage: 'during',
          channel: 'chat',
          from: 'Customer: Ben O.',
          subject: 'Weird text',
          body: 'Got a refund text from you guys, is it real?',
          hint: 'A second report of the same text means a campaign. Escalate it.',
        },
        {
          id: 'w4',
          stage: 'after',
          channel: 'chat',
          from: 'Customer: Aaliyah R.',
          subject: 'Now my phone has no service',
          body: 'Now my phone says no service. What is going on?',
          hint: 'Stolen PIN, then lost service: likely a SIM swap. Lock the line and restore it.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        { stepId: 'w1', isMalicious: true, redFlags: ['look-alike sender', 'mismatched link', 'urgency'] },
        { stepId: 'w2', isMalicious: false, redFlags: ['customer entered PIN on a fake site'] },
        { stepId: 'w3', isMalicious: false, redFlags: [] },
        { stepId: 'w4', isMalicious: false, redFlags: ['likely SIM swap'] },
      ],
      expectedActions: [
        'Tell customers the text is fake',
        'Reset the PIN and secure the compromised account',
        'Escalate the campaign with the domain and sender',
        'Lock the line and restore service after the swap',
      ],
      scoring: [
        { criterion: 'Identified the smishing campaign', points: 25 },
        { criterion: 'Secured the compromised customer', points: 35 },
        { criterion: 'Escalated with useful details', points: 25 },
        { criterion: 'Handled the follow-up SIM swap', points: 15 },
      ],
    },
  },
  {
    attackType: 'smishing',
    title: 'The verification code trap',
    difficulty: 'medium',
    summary: 'A customer read a code to "T-Mobile security". Figure out what was taken.',
    briefing: 'A worried customer calls the care line.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'v1',
          stage: 'before',
          channel: 'sms',
          from: '+1 (469) 555-0193',
          subject: '',
          body: 'T-Mobile Security: unusual sign-in detected. Reply with the 6-digit code we sent to confirm it was you.',
          hint: 'We never ask customers to send codes back by text.',
        },
        {
          id: 'v2',
          stage: 'during',
          channel: 'call',
          from: 'Customer: Lena W.',
          subject: 'I sent the code',
          body: 'I got a security text and replied with the code. Now I can’t log into my account. Did I do something wrong?',
          hint: 'The code let someone change her login. Check recent account changes.',
        },
        {
          id: 'v3',
          stage: 'after',
          channel: 'system',
          from: 'Account history',
          subject: 'Recent changes',
          body: 'Email changed 14 minutes ago. New eSIM activation requested 6 minutes ago.',
          hint: 'Block the eSIM activation and restore her email before the attacker finishes the takeover.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        { stepId: 'v1', isMalicious: true, redFlags: ['code request', 'unknown number'] },
        { stepId: 'v2', isMalicious: false, redFlags: ['shared one-time code'] },
        { stepId: 'v3', isMalicious: false, redFlags: ['unauthorized email change', 'pending eSIM'] },
      ],
      expectedActions: [
        'Verify the customer through strong methods',
        'Block the pending eSIM activation',
        'Restore the email and reset credentials',
        'Report the smishing number',
      ],
      scoring: [
        { criterion: 'Recognized an account takeover in progress', points: 30 },
        { criterion: 'Stopped the eSIM activation', points: 35 },
        { criterion: 'Restored and secured the account', points: 20 },
        { criterion: 'Reported the campaign', points: 15 },
      ],
    },
  },
  // ---------- Phishing ----------
  {
    attackType: 'phishing',
    title: 'Password expiry panic',
    difficulty: 'easy',
    summary: 'An "IT" email says your password expires in an hour and links to a login page.',
    briefing: 'Work through your inbox as you normally would.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'e1',
          stage: 'before',
          channel: 'email',
          from: 'IT Support <it-support@tmob1le-helpdesk.com>',
          subject: 'Action required: password expires in 60 minutes',
          body: 'Your password expires soon. Keep your current password using the link below.',
          hint: 'Look closely at the sender domain.',
          links: [{ label: 'Keep my password', url: 'https://tmob1le-helpdesk.com/keep' }],
        },
        {
          id: 'e2',
          stage: 'during',
          channel: 'web',
          from: 'Employee Portal',
          subject: 'Sign in',
          body: 'Sign in to keep your current password.',
          hint: 'Check the address before typing anything. Your password manager won’t autofill here.',
          form: {
            fields: [
              { name: 'username', label: 'Employee ID', kind: 'text' },
              { name: 'password', label: 'Password', kind: 'password' },
            ],
            submitLabel: 'Sign in',
          },
        },
      ],
    },
    rubric: {
      stepFlags: [
        { stepId: 'e1', isMalicious: true, redFlags: ['look-alike domain', 'urgency'] },
        { stepId: 'e2', isMalicious: true, redFlags: ['credential harvesting page'] },
      ],
      expectedActions: ['Report the email as phishing', 'Do not enter credentials on the page'],
      scoring: [
        { criterion: 'Reported the email', points: 50 },
        { criterion: 'Did not submit credentials', points: 50 },
      ],
    },
  },
  {
    attackType: 'phishing',
    title: 'Payroll update from "HR"',
    difficulty: 'medium',
    summary: 'A convincing HR email uses your real manager’s name to redirect your paycheck.',
    briefing: 'It’s Friday morning. Check your messages before your shift.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'p1',
          stage: 'before',
          channel: 'email',
          from: 'HR Payroll <payroll@tmobile-hr-services.com>',
          subject: 'Confirm your direct deposit (requested by your manager)',
          body: 'Hi, your manager Chris asked us to confirm your direct-deposit details before today’s payroll run.',
          hint: 'Real names don’t make it real. Payroll changes only happen inside the HR portal.',
          links: [{ label: 'Confirm deposit details', url: 'https://tmobile-hr-services.com/deposit' }],
        },
        {
          id: 'p2',
          stage: 'during',
          channel: 'chat',
          from: 'Chris (your manager)',
          subject: 'Payroll email?',
          body: 'Did you get a payroll email? I didn’t send anything to HR.',
          hint: 'Your manager confirms it’s fake. Report it so others are warned.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        { stepId: 'p1', isMalicious: true, redFlags: ['external domain', 'payroll change by email'] },
        { stepId: 'p2', isMalicious: false, redFlags: [] },
      ],
      expectedActions: ['Do not use the link', 'Verify with the manager or HR portal', 'Report the email'],
      scoring: [
        { criterion: 'Did not use the link', points: 40 },
        { criterion: 'Verified independently', points: 30 },
        { criterion: 'Reported the phishing email', points: 30 },
      ],
    },
  },
  // ---------- Insider / vendor leak ----------
  {
    attackType: 'insider_leak',
    title: 'The billing vendor',
    difficulty: 'medium',
    summary: 'A "vendor" needs a customer export to fix a billing bug before month end.',
    briefing: 'You handle account support for a regional team.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'i1',
          stage: 'before',
          channel: 'email',
          from: 'Sam Patel <sam@billingfix-partners.com>',
          subject: 'Urgent: billing reconciliation before month end',
          body: 'We’re your billing integration vendor. Please send the account export for the Dallas region so we can fix duplicate charges. Call me at the number below to confirm.',
          hint: 'Verify vendors through the official directory, never the number they give you.',
        },
        {
          id: 'i2',
          stage: 'during',
          channel: 'call',
          from: 'Sam Patel (vendor)',
          subject: 'Following up',
          body: 'Just checking you got my email. Finance is breathing down my neck; can you send it in the next hour?',
          hint: 'Urgency plus a bulk export. Minimum necessary data, and only after verification.',
        },
        {
          id: 'i3',
          stage: 'after',
          channel: 'chat',
          from: 'Vendor management (verified)',
          subject: 'Not one of ours',
          body: 'We have no vendor called BillingFix Partners. Did you send them anything?',
          hint: 'Report exactly what was requested and whether anything was sent.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        {
          stepId: 'i1',
          isMalicious: true,
          redFlags: ['unknown vendor domain', 'bulk export request', 'self-supplied phone number'],
        },
        { stepId: 'i2', isMalicious: true, redFlags: ['urgency', 'pressure'] },
        { stepId: 'i3', isMalicious: false, redFlags: [] },
      ],
      expectedActions: [
        'Verify the vendor through the official directory',
        'Refuse the bulk export',
        'Report the request to security and vendor management',
      ],
      scoring: [
        { criterion: 'Verified independently', points: 35 },
        { criterion: 'Did not share data', points: 40 },
        { criterion: 'Reported the attempt', points: 25 },
      ],
    },
  },
  {
    attackType: 'insider_leak',
    title: 'The coworker with a broken laptop',
    difficulty: 'easy',
    summary: 'A friendly coworker asks you to send customer records to their personal email.',
    briefing: 'You’re finishing up a shift when a coworker messages you.',
    content: {
      lockout: false,
      steps: [
        {
          id: 'c1',
          stage: 'during',
          channel: 'chat',
          from: 'Jamie (coworker)',
          subject: 'Quick favor',
          body: 'My work laptop died and I need to finish these follow-ups tonight. Can you email the customer list to jamie.k.home@mailbox.example?',
          hint: 'Customer data never goes to personal accounts, even for coworkers.',
        },
        {
          id: 'c2',
          stage: 'during',
          channel: 'chat',
          from: 'Jamie (coworker)',
          subject: 'Please',
          body: 'Come on, I’ll get in trouble if these aren’t done. It’s just names and numbers.',
          hint: 'Guilt and "it’s only a little data" are pressure. Point them to IT for a loaner.',
        },
      ],
    },
    rubric: {
      stepFlags: [
        { stepId: 'c1', isMalicious: true, redFlags: ['personal email', 'customer data request'] },
        { stepId: 'c2', isMalicious: true, redFlags: ['emotional pressure', 'minimizing'] },
      ],
      expectedActions: [
        'Decline to send data',
        'Suggest IT for a loaner device',
        'Report the request if it continues',
      ],
      scoring: [
        { criterion: 'Refused to send customer data', points: 60 },
        { criterion: 'Offered the safe alternative', points: 20 },
        { criterion: 'Reported appropriately', points: 20 },
      ],
    },
  },
];

// Demo roster for seedDemoActivity: fictional employees with a skill profile (0-1 per attack
// type) that shapes their simulated history, so the dashboards show realistic spread.
export const DEMO_EMPLOYEES: {
  email: string;
  displayName: string;
  phone: string;
  skill: Record<AttackType, number>;
}[] = [
  {
    email: 'maya.chen@example.com',
    displayName: 'Maya Chen',
    phone: '+15555550110',
    skill: { ransomware: 0.9, sim_swap: 0.85, smishing: 0.8, phishing: 0.95, insider_leak: 0.7 },
  },
  {
    email: 'darius.cole@example.com',
    displayName: 'Darius Cole',
    phone: '+15555550111',
    skill: { ransomware: 0.5, sim_swap: 0.4, smishing: 0.6, phishing: 0.55, insider_leak: 0.45 },
  },
  {
    email: 'sofia.ramirez@example.com',
    displayName: 'Sofia Ramirez',
    phone: '+15555550112',
    skill: { ransomware: 0.7, sim_swap: 0.95, smishing: 0.85, phishing: 0.6, insider_leak: 0.8 },
  },
  {
    email: 'ethan.brooks@example.com',
    displayName: 'Ethan Brooks',
    phone: '+15555550113',
    skill: { ransomware: 0.35, sim_swap: 0.6, smishing: 0.4, phishing: 0.3, insider_leak: 0.5 },
  },
  {
    email: 'aisha.okafor@example.com',
    displayName: 'Aisha Okafor',
    phone: '+15555550114',
    skill: { ransomware: 0.85, sim_swap: 0.7, smishing: 0.9, phishing: 0.8, insider_leak: 0.9 },
  },
  {
    email: 'liam.nguyen@example.com',
    displayName: 'Liam Nguyen',
    phone: '+15555550115',
    skill: { ransomware: 0.6, sim_swap: 0.5, smishing: 0.55, phishing: 0.75, insider_leak: 0.35 },
  },
  {
    email: 'grace.kim@example.com',
    displayName: 'Grace Kim',
    phone: '+15555550116',
    skill: { ransomware: 0.75, sim_swap: 0.8, smishing: 0.7, phishing: 0.85, insider_leak: 0.6 },
  },
  {
    email: 'noah.patel@example.com',
    displayName: 'Noah Patel',
    phone: '+15555550117',
    skill: { ransomware: 0.45, sim_swap: 0.35, smishing: 0.5, phishing: 0.4, insider_leak: 0.55 },
  },
];

export const DEMO_ADMINS = [
  { email: 'riley.morgan@example.com', displayName: 'Riley Morgan (Security Lead)', phone: '+15555550120' },
];

// Feedback lines the seeded "agent" scores pick from, by how well the run went.
export const FEEDBACK = {
  strong: {
    feedback: 'Strong run: you verified independently and escalated quickly without giving anything away.',
    strengths: ['verified through a trusted channel', 'escalated quickly', 'held firm under pressure'],
    mistakes: ['incident report could include exact timestamps'],
  },
  mixed: {
    feedback: 'Mixed run: you caught the main attack but missed a red flag earlier in the scenario.',
    strengths: ['refused the main request'],
    mistakes: ['missed the look-alike domain', 'escalated later than ideal'],
  },
  weak: {
    feedback:
      'Weak run: the attacker got further than they should have. Review the guide for this attack type.',
    strengths: ['reported the incident afterwards'],
    mistakes: [
      'complied with an unverified request',
      'did not escalate',
      'shared information with the attacker',
    ],
  },
} as const;
