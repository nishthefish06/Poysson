import { schema, table, t } from 'spacetimedb/server';

// Every table is private (the default). Clients read data only through the
// per-user views in views.ts, which check the caller's session and role.

// ---------- Auth ----------

const account = table(
  { name: 'account' },
  {
    id: t.u64().primaryKey().autoInc(),
    email: t.string().unique(),
    displayName: t.string(),
    role: t.string(), // 'employee' | 'admin'
    phone: t.string(),
    passwordHash: t.string(),
    passwordSalt: t.string(),
    totpSecret: t.option(t.string()), // base32; set once the employee enrolls an authenticator app
    totpLastStep: t.i64(), // last accepted 30s step, blocks code replay
    isDemo: t.bool(), // demo accounts skip 2FA so judges can log in without an authenticator app
    createdAt: t.timestamp(),
  }
);

// Password accepted, second factor still pending. Keyed by the browser's SpacetimeDB identity.
const pendingLogin = table(
  { name: 'pending_login' },
  {
    identity: t.identity().primaryKey(),
    accountId: t.u64(),
    stage: t.string(), // 'totp' | 'enroll'
    createdAt: t.timestamp(),
  }
);

// Fully signed-in browser identities.
const session = table(
  { name: 'session' },
  {
    identity: t.identity().primaryKey(),
    accountId: t.u64().index('btree'),
    createdAt: t.timestamp(),
  }
);

// Identity that published the module; allowed to bootstrap the first admin.
const moduleOwner = table(
  { name: 'module_owner' },
  {
    id: t.u32().primaryKey(),
    identity: t.identity(),
  }
);

// ---------- Training content ----------

const guide = table(
  { name: 'guide' },
  {
    id: t.u64().primaryKey().autoInc(),
    attackType: t.string().index('btree'),
    title: t.string(),
    summary: t.string(),
    body: t.string(), // markdown
    sortOrder: t.u32(),
  }
);

const practiceQuestion = table(
  { name: 'practice_question' },
  {
    id: t.u64().primaryKey().autoInc(),
    attackType: t.string().index('btree'),
    prompt: t.string(),
    choices: t.array(t.string()),
    correctIndex: t.u32(),
    explanation: t.string(),
  }
);

const practiceAnswer = table(
  {
    name: 'practice_answer',
    indexes: [{ accessor: 'by_account_question', algorithm: 'btree', columns: ['accountId', 'questionId'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    accountId: t.u64(),
    questionId: t.u64(),
    choiceIndex: t.u32(),
    correct: t.bool(),
    answeredAt: t.timestamp(),
  }
);

// Trusted server-side clients (the Nuxt server routes that run the Nemotron agent). They register
// with the SERVICE_SECRET set at publish time.
const serviceIdentity = table(
  { name: 'service_identity' },
  {
    identity: t.identity().primaryKey(),
    label: t.string(),
    registeredAt: t.timestamp(),
  }
);

// ---------- Simulations ----------

const scenario = table(
  { name: 'scenario' },
  {
    id: t.u64().primaryKey().autoInc(),
    attackType: t.string().index('btree'), // AttackType
    title: t.string(),
    difficulty: t.string(), // Difficulty
    summary: t.string(), // one-liner shown in lists
    briefing: t.string(), // shown to the employee when the simulation starts
    contentJson: t.string(), // ScenarioContent in shared/: what the employee sees
    rubricJson: t.string(), // ScenarioRubric in shared/: answer key for admins and the agent
    source: t.string(), // ScenarioSource: 'manual' | 'nemotron'
    status: t.string(), // 'draft' | 'published'
    createdBy: t.u64(), // account id; 0 for the agent
    createdAt: t.timestamp(),
  }
);

// One attempt at a scenario: assigned by an admin (pops up on the dashboard) or self-started.
const simRun = table(
  { name: 'sim_run' },
  {
    id: t.u64().primaryKey().autoInc(),
    scenarioId: t.u64().index('btree'),
    accountId: t.u64().index('btree'),
    assignedBy: t.u64(), // admin id, or the employee's own id when self-started
    mode: t.string(), // SimMode: 'guided' | 'unguided'
    status: t.string(), // RunStatus
    stage: t.string(), // AttackStage the run is in now
    difficulty: t.u32(), // 1-5, adjusted live by the agent
    lockedOut: t.bool(), // ransomware: the employee's simulated dashboard is locked
    popupMessage: t.string(),
    assignedAt: t.timestamp(),
    startedAt: t.option(t.timestamp()),
    submittedAt: t.option(t.timestamp()),
  }
);

// Everything the employee does inside a run (structured actions, for scoring).
const runEvent = table(
  { name: 'run_event' },
  {
    id: t.u64().primaryKey().autoInc(),
    runId: t.u64().index('btree'),
    kind: t.string(), // RunEventKind in shared/
    stepId: t.string(), // '' when not tied to one scenario step
    detail: t.string(),
    at: t.timestamp(),
  }
);

// Live conversation in a run: the Nemotron attacker, the employee, coaching and system notes.
const simMessage = table(
  { name: 'sim_message' },
  {
    id: t.u64().primaryKey().autoInc(),
    runId: t.u64().index('btree'),
    sender: t.string(), // SimSender
    channel: t.string(), // Channel the message arrives on
    from: t.string(), // who it claims to be from ('' for employee/system)
    stage: t.string(), // AttackStage
    body: t.string(),
    at: t.timestamp(),
  }
);

// Employee's incident action report, submitted at the end of a run.
const runReport = table(
  { name: 'run_report' },
  {
    runId: t.u64().primaryKey(),
    accountId: t.u64().index('btree'),
    summary: t.string(),
    actionsTaken: t.string(),
    submittedAt: t.timestamp(),
  }
);

// Score for a run, from the agent or an admin. The employee sees it once approved is true;
// agent scores are approved immediately, admin scores when the admin approves.
const review = table(
  { name: 'review' },
  {
    runId: t.u64().primaryKey(),
    reviewerKind: t.string(), // 'agent' | 'admin'
    reviewerId: t.u64(), // admin id, 0 for the agent
    score: t.u32(), // 0-100
    feedback: t.string(),
    strengths: t.array(t.string()),
    mistakes: t.array(t.string()),
    approved: t.bool(),
    reviewedAt: t.timestamp(),
  }
);

const spacetimedb = schema(
  {
    account,
    pendingLogin,
    session,
    moduleOwner,
    serviceIdentity,
    guide,
    practiceQuestion,
    practiceAnswer,
    scenario,
    simRun,
    runEvent,
    simMessage,
    runReport,
    review,
  },
  {
    env: {
      // Shared secret that lets a server-side client register as a service identity.
      // Set at publish time: `SERVICE_SECRET=... spacetime publish`. Never committed.
      SERVICE_SECRET: t.string().optional(),
    },
  }
);
export default spacetimedb;
