/**
 * The mock work environment and its rules. PURE: no Nuxt, no AI, no clock (callers pass `t`,
 * ms since the round started), so every rule is unit-tested directly.
 *
 * The attacker acts AS the employee: its sessions, mail rules and customer changes show the
 * employee's name. The tells are the IP/location, the timing and what was changed. Which things
 * the attacker created is tracked only in `truth`, never in the world the browser sees.
 *
 * IPs come from reserved documentation ranges (192.0.2.x, 198.51.100.x, 203.0.113.x): never real.
 */
import type {
  ArenaMode,
  AttackerTool,
  Customer,
  CustomerField,
  EnvAction,
  Verdict,
  World,
} from '@hackutd2026/shared/arena';

export interface EnvJudgment {
  verdict: Verdict;
  points: number;
  reason: string;
}

export interface AttackerRecord {
  id: string; // id of the thing it created (session, rule, change, ...) or of the activity entry
  kind: AttackerTool['tool'] | 'sign_in';
  text: string; // plain description, revealed in the summary
  undoable: boolean; // false for sent mail / exported data: can only be reported
  customerId?: string;
}

export interface Truth {
  credsLeaked: boolean; // attacker knows the current password
  everLeaked: boolean;
  attackerIds: Set<string>; // ids of sessions / mfa / rules / changes the attacker created
  records: AttackerRecord[];
  encryptedByAttacker: boolean; // ransomware ran at least once
  reported: boolean;
}

export interface Env {
  world: World;
  truth: Truth;
  seq: number; // id counter
}

/** Thrown for actions that can't apply (unknown id, already done). Routes turn it into a 400. */
export class EnvError extends Error {}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const YOU_LAPTOP = { location: 'Dallas, TX', ip: '192.0.2.10' };
const ATTACKER_ORIGINS = [
  { location: 'Unknown VPN exit', ip: '203.0.113.77' },
  { location: 'Bucharest, RO', ip: '198.51.100.23' },
  { location: 'Lagos, NG', ip: '203.0.113.141' },
  { location: 'São Paulo, BR', ip: '198.51.100.186' },
];

function nextId(env: Env, prefix: string): string {
  env.seq += 1;
  return `${prefix}-${env.seq}`;
}

const signIns = (env: Env) => env.truth.records.filter((r) => r.kind === 'sign_in').length;

/** Where the attacker is acting from: stays the same until they sign in again (new VPN exit). */
function origin(env: Env) {
  return ATTACKER_ORIGINS[Math.max(signIns(env) - 1, 0) % ATTACKER_ORIGINS.length]!;
}

function activity(env: Env, t: number, text: string, where = YOU_LAPTOP, byAttacker = false): string {
  const id = nextId(env, 'act');
  env.world.activity.push({
    id,
    at: t,
    actor: env.world.employeeName,
    ip: where.ip,
    location: where.location,
    text,
  });
  if (byAttacker) env.truth.attackerIds.add(id);
  return id;
}

// ---------- seeding ----------

function baseWorld(employeeName: string): World {
  const customer = (id: string, name: string, last4: string, email: string, sim: string): Customer => ({
    id,
    name,
    line: `(•••) •••-${last4}`,
    email,
    simLast4: sim,
    portFreeze: false,
    history: [],
  });
  const customers = [
    customer('cust-1001', 'Jordan Reyes', '4821', 'jordan.reyes@mailbox.example', '3392'),
    customer('cust-1002', 'Priya Nair', '7310', 'priya.n@inboxly.example', '0471'),
    customer('cust-1003', 'Marcus Bell', '5502', 'marcus.bell@mailbox.example', '8820'),
    customer('cust-1004', 'Elena Ortiz', '1187', 'elena.ortiz@inboxly.example', '1294'),
  ];
  // one legitimate change, so "revert everything" isn't a winning strategy
  customers[1]!.history.push({
    id: 'chg-legit-1',
    at: -10 * DAY,
    field: 'email',
    from: 'priya.nair@oldmail.example',
    to: 'priya.n@inboxly.example',
    by: 'Priya Nair (self-service app)',
    reverted: false,
  });
  return {
    employeeName,
    sessions: [
      {
        id: 'sess-laptop',
        device: 'Work laptop · Chrome',
        location: YOU_LAPTOP.location,
        ip: YOU_LAPTOP.ip,
        startedAt: -3 * HOUR,
        current: true,
      },
      {
        id: 'sess-phone',
        device: 'Your phone · CorpMobile app',
        location: 'Dallas, TX',
        ip: '192.0.2.44',
        startedAt: -1 * DAY,
        current: false,
      },
    ],
    mfaDevices: [{ id: 'mfa-phone', name: 'Authenticator app on your phone', addedAt: -200 * DAY }],
    passwordChangedAt: -40 * DAY,
    forwardingRules: [
      { id: 'rule-finance', match: 'invoice', forwardTo: 'ap@corp.example', createdAt: -90 * DAY },
    ],
    sentMail: [],
    customers,
    files: [
      'Q4 retention plan.xlsx',
      'Store 112 schedule.pdf',
      'Customer escalations.docx',
      'Team contacts.csv',
    ].map((name) => ({ name, encrypted: false })),
    ransomNote: null,
    activity: [
      {
        id: 'act-seed-1',
        at: -3 * HOUR,
        actor: employeeName,
        ip: YOU_LAPTOP.ip,
        location: YOU_LAPTOP.location,
        text: 'Signed in',
      },
      {
        id: 'act-seed-2',
        at: -2 * HOUR,
        actor: employeeName,
        ip: YOU_LAPTOP.ip,
        location: YOU_LAPTOP.location,
        text: 'Viewed customer Jordan Reyes',
      },
    ],
  };
}

export function seedEnv(mode: ArenaMode, employeeName = 'You'): Env {
  const env: Env = {
    world: baseWorld(employeeName),
    truth: {
      credsLeaked: false,
      everLeaked: false,
      attackerIds: new Set(),
      records: [],
      encryptedByAttacker: false,
      reported: false,
    },
    seq: 0,
  };
  if (mode === 'breach') {
    // The attacker phished the password ~an hour ago and has been busy. Times are before the round.
    leakCredentials(env, -55 * 60_000);
    applyAttackerTools(env, [{ tool: 'add_mfa_device', name: 'Pixel 7 (new)' }], -50 * 60_000);
    applyAttackerTools(
      env,
      [{ tool: 'add_forwarding_rule', match: '*', forwardTo: 'archive.backup@freemail.example' }],
      -45 * 60_000
    );
    applyAttackerTools(
      env,
      [
        {
          tool: 'change_customer',
          customerId: 'cust-1003',
          field: 'email',
          value: 'm.bell.secure@freemail.example',
        },
      ],
      -20 * 60_000
    );
  }
  return env;
}

// ---------- access ----------

export function attackerSessionActive(env: Env): boolean {
  return env.world.sessions.some((s) => env.truth.attackerIds.has(s.id));
}

/** The attacker can act if it knows the password or still has a signed-in session. */
export function hasAccess(env: Env): boolean {
  return env.truth.credsLeaked || attackerSessionActive(env);
}

function attackerSignIn(env: Env, t: number) {
  const where = ATTACKER_ORIGINS[signIns(env) % ATTACKER_ORIGINS.length]!;
  const id = nextId(env, 'sess');
  env.world.sessions.push({
    id,
    device: 'Unknown device · Firefox',
    location: where.location,
    ip: where.ip,
    startedAt: t,
    current: false,
  });
  env.truth.attackerIds.add(id);
  activity(env, t, 'Signed in', where, true);
  env.truth.records.push({
    id,
    kind: 'sign_in',
    text: `Signed in to your account from ${where.location} (${where.ip})`,
    undoable: true,
  });
}

/** The employee typed their password into an attacker's page. */
export function leakCredentials(env: Env, t: number): boolean {
  if (env.truth.credsLeaked) return false;
  env.truth.credsLeaked = true;
  env.truth.everLeaked = true;
  attackerSignIn(env, t);
  return true;
}

/**
 * Runs before every attacker turn. Persistence rules that teach the right ORDER:
 *  - kicked out but still knows the password -> signs straight back in
 *  - files restored while the attacker still has access -> encrypted again
 * Returns plain notes for the attacker's history.
 */
export function beforeAttackerTurn(env: Env, t: number): string[] {
  const notes: string[] = [];
  if (env.truth.credsLeaked && !attackerSessionActive(env)) {
    attackerSignIn(env, t);
    notes.push('your session was revoked, but you still know the password, so you signed back in');
  }
  if (hasAccess(env) && env.truth.encryptedByAttacker && !env.world.files.some((f) => f.encrypted)) {
    for (const f of env.world.files) f.encrypted = true;
    env.world.ransomNote ??=
      'Your files were encrypted again. Restoring them while we still have access was a mistake.';
    activity(
      env,
      t,
      `Files on your drive were modified (${env.world.files.length} files)`,
      origin(env),
      true
    );
    notes.push('they restored the files while you still had access, so you encrypted them again');
  }
  return notes;
}

// ---------- attacker tools ----------

const OFF = /^(off|false|0|no|disabled?)$/i;

export function applyAttackerTools(
  env: Env,
  tools: readonly AttackerTool[],
  t: number
): { applied: string[]; rejected: string[] } {
  const applied: string[] = [];
  const rejected: string[] = [];
  for (const tool of tools) {
    if (!hasAccess(env)) {
      rejected.push(`${tool.tool}: you have no access to the account`);
      continue;
    }
    const where = origin(env);
    switch (tool.tool) {
      case 'add_forwarding_rule': {
        const id = nextId(env, 'rule');
        env.world.forwardingRules.push({ id, match: tool.match, forwardTo: tool.forwardTo, createdAt: t });
        env.truth.attackerIds.add(id);
        activity(env, t, `Created mail rule: forward "${tool.match}" to ${tool.forwardTo}`, where, true);
        env.truth.records.push({
          id,
          kind: tool.tool,
          text: `Added a mail rule forwarding "${tool.match}" to ${tool.forwardTo}`,
          undoable: true,
        });
        applied.push(`added forwarding rule to ${tool.forwardTo}`);
        break;
      }
      case 'send_mail_as_you': {
        const id = nextId(env, 'mail');
        env.world.sentMail.push({ id, to: tool.to, subject: tool.subject, body: tool.body, at: t });
        env.truth.attackerIds.add(id);
        activity(env, t, `Sent email to ${tool.to}: "${tool.subject}"`, where, true);
        env.truth.records.push({
          id,
          kind: tool.tool,
          text: `Sent "${tool.subject}" to ${tool.to} as you`,
          undoable: false,
        });
        applied.push(`sent mail as the employee to ${tool.to}`);
        break;
      }
      case 'add_mfa_device': {
        const id = nextId(env, 'mfa');
        env.world.mfaDevices.push({ id, name: tool.name, addedAt: t });
        env.truth.attackerIds.add(id);
        activity(env, t, `Added sign-in device "${tool.name}"`, where, true);
        env.truth.records.push({
          id,
          kind: tool.tool,
          text: `Added their own sign-in device "${tool.name}"`,
          undoable: true,
        });
        applied.push(`added MFA device ${tool.name}`);
        break;
      }
      case 'change_customer': {
        const c = env.world.customers.find((x) => x.id === tool.customerId);
        if (!c) {
          rejected.push(`change_customer: no customer ${tool.customerId}`);
          break;
        }
        const id = nextId(env, 'chg');
        const before = currentValue(c, tool.field);
        const after = normalizeValue(tool.field, tool.value);
        setValue(c, tool.field, after);
        c.history.push({
          id,
          at: t,
          field: tool.field,
          from: before,
          to: after,
          by: env.world.employeeName,
          reverted: false,
        });
        env.truth.attackerIds.add(id);
        activity(env, t, `Updated customer ${c.name}: ${fieldLabel(tool.field)}`, where, true);
        env.truth.records.push({
          id,
          kind: tool.tool,
          text: `Changed ${c.name}'s ${fieldLabel(tool.field)} from "${before}" to "${after}"`,
          undoable: true,
          customerId: c.id,
        });
        applied.push(`changed ${c.name} ${tool.field}`);
        break;
      }
      case 'encrypt_files': {
        if (env.world.files.every((f) => f.encrypted)) {
          rejected.push('encrypt_files: already encrypted');
          break;
        }
        for (const f of env.world.files) f.encrypted = true;
        env.world.ransomNote = tool.note;
        env.truth.encryptedByAttacker = true;
        const id = activity(
          env,
          t,
          `Files on your drive were modified (${env.world.files.length} files)`,
          where,
          true
        );
        env.truth.records.push({
          id,
          kind: tool.tool,
          text: 'Encrypted the files on your drive and left a ransom note',
          undoable: true,
        });
        applied.push('encrypted files');
        break;
      }
      case 'export_customers': {
        if (env.truth.records.some((r) => r.kind === 'export_customers')) {
          rejected.push('export_customers: already exported');
          break;
        }
        const id = activity(
          env,
          t,
          `Exported customer list (${env.world.customers.length} records)`,
          where,
          true
        );
        env.truth.records.push({
          id,
          kind: tool.tool,
          text: `Exported the customer list (${env.world.customers.length} records)`,
          undoable: false,
        });
        applied.push('exported customers');
        break;
      }
    }
  }
  return { applied, rejected };
}

function fieldLabel(f: CustomerField): string {
  return f === 'email' ? 'email' : f === 'sim' ? 'SIM card' : 'port-out freeze';
}
function currentValue(c: Customer, f: CustomerField): string {
  return f === 'email' ? c.email : f === 'sim' ? c.simLast4 : c.portFreeze ? 'on' : 'off';
}
function normalizeValue(f: CustomerField, v: string): string {
  if (f === 'sim') return (v.replace(/\D/g, '').slice(-4) || '0000').padStart(4, '0');
  if (f === 'portFreeze') return OFF.test(v.trim()) ? 'off' : 'on';
  return v.trim();
}
function setValue(c: Customer, f: CustomerField, v: string) {
  if (f === 'email') c.email = v;
  else if (f === 'sim') c.simLast4 = v;
  else c.portFreeze = v === 'on';
}

// ---------- employee actions ----------

const ideal = (points: number, reason: string): EnvJudgment => ({ verdict: 'ideal', points, reason });
const ok = (points: number, reason: string): EnvJudgment => ({ verdict: 'ok', points, reason });
const neutral = (reason: string): EnvJudgment => ({ verdict: 'neutral', points: 0, reason });
const harmful = (points: number, reason: string): EnvJudgment => ({ verdict: 'harmful', points, reason });

export function describeEnvAction(env: Env, a: EnvAction): string {
  switch (a.action) {
    case 'revoke_session':
      return `Revoked session ${env.world.sessions.find((s) => s.id === a.sessionId)?.location ?? a.sessionId}`;
    case 'remove_mfa_device':
      return `Removed sign-in device ${env.world.mfaDevices.find((d) => d.id === a.deviceId)?.name ?? a.deviceId}`;
    case 'reset_password':
      return 'Reset password';
    case 'delete_forwarding_rule':
      return `Deleted mail rule ${env.world.forwardingRules.find((r) => r.id === a.ruleId)?.forwardTo ?? a.ruleId}`;
    case 'revert_customer_change':
      return `Reverted a change on ${env.world.customers.find((c) => c.id === a.customerId)?.name ?? a.customerId}`;
    case 'enable_port_freeze':
      return `Turned on port freeze for ${env.world.customers.find((c) => c.id === a.customerId)?.name ?? a.customerId}`;
    case 'restore_files':
      return 'Restored files from backup';
    case 'report_incident':
      return 'Reported an incident to security';
  }
}

/** Applies an employee action to the world and judges it. Throws EnvError if it can't apply. */
export function applyEnvAction(env: Env, a: EnvAction, t: number): EnvJudgment {
  const what = describeEnvAction(env, a); // now, while the target still exists
  const w = env.world;
  const tr = env.truth;
  let j: EnvJudgment;
  switch (a.action) {
    case 'revoke_session': {
      const s = w.sessions.find((x) => x.id === a.sessionId);
      if (!s) throw new EnvError('That session no longer exists');
      w.sessions = w.sessions.filter((x) => x.id !== s.id);
      if (tr.attackerIds.has(s.id)) {
        j = ideal(100, `Kicked out the session from ${s.location}.`);
        if (tr.credsLeaked) j.reason += ' They still know your password, though.';
      } else if (s.current) {
        // you can't actually sign yourself out of the training; keep the session, just judge it
        w.sessions.push(s);
        j = harmful(-50, "That's the session you're using right now. Look for the one you don't recognize.");
      } else {
        j = neutral('That was your own phone. Harmless, but not the threat.');
      }
      break;
    }
    case 'remove_mfa_device': {
      const d = w.mfaDevices.find((x) => x.id === a.deviceId);
      if (!d) throw new EnvError('That device no longer exists');
      w.mfaDevices = w.mfaDevices.filter((x) => x.id !== d.id);
      j = tr.attackerIds.has(d.id)
        ? ideal(100, `Removed "${d.name}", the attacker's backdoor sign-in device.`)
        : harmful(-50, 'That was your own authenticator. Now you need IT to get back in.');
      break;
    }
    case 'reset_password': {
      w.passwordChangedAt = t;
      if (tr.credsLeaked) {
        tr.credsLeaked = false;
        j = ideal(100, 'Password reset: the stolen password no longer works.');
        if (attackerSessionActive(env)) j.reason += ' Their open session is still signed in, though.';
      } else {
        j = neutral(
          tr.everLeaked
            ? 'Password changed again. It was already safe.'
            : 'Password changed. Nothing had been stolen yet.'
        );
      }
      break;
    }
    case 'delete_forwarding_rule': {
      const r = w.forwardingRules.find((x) => x.id === a.ruleId);
      if (!r) throw new EnvError('That rule no longer exists');
      w.forwardingRules = w.forwardingRules.filter((x) => x.id !== r.id);
      j = tr.attackerIds.has(r.id)
        ? ideal(100, `Deleted the rule forwarding your mail to ${r.forwardTo}.`)
        : harmful(-50, `That was a real rule: Finance relies on invoices going to ${r.forwardTo}.`);
      break;
    }
    case 'revert_customer_change': {
      const c = w.customers.find((x) => x.id === a.customerId);
      const ch = c?.history.find((x) => x.id === a.changeId);
      if (!c || !ch) throw new EnvError('That change no longer exists');
      if (ch.reverted) throw new EnvError('That change was already reverted');
      ch.reverted = true;
      setValue(c, ch.field, ch.from);
      j = tr.attackerIds.has(ch.id)
        ? ideal(100, `Reverted the unauthorized ${fieldLabel(ch.field)} change on ${c.name}.`)
        : harmful(
            -50,
            `That was a legitimate change ${c.name} made. Check who made a change before undoing it.`
          );
      break;
    }
    case 'enable_port_freeze': {
      const c = w.customers.find((x) => x.id === a.customerId);
      if (!c) throw new EnvError('Unknown customer');
      if (c.portFreeze) throw new EnvError('Port freeze is already on');
      const id = nextId(env, 'chg');
      c.history.push({
        id,
        at: t,
        field: 'portFreeze',
        from: 'off',
        to: 'on',
        by: w.employeeName,
        reverted: false,
      });
      c.portFreeze = true;
      const targeted = tr.records.some((r) => r.customerId === c.id);
      j = targeted
        ? ok(50, `Good: ${c.name} was targeted, and a port freeze blocks number theft.`)
        : neutral(`${c.name} wasn't targeted, but a freeze doesn't hurt.`);
      break;
    }
    case 'restore_files': {
      if (!w.files.some((f) => f.encrypted)) throw new EnvError('No encrypted files to restore');
      for (const f of w.files) f.encrypted = false;
      w.ransomNote = null;
      j = hasAccess(env)
        ? ok(
            25,
            'Restored, but the attacker still has access and can encrypt them again. Lock them out first.'
          )
        : ideal(100, 'Restored from backup after locking the attacker out: right order.');
      break;
    }
    case 'report_incident': {
      if (!tr.records.length) j = neutral('Nothing suspicious has happened on your account yet.');
      else if (tr.reported) j = neutral('Already reported.');
      else {
        tr.reported = true;
        j = ideal(75, 'Reported. Security can trace the attacker and warn anyone affected.');
      }
      break;
    }
  }
  activity(env, t, what);
  return j;
}

// ---------- summary facts ----------

export function isRemediated(env: Env, r: AttackerRecord): boolean {
  const w = env.world;
  switch (r.kind) {
    case 'sign_in':
      return !w.sessions.some((s) => s.id === r.id) && !env.truth.credsLeaked;
    case 'add_forwarding_rule':
      return !w.forwardingRules.some((x) => x.id === r.id);
    case 'add_mfa_device':
      return !w.mfaDevices.some((x) => x.id === r.id);
    case 'change_customer':
      return w.customers.some((c) => c.history.some((h) => h.id === r.id && h.reverted));
    case 'encrypt_files':
      return !w.files.some((f) => f.encrypted);
    case 'send_mail_as_you':
    case 'export_customers':
      return env.truth.reported; // can't be undone; reporting is the right response
  }
}

export function outcome(env: Env): 'clean' | 'contained' | 'compromised' {
  if (!env.truth.records.length) return 'clean';
  return !hasAccess(env) && env.truth.records.every((r) => isRemediated(env, r))
    ? 'contained'
    : 'compromised';
}

/** What the attacker model is allowed to know about the environment. */
export function attackerView(env: Env): string {
  const w = env.world;
  if (!hasAccess(env))
    return 'You do NOT have access to the employee account yet. Tools will fail; trick them first.';
  return [
    'You HAVE access to the employee account.',
    `Customers: ${w.customers.map((c) => `${c.id} ${c.name} (email ${c.email}, SIM ${c.simLast4}, port freeze ${c.portFreeze ? 'on' : 'off'})`).join('; ')}`,
    `Mail rules: ${w.forwardingRules.map((r) => `"${r.match}" -> ${r.forwardTo}`).join('; ') || 'none'}`,
    `Files: ${w.files.map((f) => `${f.name}${f.encrypted ? ' (encrypted)' : ''}`).join(', ')}`,
  ].join('\n');
}
