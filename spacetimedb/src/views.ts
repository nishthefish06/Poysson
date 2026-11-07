// The client-facing read API. Tables are private; each view returns only what the
// caller's session and role allow. Subscribe with e.g. `SELECT * FROM my_account`.
import { t } from 'spacetimedb/server';
import spacetimedb from './schema';
import { currentAccount, type ReadCtx } from './access';

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

const AssignmentInfo = t.object('AssignmentInfo', {
  id: t.u64(),
  scenarioId: t.u64(),
  attackType: t.string(),
  title: t.string(),
  difficulty: t.string(),
  summary: t.string(),
  briefing: t.string(),
  contentJson: t.string(),
  popupMessage: t.string(),
  status: t.string(),
  assignedAt: t.timestamp(),
  startedAt: t.option(t.timestamp()),
  submittedAt: t.option(t.timestamp()),
  // Only present once an admin approved the review.
  score: t.option(t.u32()),
  feedback: t.option(t.string()),
});

const StatsInfo = t.object('StatsInfo', {
  assigned: t.u32(),
  inProgress: t.u32(),
  submitted: t.u32(),
  reviewed: t.u32(), // "incidents handled"
  averageScore: t.option(t.f64()),
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

const AdminScenarioInfo = t.object('AdminScenarioInfo', {
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

const AdminAssignmentInfo = t.object('AdminAssignmentInfo', {
  id: t.u64(),
  scenarioId: t.u64(),
  scenarioTitle: t.string(),
  accountId: t.u64(),
  employeeName: t.string(),
  status: t.string(),
  popupMessage: t.string(),
  assignedAt: t.timestamp(),
  startedAt: t.option(t.timestamp()),
  submittedAt: t.option(t.timestamp()),
  reportSummary: t.option(t.string()),
  reportActions: t.option(t.string()),
  score: t.option(t.u32()),
  feedback: t.option(t.string()),
  approved: t.bool(),
});

const RunEventInfo = t.object('RunEventInfo', {
  id: t.u64(),
  assignmentId: t.u64(),
  kind: t.string(),
  stepId: t.string(),
  detail: t.string(),
  at: t.timestamp(),
});

function adminOrNull(ctx: ReadCtx) {
  const me = currentAccount(ctx);
  return me && me.role === 'admin' ? me : null;
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

export const myAssignments = spacetimedb.view(
  { name: 'my_assignments', public: true },
  t.array(AssignmentInfo),
  (ctx) => {
    const me = currentAccount(ctx);
    if (!me) return [];
    const out = [];
    for (const a of ctx.db.assignment.accountId.filter(me.id)) {
      const s = ctx.db.scenario.id.find(a.scenarioId);
      if (!s) continue;
      const r = ctx.db.review.assignmentId.find(a.id);
      const visible = r != null && r.approved;
      out.push({
        id: a.id,
        scenarioId: s.id,
        attackType: s.attackType,
        title: s.title,
        difficulty: s.difficulty,
        summary: s.summary,
        briefing: s.briefing,
        contentJson: s.contentJson,
        popupMessage: a.popupMessage,
        status: a.status,
        assignedAt: a.assignedAt,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        score: visible ? r.score : undefined,
        feedback: visible ? r.feedback : undefined,
      });
    }
    return out;
  }
);

export const myStats = spacetimedb.view({ name: 'my_stats', public: true }, t.option(StatsInfo), (ctx) => {
  const me = currentAccount(ctx);
  if (!me) return undefined;
  const counts = { assigned: 0, in_progress: 0, submitted: 0, reviewed: 0 } as Record<string, number>;
  const scores: number[] = [];
  for (const a of ctx.db.assignment.accountId.filter(me.id)) {
    counts[a.status] = (counts[a.status] ?? 0) + 1;
    const r = ctx.db.review.assignmentId.find(a.id);
    if (r && r.approved) scores.push(r.score);
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

// ---------- Admins (empty for everyone else) ----------

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

export const adminScenarios = spacetimedb.view(
  { name: 'admin_scenarios', public: true },
  t.array(AdminScenarioInfo),
  (ctx) => (adminOrNull(ctx) ? [...ctx.db.scenario.iter()] : [])
);

export const adminAssignments = spacetimedb.view(
  { name: 'admin_assignments', public: true },
  t.array(AdminAssignmentInfo),
  (ctx) => {
    if (!adminOrNull(ctx)) return [];
    const out = [];
    for (const a of ctx.db.assignment.iter()) {
      const s = ctx.db.scenario.id.find(a.scenarioId);
      const emp = ctx.db.account.id.find(a.accountId);
      const rep = ctx.db.incidentReport.assignmentId.find(a.id);
      const r = ctx.db.review.assignmentId.find(a.id);
      out.push({
        id: a.id,
        scenarioId: a.scenarioId,
        scenarioTitle: s?.title ?? '(deleted)',
        accountId: a.accountId,
        employeeName: emp?.displayName ?? '(deleted)',
        status: a.status,
        popupMessage: a.popupMessage,
        assignedAt: a.assignedAt,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        reportSummary: rep?.summary,
        reportActions: rep?.actionsTaken,
        score: r?.score,
        feedback: r?.feedback,
        approved: r?.approved ?? false,
      });
    }
    return out;
  }
);

export const adminRunEvents = spacetimedb.view(
  { name: 'admin_run_events', public: true },
  t.array(RunEventInfo),
  (ctx) => (adminOrNull(ctx) ? [...ctx.db.runEvent.iter()] : [])
);
