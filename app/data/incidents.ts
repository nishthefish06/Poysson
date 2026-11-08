/* ==========================================================================
   Incident content.
   Not "drills": every run is a MIXED incident. The generator picks one inject
   per armed threat vector, shuffles them and spaces them out on a timeline,
   so every run plays differently and you practice switching between threats.
   ========================================================================== */

export type VectorId = 'phish' | 'identity' | 'malware' | 'exfil' | 'insider'
export type Rating = 'ideal' | 'ok' | 'harmful'
export type ItemKind = 'sms' | 'email' | 'ticket' | 'edr'
export type Difficulty = 'recruit' | 'operator' | 'netrunner'

export interface Vector {
  id: VectorId
  code: string
  name: string
  blurb: string
  icon: string
  color: string // css var name
}

export interface IncidentAction {
  id: string
  label: string
  rating: Rating
  points: number
  feedback: string
  /** extra feed line emitted when chosen (consequence) */
  consequence?: string
}

export interface Inject {
  id: string
  vector: VectorId
  title: string
  severity: 'low' | 'med' | 'high' | 'crit'
  /** lines pushed into the live alert/log feed when the inject fires */
  feed: { type: 'alert' | 'log'; src: string; text: string }[]
  /** what shows up in the center inbox / ticket queue */
  item: {
    kind: ItemKind
    from: string
    to?: string
    subject?: string
    body: string
    meta?: Record<string, string>
    redFlags: string[]
  }
  actions: IncidentAction[]
  /** NPC message dropped in the comms panel */
  comms?: { who: string; role: string; text: string }
  tip: string
}

export const VECTORS: Vector[] = [
  { id: 'phish', code: 'PHX', name: 'Phish & Smish', blurb: 'Lures over SMS, email and QR codes aimed at your people.', icon: 'sms', color: '--c-magenta' },
  { id: 'identity', code: 'IDN', name: 'Identity Attack', blurb: 'MFA fatigue, impossible travel, session hijack.', icon: 'key', color: '--c-cyan' },
  { id: 'malware', code: 'MAL', name: 'Ransomware', blurb: 'Mass encryption, beaconing hosts, dropped payloads.', icon: 'bug', color: '--c-harmful' },
  { id: 'exfil', code: 'EXF', name: 'Data Exfil', blurb: 'Large uploads, odd destinations, staged archives.', icon: 'upload', color: '--c-yellow' },
  { id: 'insider', code: 'INS', name: 'Insider & Vishing', blurb: 'Help desk pretexting and risky insider behavior.', icon: 'phone', color: '--c-violet' },
]

export const vectorById = (id: VectorId) => VECTORS.find(v => v.id === id)!

export const INJECTS: Inject[] = [
  // ---------------------------------------------------------------- PHISH
  {
    id: 'phx-01',
    vector: 'phish',
    title: 'CFO smishing: "MFA locked"',
    severity: 'high',
    feed: [
      { type: 'alert', src: 'MDM', text: 'SMS with shortened URL received on managed device of R. Vance (CFO)' },
      { type: 'log', src: 'DNS', text: 'Lookup: okta-verify-secure.co (registered 2 days ago)' },
    ],
    item: {
      kind: 'sms',
      from: '+1 (415) 555-0193',
      to: 'R. Vance — CFO',
      body: 'HALCYON IT: Your MFA token is LOCKED due to unusual activity. Re-verify within 15 min or payroll access will be suspended: https://bit.ly/hlc-mfa-fix',
      meta: { Carrier: 'VoIP / unknown', 'Link target': 'okta-verify-secure.co' },
      redFlags: ['Urgency + threat of loss', 'Shortened URL hides a look-alike domain', 'IT never sends MFA links over SMS'],
    },
    actions: [
      { id: 'a1', label: 'Block domain + purge SMS fleet-wide', rating: 'ideal', points: 100, feedback: 'Killed the lure for everyone, not just the CFO.' },
      { id: 'a2', label: 'Tell CFO to ignore it', rating: 'ok', points: 50, feedback: 'Safe for one user, but others got the same text.' },
      { id: 'a3', label: 'Open the link in your browser to check', rating: 'harmful', points: -60, feedback: 'You loaded a live credential harvester from a corporate device.', consequence: 'Proxy: analyst workstation reached okta-verify-secure.co' },
      { id: 'a4', label: 'Reply STOP to the sender', rating: 'harmful', points: -30, feedback: 'Replying confirms the number is live and monitored.' },
    ],
    comms: { who: 'R. Vance', role: 'CFO', text: 'Got a text saying my MFA is locked?? I have payroll at 5. Should I click it?' },
    tip: 'Smishing works on urgency. Kill the infrastructure (domain/URL) for the whole fleet first, then coach the user.',
  },
  {
    id: 'phx-02',
    vector: 'phish',
    title: 'Invoice email with HTML attachment',
    severity: 'med',
    feed: [
      { type: 'alert', src: 'MAIL-GW', text: '14 recipients in Finance received "Overdue invoice #88213"' },
      { type: 'log', src: 'SANDBOX', text: 'invoice_88213.html → redirects to Microsoft 365 look-alike page' },
    ],
    item: {
      kind: 'email',
      from: 'accounts@halcyon-suppIy.com',
      to: 'finance-team@halcyon.io',
      subject: 'URGENT: Overdue invoice #88213 — final notice',
      body: 'Hi team,\n\nOur records show invoice #88213 ($48,920.00) is 30 days overdue. Please review the attached statement and confirm payment today to avoid service interruption.\n\nRegards,\nAccounts Receivable',
      meta: { Attachment: 'invoice_88213.html', SPF: 'fail', 'Reply-To': 'ar-desk@protonmail.com' },
      redFlags: ['Domain uses capital "I" instead of "l"', 'SPF fail + mismatched Reply-To', 'HTML attachment = credential phish'],
    },
    actions: [
      { id: 'a1', label: 'Pull email from all 14 inboxes', rating: 'ideal', points: 100, feedback: 'Fast retraction before anyone entered credentials.' },
      { id: 'a2', label: 'Post a warning in #finance', rating: 'ok', points: 50, feedback: 'Helpful, but the email is still sitting in inboxes.' },
      { id: 'a3', label: 'Forward to the team asking "is this real?"', rating: 'harmful', points: -50, feedback: 'You just re-delivered the phish to more people.', consequence: 'MAIL-GW: phish forwarded to 22 additional recipients' },
      { id: 'a4', label: 'Do nothing — gateway already flagged it', rating: 'harmful', points: -40, feedback: 'Flagged is not removed. Two users already opened it.' },
    ],
    comms: { who: 'Priya N.', role: 'AP Lead', text: 'Vendor says we owe 48k?? I was about to open the statement.' },
    tip: 'Retract first, warn second. A flagged email that stays in inboxes still gets clicked.',
  },
  // ------------------------------------------------------------- IDENTITY
  {
    id: 'idn-01',
    vector: 'identity',
    title: 'MFA fatigue — 31 push requests',
    severity: 'crit',
    feed: [
      { type: 'alert', src: 'IdP', text: '31 MFA push requests in 6 min for j.okafor@halcyon.io' },
      { type: 'log', src: 'IdP', text: 'Origin IP 185.220.101.4 (Tor exit) — password auth succeeded' },
    ],
    item: {
      kind: 'ticket',
      from: 'IdP Risk Engine',
      subject: 'INC-4471 · Push bombing detected',
      body: 'User j.okafor is receiving repeated MFA push prompts. Password authentication from a Tor exit node succeeded prior to the push storm. No push approved yet.',
      meta: { User: 'j.okafor (DevOps)', 'Pushes denied': '31', 'Pushes approved': '0' },
      redFlags: ['Correct password from Tor = credential is compromised', 'Push storm is waiting for one tired "Approve"'],
    },
    actions: [
      { id: 'a1', label: 'Reset password + revoke sessions + require number-match', rating: 'ideal', points: 100, feedback: 'Closed the door: stolen password is dead and push spam stops.' },
      { id: 'a2', label: 'Temporarily lock the account', rating: 'ok', points: 60, feedback: 'Stops the bleeding, but the leaked password is still valid later.' },
      { id: 'a3', label: 'Tell the user to approve one so it stops', rating: 'harmful', points: -100, feedback: 'You handed the attacker a valid session.', consequence: 'IdP: session issued to 185.220.101.4 for j.okafor' },
      { id: 'a4', label: 'Ignore — no push was approved', rating: 'harmful', points: -40, feedback: 'The password is already compromised. It is a matter of time.' },
    ],
    comms: { who: 'J. Okafor', role: 'DevOps', text: 'My phone will not stop buzzing with login prompts. Can I just hit approve?' },
    tip: 'A push storm means the password is already known. Rotate credentials and kill sessions, not just the prompts.',
  },
  {
    id: 'idn-02',
    vector: 'identity',
    title: 'Impossible travel on admin account',
    severity: 'high',
    feed: [
      { type: 'alert', src: 'UEBA', text: 'Impossible travel: m.chen — Austin, TX → Bucharest, RO in 11 min' },
      { type: 'log', src: 'AzureAD', text: 'New inbox rule created: move "*invoice*" to RSS Feeds' },
    ],
    item: {
      kind: 'ticket',
      from: 'UEBA',
      subject: 'INC-4480 · Impossible travel + inbox rule',
      body: 'Admin user m.chen signed in from Bucharest 11 minutes after a sign-in from Austin. Within 2 minutes a hidden inbox rule was created to divert invoice emails.',
      meta: { User: 'm.chen (IT Admin)', 'Token type': 'Session cookie replay', Rule: 'invoice → RSS Feeds' },
      redFlags: ['Hidden inbox rule = BEC preparation', 'Session replay bypasses MFA entirely'],
    },
    actions: [
      { id: 'a1', label: 'Revoke tokens, delete rule, reset creds', rating: 'ideal', points: 100, feedback: 'Token, persistence and creds all handled.' },
      { id: 'a2', label: 'Reset password only', rating: 'ok', points: 40, feedback: 'Stolen session cookies survive a password reset on many platforms.' },
      { id: 'a3', label: 'Email m.chen to ask if they are traveling', rating: 'harmful', points: -50, feedback: 'The attacker controls that mailbox and will happily answer "yes".', consequence: 'Mail: reply from m.chen "yep, at a conference!" (sent from RO)' },
      { id: 'a4', label: 'Whitelist Romania for this user', rating: 'harmful', points: -80, feedback: 'You suppressed the only signal you had.' },
    ],
    comms: { who: 'Kade', role: 'SOC Lead', text: 'm.chen has domain admin. Treat this as hands-on-keyboard until proven otherwise.' },
    tip: 'Never verify a suspected compromise through the compromised channel. Revoke sessions, then hunt for persistence like inbox rules.',
  },
  // -------------------------------------------------------------- MALWARE
  {
    id: 'mal-01',
    vector: 'malware',
    title: 'Mass file rename on FIN-WS-07',
    severity: 'crit',
    feed: [
      { type: 'alert', src: 'EDR', text: 'FIN-WS-07: 4,812 files renamed to *.lckd in 90 seconds' },
      { type: 'log', src: 'EDR', text: 'vssadmin.exe delete shadows /all /quiet' },
      { type: 'log', src: 'NET', text: 'FIN-WS-07 → \\\\FS-01\\finance$ SMB write burst' },
    ],
    item: {
      kind: 'edr',
      from: 'EDR Console',
      subject: 'FIN-WS-07 · Ransomware behavior',
      body: 'Process "svch0st.exe" spawned from Outlook temp folder is encrypting local files and has begun writing to the finance file share. Shadow copies deleted.',
      meta: { Host: 'FIN-WS-07', User: 'p.nair', Parent: 'OUTLOOK.EXE', Hash: '9f2c…e41a' },
      redFlags: ['Shadow copy deletion = ransomware pre-step', 'Spreading to file share right now'],
    },
    actions: [
      { id: 'a1', label: 'Network-isolate host via EDR (keep powered on)', rating: 'ideal', points: 100, feedback: 'Stops spread, preserves memory for forensics.' },
      { id: 'a2', label: 'Disable the user account', rating: 'ok', points: 40, feedback: 'Does not stop a process already running as SYSTEM.' },
      { id: 'a3', label: 'Power the machine off', rating: 'harmful', points: -40, feedback: 'Spread stops, but you destroyed the in-memory keys and evidence.', consequence: 'Forensics: volatile memory lost on FIN-WS-07' },
      { id: 'a4', label: 'Pay attention to the ransom note first', rating: 'harmful', points: -70, feedback: 'Every second spent reading lets it encrypt more of the share.', consequence: 'EDR: FS-01 finance$ — 12,300 files encrypted' },
    ],
    comms: { who: 'Kade', role: 'SOC Lead', text: 'Finance share is lighting up. Contain FIRST, investigate second.' },
    tip: 'Isolate, do not unplug. EDR isolation stops spread while keeping RAM evidence intact.',
  },
  {
    id: 'mal-02',
    vector: 'malware',
    title: 'Beaconing to known C2',
    severity: 'high',
    feed: [
      { type: 'alert', src: 'NDR', text: 'ENG-LT-22 beaconing every 60s ±3s to 45.133.1.88:443' },
      { type: 'log', src: 'TI', text: '45.133.1.88 matches Cobalt Strike team server (feed: ThreatFox)' },
    ],
    item: {
      kind: 'edr',
      from: 'NDR Sensor',
      subject: 'ENG-LT-22 · C2 beacon',
      body: 'Engineering laptop is calling out to a known Cobalt Strike server at a steady interval. No large data transfer yet. User is currently on VPN.',
      meta: { Host: 'ENG-LT-22', Jitter: '5%', 'First seen': '03:12 UTC' },
      redFlags: ['Regular interval = automated implant', 'Known-bad infrastructure'],
    },
    actions: [
      { id: 'a1', label: 'Isolate host + block C2 IP at egress', rating: 'ideal', points: 100, feedback: 'Implant cut off and other infected hosts blocked too.' },
      { id: 'a2', label: 'Block the IP only', rating: 'ok', points: 50, feedback: 'Good, but the implant will fail over to backup C2.' },
      { id: 'a3', label: 'Run a full AV scan and wait', rating: 'harmful', points: -40, feedback: 'Signature AV rarely catches CS beacons; attacker keeps access.' },
      { id: 'a4', label: 'Message the user to reboot', rating: 'harmful', points: -30, feedback: 'Implants persist across reboots — and you tipped off a possible insider.' },
    ],
    tip: 'Contain the host and block the infrastructure together. One without the other leaves a gap.',
  },
  // ---------------------------------------------------------------- EXFIL
  {
    id: 'exf-01',
    vector: 'exfil',
    title: '2.3 GB upload to unknown cloud',
    severity: 'high',
    feed: [
      { type: 'alert', src: 'DLP', text: '2.3 GB upload from HR-WS-03 to mega-sync-files[.]net' },
      { type: 'log', src: 'EDR', text: '7z.exe a -p hr_backup.7z \\\\FS-01\\hr$\\payroll' },
    ],
    item: {
      kind: 'ticket',
      from: 'DLP Engine',
      subject: 'INC-4492 · Possible exfiltration of payroll data',
      body: 'A password-protected archive containing the HR payroll directory was created and is being uploaded to an uncategorized cloud storage domain. Upload 64% complete.',
      meta: { Host: 'HR-WS-03', Data: 'PII — payroll, SSNs', Progress: '64%' },
      redFlags: ['Password-protected archive evades DLP content inspection', 'Upload still in progress — you can stop it'],
    },
    actions: [
      { id: 'a1', label: 'Block destination + kill upload + preserve logs', rating: 'ideal', points: 100, feedback: 'Upload halted at 64% and evidence preserved for Legal.' },
      { id: 'a2', label: 'Open a ticket for HR to review', rating: 'ok', points: 20, feedback: 'By the time HR reads it, the upload has finished.' },
      { id: 'a3', label: 'Delete the archive from the host', rating: 'harmful', points: -50, feedback: 'You destroyed evidence; the upload continues from memory.', consequence: 'DLP: upload completed — 2.3 GB transferred' },
      { id: 'a4', label: 'Assume it is an approved backup', rating: 'harmful', points: -80, feedback: 'Approved backups do not go to random cloud hosts with passwords.', consequence: 'DLP: upload completed — 2.3 GB transferred' },
    ],
    comms: { who: 'D. Ramos', role: 'Legal', text: 'If PII left the building we have a 72h notification clock. Keep me posted.' },
    tip: 'Stop the transfer, then preserve evidence. Exfil with PII starts a legal clock — loop in Legal early.',
  },
  {
    id: 'exf-02',
    vector: 'exfil',
    title: 'Public S3 bucket with customer data',
    severity: 'med',
    feed: [
      { type: 'alert', src: 'CSPM', text: 's3://halcyon-crm-exports ACL changed to public-read' },
      { type: 'log', src: 'CloudTrail', text: 'GetObject x 1,204 from 3 unknown IPs in last 10 min' },
    ],
    item: {
      kind: 'ticket',
      from: 'CSPM',
      subject: 'INC-4495 · Public bucket being scraped',
      body: 'A bucket containing nightly CRM exports was made public by a CI role. External IPs are actively downloading objects.',
      meta: { Bucket: 'halcyon-crm-exports', 'Changed by': 'ci-deploy-role', Objects: '3,880' },
      redFlags: ['Active external downloads', 'Change came from automation, not a human'],
    },
    actions: [
      { id: 'a1', label: 'Block public access + rotate CI role keys', rating: 'ideal', points: 100, feedback: 'Exposure closed and the misused credential rotated.' },
      { id: 'a2', label: 'Set bucket private', rating: 'ok', points: 60, feedback: 'Exposure closed, but whoever used the CI role can do it again.' },
      { id: 'a3', label: 'Delete the bucket', rating: 'harmful', points: -40, feedback: 'You wiped the evidence of what was accessed — and production data.' },
      { id: 'a4', label: 'Wait for the morning change review', rating: 'harmful', points: -70, feedback: 'Scraping continued for 9 more hours.' },
    ],
    tip: 'Close the exposure and fix the root cause (the credential/automation) in the same move.',
  },
  // -------------------------------------------------------------- INSIDER
  {
    id: 'ins-01',
    vector: 'insider',
    title: 'Help desk vishing: "I\'m the CEO"',
    severity: 'high',
    feed: [
      { type: 'alert', src: 'HELPDESK', text: 'Caller claiming to be CEO requests MFA reset — "traveling, lost phone"' },
      { type: 'log', src: 'PBX', text: 'Inbound from spoofed caller ID +1 (650) 555-0100' },
    ],
    item: {
      kind: 'ticket',
      from: 'Help Desk — Tier 1',
      subject: 'TKT-20931 · CEO MFA reset (urgent)',
      body: 'Caller says they are A. Sterling (CEO), at the airport, lost phone, needs MFA moved to a new number NOW for a board call. Very insistent, getting angry.',
      meta: { Caller: '"A. Sterling"', Requested: 'MFA → +1 (650) 555-0177', Agent: 'T. Brooks' },
      redFlags: ['Authority + urgency + anger = classic pretext', 'Caller ID is trivially spoofed'],
    },
    actions: [
      { id: 'a1', label: 'Deny; verify via known callback + manager', rating: 'ideal', points: 100, feedback: 'Out-of-band verification beats pressure every time.' },
      { id: 'a2', label: 'Ask a security question', rating: 'ok', points: 30, feedback: 'Most answers are on LinkedIn. Better than nothing.' },
      { id: 'a3', label: 'Move MFA — it is the CEO', rating: 'harmful', points: -100, feedback: 'The attacker now owns the CEO\'s second factor.', consequence: 'IdP: MFA device for a.sterling replaced by +1 (650) 555-0177' },
      { id: 'a4', label: 'Send a temporary password by SMS', rating: 'harmful', points: -80, feedback: 'Straight to the attacker\'s phone.' },
    ],
    comms: { who: 'T. Brooks', role: 'Help Desk', text: 'CEO is yelling at me on the phone. Do I just reset it??' },
    tip: 'Authority and urgency are the attack. Always verify via a callback to a number you already have on file.',
  },
  {
    id: 'ins-02',
    vector: 'insider',
    title: 'Departing engineer cloning repos',
    severity: 'med',
    feed: [
      { type: 'alert', src: 'GIT', text: 'k.ivanova cloned 47 repos in 20 min (baseline: 2/day)' },
      { type: 'log', src: 'HRIS', text: 'k.ivanova — resignation submitted 3 days ago' },
    ],
    item: {
      kind: 'ticket',
      from: 'Insider Risk',
      subject: 'INC-4501 · Bulk repository clone',
      body: 'An engineer who resigned this week is mass-cloning repositories outside their team, including the payments service. Activity from corporate laptop.',
      meta: { User: 'k.ivanova', 'Last day': 'Friday', Repos: '47 (incl. payments-core)' },
      redFlags: ['Volume far above baseline', 'Timing: right after resignation'],
    },
    actions: [
      { id: 'a1', label: 'Suspend git access + escalate to HR/Legal', rating: 'ideal', points: 100, feedback: 'Contained quietly and routed to the right owners.' },
      { id: 'a2', label: 'Monitor and gather more evidence', rating: 'ok', points: 40, feedback: 'Reasonable, but the code keeps leaving while you watch.' },
      { id: 'a3', label: 'Confront the engineer on Slack', rating: 'harmful', points: -60, feedback: 'Tipped them off; they wiped local evidence.', consequence: 'EDR: k.ivanova ran secure-delete on ~/code' },
      { id: 'a4', label: 'Post about it in #engineering', rating: 'harmful', points: -70, feedback: 'Privacy violation and legal exposure for the company.' },
    ],
    tip: 'Insider cases are HR + Legal cases. Contain access quietly and do not alert the subject.',
  },
]

/* --------------------------------------------------------------------------
   Comms panel: canned broadcasts the player can send during a run.
   Each is scored once. `idealWhen` = vectors that make this the right call.
   -------------------------------------------------------------------------- */
export interface CommsAction { id: string; label: string; points: number; idealWhen?: VectorId[]; reply: string }
export const COMMS_ACTIONS: CommsAction[] = [
  { id: 'escalate', label: 'Escalate to IR Lead', points: 40, reply: 'Kade: Copy. Spinning up the bridge. Keep calling it.' },
  { id: 'legal', label: 'Loop in Legal', points: 40, idealWhen: ['exfil', 'insider'], reply: 'D. Ramos: Noted. Starting the notification clock review.' },
  { id: 'allhands', label: 'Broadcast "do not click" warning', points: 30, idealWhen: ['phish', 'identity'], reply: 'Comms: Warning pushed to #general and email.' },
]

export const DIFFICULTY: Record<Difficulty, { label: string; seconds: number; gap: [number, number]; xpMult: number; desc: string }> = {
  recruit: { label: 'Recruit', seconds: 300, gap: [22, 30], xpMult: 1, desc: '5:00 clock, slow injects' },
  operator: { label: 'Operator', seconds: 240, gap: [14, 20], xpMult: 1.5, desc: '4:00 clock, overlapping injects' },
  netrunner: { label: 'Netrunner', seconds: 180, gap: [8, 12], xpMult: 2, desc: '3:00 clock, everything at once' },
}

/* Small seeded RNG so a given incident replays identically */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CODENAMES = ['GLASS HARBOR', 'NEON TIDE', 'SILENT RELAY', 'CHROME VIPER', 'BLACK LATTICE', 'GHOST LEDGER', 'IRON MIRAGE', 'NULL HORIZON']

export interface ScheduledInject { injectId: string; at: number }
export interface IncidentPlan {
  id: string
  seed: number
  codename: string
  difficulty: Difficulty
  vectors: VectorId[]
  duration: number
  schedule: ScheduledInject[]
}

export function generateIncident(vectors: VectorId[], difficulty: Difficulty, seed = Date.now() % 1e9): IncidentPlan {
  const r = rng(seed)
  const d = DIFFICULTY[difficulty]
  const picks = vectors.map((v) => {
    const pool = INJECTS.filter(i => i.vector === v)
    return pool[Math.floor(r() * pool.length)]
  })
  // shuffle
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]]
  }
  let t = 3
  const schedule = picks.map((p) => {
    const at = t
    t += d.gap[0] + Math.floor(r() * (d.gap[1] - d.gap[0]))
    return { injectId: p.id, at }
  })
  return {
    id: `IR-${seed.toString(36).toUpperCase().slice(-5)}`,
    seed,
    codename: CODENAMES[Math.floor(r() * CODENAMES.length)],
    difficulty,
    vectors,
    duration: d.seconds,
    schedule,
  }
}

export const injectById = (id: string) => INJECTS.find(i => i.id === id)!
