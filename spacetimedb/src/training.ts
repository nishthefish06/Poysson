// Practice questions, simulations (scenario -> assignment -> events -> report -> review) and guides.
import { SenderError, t } from 'spacetimedb/server';
import { AttackType, RunEventInput, ScenarioDraft, ScenarioStatus } from '@hackutd2026/shared';
import spacetimedb from './schema';
import {
  assertLength,
  parseJsonOrThrow,
  parseOrThrow,
  requireAccount,
  requireAdmin,
  type Ctx,
} from './access';
import { z } from 'zod';

function ownAssignment(ctx: Ctx, assignmentId: bigint) {
  const me = requireAccount(ctx);
  const a = ctx.db.assignment.id.find(assignmentId);
  if (!a || a.accountId !== me.id) throw new SenderError('no such assignment');
  return a;
}

// ---------- Employee: practice ----------

export const answerPractice = spacetimedb.reducer(
  { questionId: t.u64(), choiceIndex: t.u32() },
  (ctx, { questionId, choiceIndex }) => {
    const me = requireAccount(ctx);
    const q = ctx.db.practiceQuestion.id.find(questionId);
    if (!q) throw new SenderError('no such question');
    if (choiceIndex >= q.choices.length) throw new SenderError('choice out of range');
    // Latest answer wins, so employees can retry.
    for (const prev of [...ctx.db.practiceAnswer.by_account_question.filter([me.id, questionId])]) {
      ctx.db.practiceAnswer.id.delete(prev.id);
    }
    ctx.db.practiceAnswer.insert({
      id: 0n,
      accountId: me.id,
      questionId,
      choiceIndex,
      correct: choiceIndex === q.correctIndex,
      answeredAt: ctx.timestamp,
    });
  }
);

// ---------- Employee: simulations ----------

export const startAssignment = spacetimedb.reducer({ assignmentId: t.u64() }, (ctx, { assignmentId }) => {
  const a = ownAssignment(ctx, assignmentId);
  if (a.status !== 'assigned') return; // already started; starting again is a no-op
  ctx.db.assignment.id.update({ ...a, status: 'in_progress', startedAt: ctx.timestamp });
  ctx.db.runEvent.insert({
    id: 0n,
    assignmentId,
    kind: 'started',
    stepId: '',
    detail: '',
    at: ctx.timestamp,
  });
});

// kind must be a RunEventKind from shared/; stepId is '' when the event isn't about one step.
export const logRunEvent = spacetimedb.reducer(
  { assignmentId: t.u64(), kind: t.string(), stepId: t.string(), detail: t.string() },
  (ctx, { assignmentId, ...input }) => {
    const a = ownAssignment(ctx, assignmentId);
    if (a.status !== 'in_progress') throw new SenderError('simulation is not in progress');
    const event = parseOrThrow(RunEventInput, input, 'event');
    ctx.db.runEvent.insert({ id: 0n, assignmentId, ...event, at: ctx.timestamp });
  }
);

export const submitReport = spacetimedb.reducer(
  { assignmentId: t.u64(), summary: t.string(), actionsTaken: t.string() },
  (ctx, { assignmentId, summary, actionsTaken }) => {
    const a = ownAssignment(ctx, assignmentId);
    if (a.status !== 'in_progress') throw new SenderError('simulation is not in progress');
    assertLength(summary, 'summary', 8000, 1);
    assertLength(actionsTaken, 'actionsTaken', 8000);
    ctx.db.incidentReport.insert({
      assignmentId,
      accountId: a.accountId,
      summary,
      actionsTaken,
      submittedAt: ctx.timestamp,
    });
    ctx.db.assignment.id.update({ ...a, status: 'submitted', submittedAt: ctx.timestamp });
    ctx.db.runEvent.insert({
      id: 0n,
      assignmentId,
      kind: 'submitted',
      stepId: '',
      detail: '',
      at: ctx.timestamp,
    });
  }
);

// ---------- Admin: scenarios ----------

const scenarioFields = {
  attackType: t.string(),
  title: t.string(),
  difficulty: t.string(),
  summary: t.string(),
  briefing: t.string(),
  contentJson: t.string(),
  rubricJson: t.string(),
};

// Validates against the shared ScenarioDraft schema (the same one AI generators target)
// and returns the stored columns with the JSON re-serialized from the parsed values.
function validateScenario(args: {
  attackType: string;
  title: string;
  difficulty: string;
  summary: string;
  briefing: string;
  contentJson: string;
  rubricJson: string;
}) {
  const draft = parseOrThrow(
    ScenarioDraft,
    {
      attackType: args.attackType,
      difficulty: args.difficulty,
      title: args.title,
      summary: args.summary,
      briefing: args.briefing,
      content: parseJsonOrThrow(z.unknown(), args.contentJson, 'contentJson'),
      rubric: parseJsonOrThrow(z.unknown(), args.rubricJson, 'rubricJson'),
    },
    'scenario'
  );
  return {
    attackType: draft.attackType,
    difficulty: draft.difficulty,
    title: draft.title,
    summary: draft.summary,
    briefing: draft.briefing,
    contentJson: JSON.stringify(draft.content),
    rubricJson: JSON.stringify(draft.rubric),
  };
}

export const createScenario = spacetimedb.reducer(scenarioFields, (ctx, args) => {
  const me = requireAdmin(ctx);
  ctx.db.scenario.insert({
    id: 0n,
    ...validateScenario(args),
    source: 'manual',
    status: 'draft',
    createdBy: me.id,
    createdAt: ctx.timestamp,
  });
});

export const updateScenario = spacetimedb.reducer(
  { scenarioId: t.u64(), ...scenarioFields },
  (ctx, { scenarioId, ...args }) => {
    requireAdmin(ctx);
    const s = ctx.db.scenario.id.find(scenarioId);
    if (!s) throw new SenderError('no such scenario');
    ctx.db.scenario.id.update({ ...s, ...validateScenario(args) });
  }
);

export const setScenarioStatus = spacetimedb.reducer(
  { scenarioId: t.u64(), status: t.string() },
  (ctx, { scenarioId, status }) => {
    requireAdmin(ctx);
    const s = ctx.db.scenario.id.find(scenarioId);
    if (!s) throw new SenderError('no such scenario');
    ctx.db.scenario.id.update({ ...s, status: parseOrThrow(ScenarioStatus, status, 'status') });
  }
);

export const deleteScenario = spacetimedb.reducer({ scenarioId: t.u64() }, (ctx, { scenarioId }) => {
  requireAdmin(ctx);
  if ([...ctx.db.assignment.scenarioId.filter(scenarioId)].length > 0) {
    throw new SenderError('scenario has assignments; set it back to draft instead');
  }
  ctx.db.scenario.id.delete(scenarioId);
});

// ---------- Admin: assigning and reviewing ----------

function assign(ctx: Ctx, assignedBy: bigint, scenarioId: bigint, accountId: bigint, popupMessage: string) {
  ctx.db.assignment.insert({
    id: 0n,
    scenarioId,
    accountId,
    assignedBy,
    popupMessage,
    status: 'assigned',
    assignedAt: ctx.timestamp,
    startedAt: undefined,
    submittedAt: undefined,
  });
}

function publishedScenario(ctx: Ctx, scenarioId: bigint) {
  const s = ctx.db.scenario.id.find(scenarioId);
  if (!s) throw new SenderError('no such scenario');
  if (s.status !== 'published') throw new SenderError('publish the scenario before assigning it');
  return s;
}

// popupMessage is what appears on the employee's screen to kick off the simulation.
export const assignScenario = spacetimedb.reducer(
  { scenarioId: t.u64(), accountId: t.u64(), popupMessage: t.string() },
  (ctx, { scenarioId, accountId, popupMessage }) => {
    const me = requireAdmin(ctx);
    publishedScenario(ctx, scenarioId);
    if (!ctx.db.account.id.find(accountId)) throw new SenderError('no such account');
    assertLength(popupMessage, 'popupMessage', 2000);
    assign(ctx, me.id, scenarioId, accountId, popupMessage);
  }
);

export const assignScenarioToAllEmployees = spacetimedb.reducer(
  { scenarioId: t.u64(), popupMessage: t.string() },
  (ctx, { scenarioId, popupMessage }) => {
    const me = requireAdmin(ctx);
    publishedScenario(ctx, scenarioId);
    assertLength(popupMessage, 'popupMessage', 2000);
    for (const acct of ctx.db.account.iter()) {
      if (acct.role === 'employee') assign(ctx, me.id, scenarioId, acct.id, popupMessage);
    }
  }
);

// Saves a grade. The employee sees the score only after a call with approve = true.
export const reviewAssignment = spacetimedb.reducer(
  { assignmentId: t.u64(), score: t.u32(), feedback: t.string(), approve: t.bool() },
  (ctx, { assignmentId, score, feedback, approve }) => {
    const me = requireAdmin(ctx);
    const a = ctx.db.assignment.id.find(assignmentId);
    if (!a) throw new SenderError('no such assignment');
    if (a.status !== 'submitted' && a.status !== 'reviewed')
      throw new SenderError('report not submitted yet');
    if (score > 100) throw new SenderError('score must be 0-100');
    assertLength(feedback, 'feedback', 8000);
    const row = {
      assignmentId,
      reviewerId: me.id,
      score,
      feedback,
      approved: approve,
      reviewedAt: ctx.timestamp,
    };
    if (ctx.db.review.assignmentId.find(assignmentId)) ctx.db.review.assignmentId.update(row);
    else ctx.db.review.insert(row);
    ctx.db.assignment.id.update({ ...a, status: approve ? 'reviewed' : 'submitted' });
  }
);

// ---------- Admin: guides and practice questions ----------

export const upsertGuide = spacetimedb.reducer(
  {
    guideId: t.u64(), // 0 to create
    attackType: t.string(),
    title: t.string(),
    summary: t.string(),
    body: t.string(),
    sortOrder: t.u32(),
  },
  (ctx, { guideId, ...fields }) => {
    requireAdmin(ctx);
    parseOrThrow(AttackType, fields.attackType, 'attackType');
    assertLength(fields.title, 'title', 200, 1);
    assertLength(fields.body, 'body', 50_000);
    if (guideId === 0n) {
      ctx.db.guide.insert({ id: 0n, ...fields });
    } else {
      if (!ctx.db.guide.id.find(guideId)) throw new SenderError('no such guide');
      ctx.db.guide.id.update({ id: guideId, ...fields });
    }
  }
);

export const deleteGuide = spacetimedb.reducer({ guideId: t.u64() }, (ctx, { guideId }) => {
  requireAdmin(ctx);
  ctx.db.guide.id.delete(guideId);
});

export const createPracticeQuestion = spacetimedb.reducer(
  {
    attackType: t.string(),
    prompt: t.string(),
    choices: t.array(t.string()),
    correctIndex: t.u32(),
    explanation: t.string(),
  },
  (ctx, fields) => {
    requireAdmin(ctx);
    parseOrThrow(AttackType, fields.attackType, 'attackType');
    assertLength(fields.prompt, 'prompt', 2000, 1);
    if (fields.choices.length < 2 || fields.choices.length > 6) throw new SenderError('2-6 choices');
    if (fields.correctIndex >= fields.choices.length) throw new SenderError('correctIndex out of range');
    ctx.db.practiceQuestion.insert({ id: 0n, ...fields });
  }
);

export const deletePracticeQuestion = spacetimedb.reducer({ questionId: t.u64() }, (ctx, { questionId }) => {
  requireAdmin(ctx);
  for (const a of [...ctx.db.practiceAnswer.iter()]) {
    if (a.questionId === questionId) ctx.db.practiceAnswer.id.delete(a.id);
  }
  ctx.db.practiceQuestion.id.delete(questionId);
});
