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

// ---------- Simulations ----------

const scenario = table(
  { name: 'scenario' },
  {
    id: t.u64().primaryKey().autoInc(),
    attackType: t.string().index('btree'),
    title: t.string(),
    difficulty: t.string(), // 'easy' | 'medium' | 'hard'
    summary: t.string(), // one-liner shown in lists
    briefing: t.string(), // shown to the employee when the simulation starts
    contentJson: t.string(), // ScenarioContent in shared/: what the employee sees
    rubricJson: t.string(), // ScenarioRubric in shared/: admin-only answer key
    source: t.string(), // 'manual' for now; 'gemini' once generation lands
    status: t.string(), // 'draft' | 'published'
    createdBy: t.u64(),
    createdAt: t.timestamp(),
  }
);

// An admin pushes a scenario to an employee; it pops up on their dashboard.
const assignment = table(
  { name: 'assignment' },
  {
    id: t.u64().primaryKey().autoInc(),
    scenarioId: t.u64().index('btree'),
    accountId: t.u64().index('btree'),
    assignedBy: t.u64(),
    popupMessage: t.string(),
    status: t.string(), // 'assigned' | 'in_progress' | 'submitted' | 'reviewed'
    assignedAt: t.timestamp(),
    startedAt: t.option(t.timestamp()),
    submittedAt: t.option(t.timestamp()),
  }
);

// Everything the employee does inside a simulation run, for the admin's report.
const runEvent = table(
  { name: 'run_event' },
  {
    id: t.u64().primaryKey().autoInc(),
    assignmentId: t.u64().index('btree'),
    kind: t.string(), // RunEventKind in shared/
    stepId: t.string(), // '' when not tied to one scenario step
    detail: t.string(),
    at: t.timestamp(),
  }
);

// Employee's incident action report, submitted at the end of a simulation.
const incidentReport = table(
  { name: 'incident_report' },
  {
    assignmentId: t.u64().primaryKey(),
    accountId: t.u64().index('btree'),
    summary: t.string(),
    actionsTaken: t.string(),
    submittedAt: t.timestamp(),
  }
);

// Admin grading. The employee only sees the score once approved is true.
const review = table(
  { name: 'review' },
  {
    assignmentId: t.u64().primaryKey(),
    reviewerId: t.u64(),
    score: t.u32(), // 0-100
    feedback: t.string(),
    approved: t.bool(),
    reviewedAt: t.timestamp(),
  }
);

const spacetimedb = schema({
  account,
  pendingLogin,
  session,
  moduleOwner,
  guide,
  practiceQuestion,
  practiceAnswer,
  scenario,
  assignment,
  runEvent,
  incidentReport,
  review,
});
export default spacetimedb;
