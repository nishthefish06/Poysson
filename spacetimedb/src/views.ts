// The client-facing read API. Tables are private; each view returns only what the
// caller's session and role allow. Subscribe with e.g. `SELECT * FROM my_account`.
import { t } from 'spacetimedb/server';
import spacetimedb from './schema';
import { AttackType } from '@hackutd2026/shared';
import { currentAccount, isService, type ReadCtx } from './access';

// ---------- Output types ----------

const AccountInfo = t.object('AccountInfo', {
  id: t.u64(),
  email: t.string(),
  displayName: t.string(),
  role: t.string(),
  phone: t.string(),
  totpEnabled: t.bool(),
  isDemo: t.bool(),
});

const LoginState = t.object('LoginState', {
  stage: t.string(), // 'totp' | 'enroll'
  email: t.string(), // for the otpauth:// label during enrollment
});

const GuideInfo = t.object('GuideInfo', {
  id: t.u64(),
  attackType: t.string(),
  title: t.string(),
  summary: t.string(),
  body: t.string(),
  sortOrder: t.u32(),
  audience: t.string(), // 'employee' | 'responder'
});

const QuestionInfo = t.object('QuestionInfo', {
  id: t.u64(),
  attackType: t.string(),
  prompt: t.string(),
  choices: t.array(t.string()),
});

const AnswerInfo = t.object('AnswerInfo', {
  questionId: t.u64(),
  choiceIndex: t.u32(),
  correct: t.bool(),
  correctIndex: t.u32(), // revealed once answered
  explanation: t.string(),
});

const RunInfo = t.object('RunInfo', {
  id: t.u64(),
  scenarioId: t.u64(),
  attackType: t.string(),
  title: t.string(),
  difficulty: t.string(), // the scenario's label
  summary: t.string(),
  briefing: t.string(),
  contentJson: t.string(), // ScenarioContent: steps with stage and hint
  mode: t.string(), // 'guided' | 'unguided'
  status: t.string(),
  stage: t.string(), // current AttackStage
  liveDifficulty: t.u32(), // 1-5, moved by the agent
  lockedOut: t.bool(), // show the locked-dashboard screen
  selfStarted: t.bool(),
  popupMessage: t.string(),
  assignedAt: t.timestamp(),
  startedAt: t.option(t.timestamp()),
  submittedAt: t.option(t.timestamp()),
  // Present once the run is scored (agent) or the admin approved a score.
  score: t.option(t.u32()),
  feedback: t.option(t.string()),
  strengths: t.option(t.array(t.string())),
  mistakes: t.option(t.array(t.string())),
});

const MessageInfo = t.object('MessageInfo', {
  id: t.u64(),
  runId: t.u64(),
  sender: t.string(),
  channel: t.string(),
  from: t.string(),
  stage: t.string(),
  body: t.string(),
  at: t.timestamp(),
});

const RunEventInfo = t.object('RunEventInfo', {
  id: t.u64(),
  runId: t.u64(),
  kind: t.string(),
  stepId: t.string(),
  detail: t.string(),
  at: t.timestamp(),
});

const ScenarioCard = t.object('ScenarioCard', {
  id: t.u64(),
  attackType: t.string(),
  title: t.string(),
  difficulty: t.string(),
  summary: t.string(),
  source: t.string(),
});

const StatsInfo = t.object('StatsInfo', {
  assigned: t.u32(),
  inProgress: t.u32(),
  submitted: t.u32(),
  reviewed: t.u32(), // simulations completed and scored
  averageScore: t.option(t.f64()),
  practiceAnswered: t.u32(),
  practiceCorrect: t.u32(),
});

const AttackStats = t.object('AttackStats', {
  accountId: t.u64(),
  attackType: t.string(),
  runsScored: t.u32(),
  averageScore: t.option(t.f64()),
  bestScore: t.option(t.u32()),
  practiceAnswered: t.u32(),
  practiceCorrect: t.u32(),
});

const AdminAccountInfo = t.object('AdminAccountInfo', {
  id: t.u64(),
  email: t.string(),
  displayName: t.string(),
  role: t.string(),
  phone: t.string(),
  totpEnabled: t.bool(),
  isDemo: t.bool(),
  createdAt: t.timestamp(),
});

const ScenarioFull = t.object('ScenarioFull', {
  id: t.u64(),
  attackType: t.string(),
  title: t.string(),
  difficulty: t.string(),
  summary: t.string(),
  briefing: t.string(),
  contentJson: t.string(),
  rubricJson: t.string(),
  source: t.string(),
  status: t.string(),
  createdBy: t.u64(),
  createdAt: t.timestamp(),
});

const RunFull = t.object('RunFull', {
  id: t.u64(),
  scenarioId: t.u64(),
  scenarioTitle: t.string(),
  attackType: t.string(),
  accountId: t.u64(),
  employeeName: t.string(),
  mode: t.string(),
  status: t.string(),
  stage: t.string(),
  liveDifficulty: t.u32(),
  lockedOut: t.bool(),
  selfStarted: t.bool(),
  popupMessage: t.string(),
  assignedAt: t.timestamp(),
  startedAt: t.option(t.timestamp()),
  submittedAt: t.option(t.timestamp()),
  reportSummary: t.option(t.string()),
  reportActions: t.option(t.string()),
  score: t.option(t.u32()),
  feedback: t.option(t.string()),
  reviewerKind: t.option(t.string()),
  approved: t.bool(),
});

function adminOrNull(ctx: ReadCtx) {
  const me = currentAccount(ctx);
  return me && me.role === 'admin' ? me : null;
}

// The Nemotron agent and admins see every run, message and answer key.
function isAgentOrAdmin(ctx: ReadCtx) {
  return isService(ctx) || adminOrNull(ctx) != null;
}

function visibleReview(ctx: ReadCtx, runId: bigint) {
  const r = ctx.db.review.runId.find(runId);
  return r && r.approved ? r : undefined;
}

function attackStats(ctx: ReadCtx, accountId: bigint) {
  const out = [];
  for (const attackType of AttackType.options) {
    const scores: number[] = [];
    for (const run of ctx.db.simRun.accountId.filter(accountId)) {
      const s = ctx.db.scenario.id.find(run.scenarioId);
      const r = visibleReview(ctx, run.id);
      if (s?.attackType === attackType && r) scores.push(r.score);
    }
    let practiceAnswered = 0;
    let practiceCorrect = 0;
    for (const q of ctx.db.practiceQuestion.attackType.filter(attackType)) {
      for (const a of ctx.db.practiceAnswer.by_account_question.filter([accountId, q.id])) {
        practiceAnswered++;
        if (a.correct) practiceCorrect++;
      }
    }
    out.push({
      accountId,
      attackType,
      runsScored: scores.length,
      averageScore: scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : undefined,
      bestScore: scores.length ? Math.max(...scores) : undefined,
      practiceAnswered,
      practiceCorrect,
    });
  }
  return out;
}

// ---------- Everyone ----------

export const myAccount = spacetimedb.view(
  { name: 'my_account', public: true },
  t.option(AccountInfo),
  (ctx) => {
    const a = currentAccount(ctx);
    if (!a) return undefined;
    return {
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      role: a.role,
      phone: a.phone,
      totpEnabled: a.totpSecret != null,
      isDemo: a.isDemo,
    };
  }
);

// Present between a successful password check and the 2FA step.
export const myLoginState = spacetimedb.view(
  { name: 'my_login_state', public: true },
  t.option(LoginState),
  (ctx) => {
    const p = ctx.db.pendingLogin.identity.find(ctx.sender);
    if (!p) return undefined;
    const a = ctx.db.account.id.find(p.accountId);
    return a ? { stage: p.stage, email: a.email } : undefined;
  }
);

// ---------- Signed-in employees ----------

export const guides = spacetimedb.view({ name: 'guides', public: true }, t.array(GuideInfo), (ctx) => {
  if (!currentAccount(ctx)) return [];
  return [...ctx.db.guide.iter()].sort((a, b) => a.sortOrder - b.sortOrder);
});

export const practiceQuestions = spacetimedb.view(
  { name: 'practice_questions', public: true },
  t.array(QuestionInfo),
  (ctx) => {
    if (!currentAccount(ctx)) return [];
    return [...ctx.db.practiceQuestion.iter()].map((q) => ({
      id: q.id,
      attackType: q.attackType,
      prompt: q.prompt,
      choices: q.choices,
    }));
  }
);

export const myPracticeAnswers = spacetimedb.view(
  { name: 'my_practice_answers', public: true },
  t.array(AnswerInfo),
  (ctx) => {
    const me = currentAccount(ctx);
    if (!me) return [];
    const out = [];
    for (const q of ctx.db.practiceQuestion.iter()) {
      for (const a of ctx.db.practiceAnswer.by_account_question.filter([me.id, q.id])) {
        out.push({
          questionId: q.id,
          choiceIndex: a.choiceIndex,
          correct: a.correct,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        });
      }
    }
    return out;
  }
);

export const availableScenarios = spacetimedb.view(
  { name: 'available_scenarios', public: true },
  t.array(ScenarioCard),
  (ctx) => {
    if (!currentAccount(ctx)) return [];
    return [...ctx.db.scenario.iter()]
      .filter((s) => s.status === 'published')
      .map((s) => ({
        id: s.id,
        attackType: s.attackType,
        title: s.title,
        difficulty: s.difficulty,
        summary: s.summary,
        source: s.source,
      }));
  }
);

export const myRuns = spacetimedb.view({ name: 'my_runs', public: true }, t.array(RunInfo), (ctx) => {
  const me = currentAccount(ctx);
  if (!me) return [];
  const out = [];
  for (const run of ctx.db.simRun.accountId.filter(me.id)) {
    const s = ctx.db.scenario.id.find(run.scenarioId);
    if (!s) continue;
    const r = visibleReview(ctx, run.id);
    out.push({
      id: run.id,
      scenarioId: s.id,
      attackType: s.attackType,
      title: s.title,
      difficulty: s.difficulty,
      summary: s.summary,
      briefing: s.briefing,
      contentJson: s.contentJson,
      mode: run.mode,
      status: run.status,
      stage: run.stage,
      liveDifficulty: run.difficulty,
      lockedOut: run.lockedOut,
      selfStarted: run.assignedBy === me.id,
      popupMessage: run.popupMessage,
      assignedAt: run.assignedAt,
      startedAt: run.startedAt,
      submittedAt: run.submittedAt,
      score: r?.score,
      feedback: r?.feedback,
      strengths: r?.strengths,
      mistakes: r?.mistakes,
    });
  }
  return out;
});

export const myRunMessages = spacetimedb.view(
  { name: 'my_run_messages', public: true },
  t.array(MessageInfo),
  (ctx) => {
    const me = currentAccount(ctx);
    if (!me) return [];
    const out = [];
    for (const run of ctx.db.simRun.accountId.filter(me.id))
      out.push(...ctx.db.simMessage.runId.filter(run.id));
    return out;
  }
);

export const myRunEvents = spacetimedb.view(
  { name: 'my_run_events', public: true },
  t.array(RunEventInfo),
  (ctx) => {
    const me = currentAccount(ctx);
    if (!me) return [];
    const out = [];
    for (const run of ctx.db.simRun.accountId.filter(me.id))
      out.push(...ctx.db.runEvent.runId.filter(run.id));
    return out;
  }
);

export const myStats = spacetimedb.view({ name: 'my_stats', public: true }, t.option(StatsInfo), (ctx) => {
  const me = currentAccount(ctx);
  if (!me) return undefined;
  const counts = { assigned: 0, in_progress: 0, submitted: 0, reviewed: 0 } as Record<string, number>;
  const scores: number[] = [];
  for (const run of ctx.db.simRun.accountId.filter(me.id)) {
    counts[run.status] = (counts[run.status] ?? 0) + 1;
    const r = visibleReview(ctx, run.id);
    if (r) scores.push(r.score);
  }
  let practiceAnswered = 0;
  let practiceCorrect = 0;
  for (const q of ctx.db.practiceQuestion.iter()) {
    for (const a of ctx.db.practiceAnswer.by_account_question.filter([me.id, q.id])) {
      practiceAnswered++;
      if (a.correct) practiceCorrect++;
    }
  }
  return {
    assigned: counts.assigned,
    inProgress: counts.in_progress,
    submitted: counts.submitted,
    reviewed: counts.reviewed,
    averageScore: scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : undefined,
    practiceAnswered,
    practiceCorrect,
  };
});

// Per attack type, for the profile's skill breakdown.
export const myAttackStats = spacetimedb.view(
  { name: 'my_attack_stats', public: true },
  t.array(AttackStats),
  (ctx) => {
    const me = currentAccount(ctx);
    return me ? attackStats(ctx, me.id) : [];
  }
);

// ---------- Nemotron agent and admins (empty for everyone else) ----------

export const allScenarios = spacetimedb.view(
  { name: 'all_scenarios', public: true },
  t.array(ScenarioFull),
  (ctx) => (isAgentOrAdmin(ctx) ? [...ctx.db.scenario.iter()] : [])
);

export const allRuns = spacetimedb.view({ name: 'all_runs', public: true }, t.array(RunFull), (ctx) => {
  if (!isAgentOrAdmin(ctx)) return [];
  const out = [];
  for (const run of ctx.db.simRun.iter()) {
    const s = ctx.db.scenario.id.find(run.scenarioId);
    const emp = ctx.db.account.id.find(run.accountId);
    const rep = ctx.db.runReport.runId.find(run.id);
    const r = ctx.db.review.runId.find(run.id);
    out.push({
      id: run.id,
      scenarioId: run.scenarioId,
      scenarioTitle: s?.title ?? '(deleted)',
      attackType: s?.attackType ?? '',
      accountId: run.accountId,
      employeeName: emp?.displayName ?? '(deleted)',
      mode: run.mode,
      status: run.status,
      stage: run.stage,
      liveDifficulty: run.difficulty,
      lockedOut: run.lockedOut,
      selfStarted: run.assignedBy === run.accountId,
      popupMessage: run.popupMessage,
      assignedAt: run.assignedAt,
      startedAt: run.startedAt,
      submittedAt: run.submittedAt,
      reportSummary: rep?.summary,
      reportActions: rep?.actionsTaken,
      score: r?.score,
      feedback: r?.feedback,
      reviewerKind: r?.reviewerKind,
      approved: r?.approved ?? false,
    });
  }
  return out;
});

export const allRunMessages = spacetimedb.view(
  { name: 'all_run_messages', public: true },
  t.array(MessageInfo),
  (ctx) => (isAgentOrAdmin(ctx) ? [...ctx.db.simMessage.iter()] : [])
);

export const allRunEvents = spacetimedb.view(
  { name: 'all_run_events', public: true },
  t.array(RunEventInfo),
  (ctx) => (isAgentOrAdmin(ctx) ? [...ctx.db.runEvent.iter()] : [])
);

// Every employee's per-attack performance, so the agent can personalize drills.
export const employeeAttackStats = spacetimedb.view(
  { name: 'employee_attack_stats', public: true },
  t.array(AttackStats),
  (ctx) => {
    if (!isAgentOrAdmin(ctx)) return [];
    const out = [];
    for (const a of ctx.db.account.iter()) if (a.role === 'employee') out.push(...attackStats(ctx, a.id));
    return out;
  }
);

// Lets a server-side client check that registerService worked.
export const amService = spacetimedb.view(
  { name: 'am_service', public: true },
  t.option(t.object('ServiceInfo', { label: t.string() })),
  (ctx) => {
    const s = ctx.db.serviceIdentity.identity.find(ctx.sender);
    return s ? { label: s.label } : undefined;
  }
);

// ---------- Admins ----------

export const adminAccounts = spacetimedb.view(
  { name: 'admin_accounts', public: true },
  t.array(AdminAccountInfo),
  (ctx) => {
    if (!adminOrNull(ctx)) return [];
    return [...ctx.db.account.iter()].map((a) => ({
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      role: a.role,
      phone: a.phone,
      totpEnabled: a.totpSecret != null,
      isDemo: a.isDemo,
      createdAt: a.createdAt,
    }));
  }
);
