/**
 * Synthetic CorpMobile security runbooks: the knowledge base the AI retrieves from (RAG).
 * Written for this project, loosely following the NIST SP 800-61 incident lifecycle.
 * Fictional company; no real procedures, contacts or systems.
 *
 * One entry = one retrievable passage (a runbook section). `audience` says who the step is for:
 * frontline employees (report, don't touch) or the response team (contain, eradicate, recover).
 */
import type { AttackType, GuideAudience } from './index';

export type RunbookAudience = 'employee' | 'responder' | 'both';

export interface RunbookPassage {
  id: string; // stable, e.g. 'rb-acct-2'
  attackType: AttackType; // closest attack type, so the Guides page can group them
  runbook: string; // runbook title
  section: string; // '§2'
  heading: string;
  audience: RunbookAudience;
  tags: string[]; // attack types / topics, used as extra search terms
  text: string;
}

export const RUNBOOKS: RunbookPassage[] = [
  // ---------------- Reporting (everyone) ----------------
  {
    id: 'rb-report-1',
    attackType: 'phishing',
    runbook: 'Reporting a security concern',
    section: '§1',
    heading: 'Report first, fast',
    audience: 'employee',
    tags: ['phishing', 'smishing', 'report', 'suspicious', 'security'],
    text: 'If anything feels off (a message, a sign-in alert, a strange request), report it to Security right away with the Report button or the security hotline. Speed matters more than certainty: a false alarm costs minutes, a late report can cost days. You will never be punished for reporting, even if you clicked or typed something.',
  },
  {
    id: 'rb-report-2',
    attackType: 'phishing',
    runbook: 'Reporting a security concern',
    section: '§2',
    heading: 'What to include',
    audience: 'employee',
    tags: ['report', 'details'],
    text: 'Say what you received, from whom, when, and exactly what you did: opened it, clicked a link, typed a password, approved a sign-in prompt, gave information over the phone. Include anything you typed or shared. Precise details let Security judge how far the attacker got.',
  },
  {
    id: 'rb-report-3',
    attackType: 'phishing',
    runbook: 'Reporting a security concern',
    section: '§3',
    heading: 'Preserve, do not clean up',
    audience: 'employee',
    tags: ['evidence', 'report', 'delete'],
    text: 'Do not delete the suspicious email, text or chat, and do not remove rules, devices or files you do not recognize before reporting. Security needs them as evidence, and changing them can tip off the attacker. Never report through a channel the attacker controls, such as replying to the message.',
  },

  // ---------------- Phishing / smishing ----------------
  {
    id: 'rb-phish-1',
    attackType: 'phishing',
    runbook: 'Phishing and smishing',
    section: '§1',
    heading: 'Spotting a lure',
    audience: 'both',
    tags: ['phishing', 'smishing', 'red flags', 'lookalike', 'urgency'],
    text: 'Common tells: urgency or a threat of losing access, a sender or link domain that is close to ours but not ours (a capital I instead of l, extra words like -secure or -verify), shortened links, unexpected attachments, and requests to sign in from a message. Corporate IT never asks you to sign in or share a code from an email or text.',
  },
  {
    id: 'rb-phish-2',
    attackType: 'phishing',
    runbook: 'Phishing and smishing',
    section: '§2',
    heading: 'If you only clicked',
    audience: 'employee',
    tags: ['phishing', 'clicked link'],
    text: 'If you clicked a link but did not type anything, close the page and report the message, saying that you clicked. Do not try the link again to check it. Security will look for downloads or follow-up activity from your device.',
  },
  {
    id: 'rb-phish-3',
    attackType: 'phishing',
    runbook: 'Phishing and smishing',
    section: '§3',
    heading: 'If you typed your password',
    audience: 'employee',
    tags: ['phishing', 'credentials', 'password', 'fake login'],
    text: 'If you entered your password or a code on a page you reached from a message, report it immediately and say exactly what you typed. Change your password only through the official sign-in portal you open yourself, or let IT force the reset. Assume the attacker may already be signed in.',
  },
  {
    id: 'rb-phish-4',
    attackType: 'phishing',
    runbook: 'Phishing and smishing',
    section: '§4',
    heading: 'Containing a campaign',
    audience: 'responder',
    tags: ['phishing', 'block domain', 'purge'],
    text: 'Treat one report as a possible campaign. Find every recipient, block the sending domain and the link domain at the mail gateway and proxy, and purge the message from all mailboxes. Then check sign-in logs for anyone who visited the link.',
  },

  // ---------------- Compromised account ----------------
  {
    id: 'rb-acct-1',
    attackType: 'phishing',
    runbook: 'Compromised account',
    section: '§1',
    heading: 'Signs an account is compromised',
    audience: 'both',
    tags: ['account takeover', 'session', 'sign-in', 'impossible travel'],
    text: 'Look for sign-ins from unfamiliar places or networks, sessions you do not recognize, sign-in devices you did not add, mail rules that forward to outside addresses, and sent mail or record changes you did not make. Activity logs show the source IP and location: the same name on two continents an hour apart is a strong sign.',
  },
  {
    id: 'rb-acct-2',
    attackType: 'phishing',
    runbook: 'Compromised account',
    section: '§2',
    heading: 'Cut access in the right order',
    audience: 'responder',
    tags: ['account takeover', 'password reset', 'revoke session', 'containment'],
    text: 'Reset the password first, then revoke every session you do not recognize. Revoking a session alone does not help while the attacker still knows the password: they simply sign back in. Then remove sign-in (MFA) devices the user did not add, because a rogue device is a backdoor that survives a password reset.',
  },
  {
    id: 'rb-acct-3',
    attackType: 'phishing',
    runbook: 'Compromised account',
    section: '§3',
    heading: 'Preserve before removing persistence',
    audience: 'responder',
    tags: ['forwarding rule', 'evidence', 'mail rule', 'preserve'],
    text: 'Before deleting a malicious mail rule or device, record what it was: the rule match, the destination address, when it was created and from which IP. Then remove it. The destination address is an indicator to block across the company and tells you what data left.',
  },
  {
    id: 'rb-acct-4',
    attackType: 'phishing',
    runbook: 'Compromised account',
    section: '§4',
    heading: 'Do not break the legitimate setup',
    audience: 'responder',
    tags: ['forwarding rule', 'mfa', 'false positive'],
    text: 'Check before you remove. Finance invoice rules that forward to internal addresses, the user’s own authenticator and their own phone session are legitimate; removing them causes outages or locks the user out and does not slow the attacker. Look at the creation time and source IP to tell them apart.',
  },
  {
    id: 'rb-acct-5',
    attackType: 'phishing',
    runbook: 'Compromised account',
    section: '§5',
    heading: 'Mail sent as the user',
    audience: 'responder',
    tags: ['business email compromise', 'sent mail', 'wire fraud'],
    text: 'Messages the attacker sent as the user cannot be unsent. Warn the recipients through a separate channel (for example, call Finance about a fake payment request) and report it so the fraud team can stop payments. Note it in the incident report.',
  },

  // ---------------- SIM swap / customer accounts ----------------
  {
    id: 'rb-sim-1',
    attackType: 'sim_swap',
    runbook: 'SIM swap and port-out fraud',
    section: '§1',
    heading: 'Never skip verification',
    audience: 'employee',
    tags: ['sim_swap', 'vishing', 'customer', 'verification', 'pin'],
    text: 'A SIM change or number transfer always requires the customer’s account PIN or in-app approval. Urgency, anger, a sad story or partial details (last four of SSN, ZIP code) are not substitutes. If the caller cannot verify, decline politely, offer the store visit with ID, and flag the account.',
  },
  {
    id: 'rb-sim-2',
    attackType: 'sim_swap',
    runbook: 'SIM swap and port-out fraud',
    section: '§2',
    heading: 'Suspicious change on a customer account',
    audience: 'both',
    tags: ['sim_swap', 'customer', 'email change', 'care portal'],
    text: 'An email or SIM change on a customer account that the customer did not request is account takeover in progress. Check the change history: who made it and from where. Employees escalate to the fraud team; the fraud team reverts the change, turns on port freeze, and contacts the real customer through the number or address on file before the change.',
  },
  {
    id: 'rb-sim-3',
    attackType: 'sim_swap',
    runbook: 'SIM swap and port-out fraud',
    section: '§3',
    heading: 'Port freeze',
    audience: 'responder',
    tags: ['sim_swap', 'port freeze', 'customer'],
    text: 'Turn on port freeze for any customer whose SIM, email or number was changed without authorization. It blocks number transfers to another carrier while the account is investigated. It does not undo a change that already happened: revert that separately.',
  },

  // ---------------- Ransomware ----------------
  {
    id: 'rb-ransom-1',
    attackType: 'ransomware',
    runbook: 'Ransomware',
    section: '§1',
    heading: 'First steps for anyone',
    audience: 'employee',
    tags: ['ransomware', 'encrypted files', 'ransom note'],
    text: 'If files are renamed or encrypted or a ransom note appears, disconnect from the network (Wi-Fi off, cable out) but do not power the device off: memory holds evidence. Do not pay, do not open the note’s links, do not try to restore anything yourself. Call the security hotline.',
  },
  {
    id: 'rb-ransom-2',
    attackType: 'ransomware',
    runbook: 'Ransomware',
    section: '§2',
    heading: 'Restore only after the attacker is out',
    audience: 'responder',
    tags: ['ransomware', 'restore', 'backup', 'recovery'],
    text: 'Restoring from backup while the attacker still has access gets the files encrypted again. First remove access (password reset, sessions, rogue devices), confirm no new activity from attacker IPs, then restore from the last clean backup and watch for re-encryption.',
  },

  // ---------------- Data exposure ----------------
  {
    id: 'rb-exfil-1',
    attackType: 'insider_leak',
    runbook: 'Data exposure',
    section: '§1',
    heading: 'Customer data was exported',
    audience: 'responder',
    tags: ['insider_leak', 'export', 'exfiltration', 'customer data'],
    text: 'A data export cannot be pulled back. Stop further access, identify exactly which records and fields left, and escalate to Privacy and Legal early: customer notification rules may apply. Report it even if everything else is cleaned up.',
  },
  {
    id: 'rb-exfil-2',
    attackType: 'insider_leak',
    runbook: 'Data exposure',
    section: '§2',
    heading: 'Requests to send data outside',
    audience: 'employee',
    tags: ['insider_leak', 'vendor', 'data request'],
    text: 'Requests to send customer lists or internal files to a personal or outside address, even from someone who sounds senior or a known vendor, go through the approved request process. Verify the requester through the directory, not through contact details in the message.',
  },

  // ---------------- Social engineering ----------------
  {
    id: 'rb-social-1',
    attackType: 'sim_swap',
    runbook: 'Social engineering by phone and chat',
    section: '§1',
    heading: 'Callers claiming to be IT or a manager',
    audience: 'employee',
    tags: ['vishing', 'pretexting', 'insider', 'help desk', 'mfa code'],
    text: 'Real IT will never ask for your password or a sign-in code. If a caller claims to be IT, a manager or a vendor and asks you to bypass a step, end the call politely, call back through the number in the company directory, and report the attempt with the number and what was asked.',
  },
  {
    id: 'rb-social-2',
    attackType: 'sim_swap',
    runbook: 'Social engineering by phone and chat',
    section: '§2',
    heading: 'Unexpected sign-in prompts',
    audience: 'employee',
    tags: ['mfa fatigue', 'push', 'identity'],
    text: 'Never approve a sign-in prompt you did not start, even if they keep coming. Repeated prompts mean someone has your password: deny them, report immediately and change your password through the official portal.',
  },

  // ---------------- Incident handling (responders) ----------------
  {
    id: 'rb-ir-1',
    attackType: 'phishing',
    runbook: 'Incident handling',
    section: '§1',
    heading: 'Lifecycle',
    audience: 'responder',
    tags: ['incident response', 'nist', 'lifecycle'],
    text: 'Work the incident in order: confirm and scope it, preserve evidence, contain (stop the spread), eradicate (remove access and persistence), recover (restore and monitor), then write the report and lessons learned. Skipping ahead, such as restoring before eradicating, usually means doing the work twice.',
  },
  {
    id: 'rb-ir-2',
    attackType: 'phishing',
    runbook: 'Incident handling',
    section: '§2',
    heading: 'Scope before acting',
    audience: 'responder',
    tags: ['scope', 'activity log', 'triage'],
    text: 'Before changing anything, read the activity log for the account: every action from an unfamiliar IP is part of the incident. List what the attacker touched (mail rules, devices, customer records, files, sent mail, exports) so nothing is missed during cleanup.',
  },
  {
    id: 'rb-ir-3',
    attackType: 'phishing',
    runbook: 'Incident handling',
    section: '§3',
    heading: 'Close with a report',
    audience: 'both',
    tags: ['report', 'incident report', 'lessons learned'],
    text: 'Every incident ends with a report: what happened, how the attacker got in, what they did, what was undone and what could not be (sent mail, exported data). The report is how Security warns others and how the same trick gets blocked next time.',
  },
];

/**
 * The runbooks as rows for SpacetimeDB's guide table (one guide per section), so the Guides page
 * shows exactly what the AI retrieves. 'both' sections are listed for employees.
 */
export function runbookGuides(): {
  attackType: AttackType;
  title: string;
  summary: string;
  body: string;
  audience: GuideAudience;
}[] {
  return RUNBOOKS.map((p) => ({
    attackType: p.attackType,
    title: `${p.runbook} ${p.section}: ${p.heading}`,
    summary: p.text.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? p.text,
    body: p.text,
    audience: p.audience === 'responder' ? 'responder' : 'employee',
  }));
}
