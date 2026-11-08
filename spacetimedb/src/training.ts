// Practice questions, guides, scenarios and simulation runs.
// A run is one attempt at a scenario: assigned by an admin or self-started by the employee,
// guided (scripted steps + hints) or unguided (the Nemotron agent plays the attacker live).
import { SenderError, t } from 'spacetimedb/server';
import {
  AttackType,
  AttackerTurn,
  MESSAGE_MAX,
  RUN_DIFFICULTY,
  RunEventInput,
  RunScore,
  START_DIFFICULTY,
  ScenarioContent,
  ScenarioDraft,
  ScenarioStatus,
  SimMode,
  type Difficulty,
} from '@hackutd2026/shared';
import { z } from 'zod';
import spacetimedb from './schema';
import {
  assertLength,
  parseJsonOrThrow,
  parseOrThrow,
  requireAccount,
  requireAdmin,
  requireServiceOrAdmin,
  type Ctx,
} from './access';

// ---------- Helpers (not exported: the module entry may only export reducers and views) ----------

type Run = NonNullable<ReturnType<Ctx['db']['simRun']['id']['find']>>;

function loadRun(ctx: Ctx, runId: bigint) {
  const r = ctx.db.simRun.id.find(runId);
  if (!r) throw new SenderError('no such run');
  return r;
}

function ownRun(ctx: Ctx, runId: bigint) {
  const me = requireAccount(ctx);
  const r = ctx.db.simRun.id.find(runId);
  if (!r || r.accountId !== me.id) throw new SenderError('no such run');
  return r;
}

function activeRun(r: Run) {
  if (r.status !== 'in_progress') throw new SenderError('simulation is not in progress');
  return r;
}

function scenarioContent(ctx: Ctx, scenarioId: bigint) {
  const s = ctx.db.scenario.id.find(scenarioId);
  if (!s) throw new SenderError('no such scenario');
  return { scenario: s, content: ScenarioContent.parse(JSON.parse(s.contentJson)) };
}

function systemMessage(ctx: Ctx, run: Run, body: string) {
  ctx.db.simMessage.insert({
    id: 0n,
    runId: run.id,
    sender: 'system',
    channel: 'system',
    from: '',
    stage: run.stage,
    body,
    at: ctx.timestamp,
  });
}

function event(ctx: Ctx, runId: bigint, kind: string, detail = '') {
  ctx.db.runEvent.insert({ id: 0n, runId, kind, stepId: '', detail, at: ctx.timestamp });
}

function createRun(
  ctx: Ctx,
  args: { scenarioId: bigint; accountId: bigint; assignedBy: bigint; mode: string; popupMessage: string }
) {
  const { scenario, content } = scenarioContent(ctx, args.scenarioId);
  if (scenario.status !== 'published') throw new SenderError('scenario is not published');
  return ctx.db.simRun.insert({
    id: 0n,
    scenarioId: args.scenarioId,
    accountId: args.accountId,
    assignedBy: args.assignedBy,
    mode: parseOrThrow(SimMode, args.mode, 'mode'),
    status: 'assigned',
    stage: content.steps[0]!.stage ?? 'during',
    difficulty: START_DIFFICULTY[scenario.difficulty as Difficulty] ?? 2,
    lockedOut: false,
    popupMessage: args.popupMessage,
    assignedAt: ctx.timestamp,
    startedAt: undefined,
    submittedAt: undefined,
  });
}

function beginRun(ctx: Ctx, run: Run) {
  const { content } = scenarioContent(ctx, run.scenarioId);
  const started = {
    ...run,
    status: 'in_progress',
    startedAt: ctx.timestamp,
    lockedOut: content.lockout ?? false,
  };
  ctx.db.simRun.id.update(started);
  event(ctx, run.id, 'started', run.mode);
  systemMessage(
    ctx,
    started,
    run.mode === 'guided'
      ? 'Guided simulation started. Work through each message; hints are available.'
      : 'Simulation started. Treat everything that arrives as real.'
  );
  if (started.lockedOut) {
    systemMessage(
      ctx,
      started,
      'Your T-Mobile employee dashboard has been locked. Files and tools are unavailable.'
    );
  }
}

function endRun(ctx: Ctx, run: Run, why: string) {
  const ended = { ...run, status: 'submitted', submittedAt: ctx.timestamp, lockedOut: false };
  ctx.db.simRun.id.update(ended);
  event(ctx, run.id, 'submitted', why);
  systemMessage(ctx, ended, `Simulation ended: ${why}`);
}

function upsertReview(
  ctx: Ctx,
  runId: bigint,
  review: { reviewerKind: string; reviewerId: bigint; approved: boolean } & z.infer<typeof RunScore>
) {
  const row = {
    runId,
    reviewerKind: review.reviewerKind,
    reviewerId: review.reviewerId,
    score: review.score,
    feedback: review.feedback,
    strengths: review.strengths,
    mistakes: review.mistakes,
    approved: review.approved,
    reviewedAt: ctx.timestamp,
  };
  if (ctx.db.review.runId.find(runId)) ctx.db.review.runId.update(row);
  else ctx.db.review.insert(row);
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

// Start any published scenario on your own, guided or unguided.
export const startSimulation = spacetimedb.reducer(
  { scenarioId: t.u64(), mode: t.string() },
  (ctx, { scenarioId, mode }) => {
    const me = requireAccount(ctx);
    const run = createRun(ctx, { scenarioId, accountId: me.id, assignedBy: me.id, mode, popupMessage: '' });
    beginRun(ctx, run);
  }
);

// Start a run an admin assigned (the pop-up's "Start" button).
export const startRun = spacetimedb.reducer({ runId: t.u64() }, (ctx, { runId }) => {
  const r = ownRun(ctx, runId);
  if (r.status !== 'assigned') return; // already started; starting again is a no-op
  beginRun(ctx, r);
});

// kind must be a RunEventKind from shared/; stepId is '' when the event isn't about one step.
export const logRunEvent = spacetimedb.reducer(
  { runId: t.u64(), kind: t.string(), stepId: t.string(), detail: t.string() },
  (ctx, { runId, ...input }) => {
    const r = activeRun(ownRun(ctx, runId));
    const e = parseOrThrow(RunEventInput, input, 'event');
    ctx.db.runEvent.insert({ id: 0n, runId, ...e, at: ctx.timestamp });
    // Guided ransomware drills: escalating to security restores the locked dashboard.
    if (r.mode === 'guided' && r.lockedOut && e.kind === 'escalated') {
      const unlocked = { ...r, lockedOut: false };
      ctx.db.simRun.id.update(unlocked);
      systemMessage(ctx, unlocked, 'Security has isolated the threat. Your dashboard is unlocked.');
    }
  }
);

// The employee's reply in the live conversation (what the agent responds to).
export const sendSimReply = spacetimedb.reducer(
  { runId: t.u64(), body: t.string() },
  (ctx, { runId, body }) => {
    const r = activeRun(ownRun(ctx, runId));
    assertLength(body, 'reply', MESSAGE_MAX, 1);
    const lastAttacker = [...ctx.db.simMessage.runId.filter(runId)]
      .filter((m) => m.sender === 'attacker')
      .sort((a, b) => (a.id < b.id ? 1 : -1))[0];
    ctx.db.simMessage.insert({
      id: 0n,
      runId,
      sender: 'employee',
      channel: lastAttacker?.channel ?? 'chat',
      from: '',
      stage: r.stage,
      body,
      at: ctx.timestamp,
    });
  }
);

export const submitReport = spacetimedb.reducer(
  { runId: t.u64(), summary: t.string(), actionsTaken: t.string() },
  (ctx, { runId, summary, actionsTaken }) => {
    const r = ownRun(ctx, runId);
    if (r.status !== 'in_progress' && r.status !== 'submitted')
      throw new SenderError('simulation has not started');
    if (ctx.db.runReport.runId.find(runId)) throw new SenderError('report already submitted');
    assertLength(summary, 'summary', 8000, 1);
    assertLength(actionsTaken, 'actionsTaken', 8000);
    ctx.db.runReport.insert({
      runId,
      accountId: r.accountId,
      summary,
      actionsTaken,
      submittedAt: ctx.timestamp,
    });
    if (r.status === 'in_progress') endRun(ctx, r, 'report submitted');
  }
);

// ---------- Nemotron agent (registered service; admins can simulate it) ----------

export const postAttackerMessage = spacetimedb.reducer(
  { runId: t.u64(), channel: t.string(), from: t.string(), stage: t.string(), body: t.string() },
  (ctx, { runId, ...input }) => {
    requireServiceOrAdmin(ctx);
    const r = activeRun(loadRun(ctx, runId));
    const turn = parseOrThrow(AttackerTurn, input, 'turn');
    if (turn.stage !== r.stage) ctx.db.simRun.id.update({ ...r, stage: turn.stage });
    ctx.db.simMessage.insert({ id: 0n, runId, sender: 'attacker', ...turn, at: ctx.timestamp });
  }
);

// Out-of-character help: hints in guided mode, a nudge, or the debrief.
export const postCoachMessage = spacetimedb.reducer(
  { runId: t.u64(), body: t.string() },
  (ctx, { runId, body }) => {
    requireServiceOrAdmin(ctx);
    const r = loadRun(ctx, runId);
    assertLength(body, 'body', MESSAGE_MAX, 1);
    ctx.db.simMessage.insert({
      id: 0n,
      runId,
      sender: 'coach',
      channel: 'system',
      from: '',
      stage: r.stage,
      body,
      at: ctx.timestamp,
    });
  }
);

// Adapt to the employee: harder when they're doing well, gentler when they're struggling.
export const adjustDifficulty = spacetimedb.reducer(
  { runId: t.u64(), difficulty: t.u32() },
  (ctx, { runId, difficulty }) => {
    requireServiceOrAdmin(ctx);
    const r = activeRun(loadRun(ctx, runId));
    if (difficulty < RUN_DIFFICULTY.min || difficulty > RUN_DIFFICULTY.max) {
      throw new SenderError(`difficulty must be ${RUN_DIFFICULTY.min}-${RUN_DIFFICULTY.max}`);
    }
    ctx.db.simRun.id.update({ ...r, difficulty });
  }
);

export const setRunLockout = spacetimedb.reducer(
  { runId: t.u64(), locked: t.bool(), note: t.string() },
  (ctx, { runId, locked, note }) => {
    requireServiceOrAdmin(ctx);
    const r = activeRun(loadRun(ctx, runId));
    assertLength(note, 'note', 1000);
    const next = { ...r, lockedOut: locked };
    ctx.db.simRun.id.update(next);
    systemMessage(
      ctx,
      next,
      note || (locked ? 'Your dashboard has been locked.' : 'Your dashboard is unlocked.')
    );
  }
);

// The agent ends a run: the employee resolved it, fell for it, or ran out of turns.
export const endSimulation = spacetimedb.reducer(
  { runId: t.u64(), reason: t.string() },
  (ctx, { runId, reason }) => {
    requireServiceOrAdmin(ctx);
    const r = activeRun(loadRun(ctx, runId));
    assertLength(reason, 'reason', 1000, 1);
    endRun(ctx, r, reason);
  }
);

// The agent's score. Shown to the employee right away.
export const scoreRun = spacetimedb.reducer(
  {
    runId: t.u64(),
    score: t.u32(),
    feedback: t.string(),
    strengths: t.array(t.string()),
    mistakes: t.array(t.string()),
  },
  (ctx, { runId, ...input }) => {
    requireServiceOrAdmin(ctx);
    const r = loadRun(ctx, runId);
    if (r.status !== 'submitted' && r.status !== 'reviewed') throw new SenderError('run has not ended');
    const s = parseOrThrow(RunScore, input, 'score');
    upsertReview(ctx, runId, { ...s, reviewerKind: 'agent', reviewerId: 0n, approved: true });
    ctx.db.simRun.id.update({ ...r, status: 'reviewed' });
  }
);

// Nemotron creates a scenario (validated against ScenarioDraft). It can publish it and assign it
// straight to one employee for a personalized drill.
export const proposeScenario = spacetimedb.reducer(
  {
    attackType: t.string(),
    title: t.string(),
    difficulty: t.string(),
    summary: t.string(),
    briefing: t.string(),
    contentJson: t.string(),
    rubricJson: t.string(),
    publish: t.bool(),
    assignTo: t.option(t.u64()),
    mode: t.string(),
    popupMessage: t.string(),
  },
  (ctx, { publish, assignTo, mode, popupMessage, ...fields }) => {
    const actor = requireServiceOrAdmin(ctx);
    if (assignTo !== undefined && !publish) throw new SenderError('publish the scenario to assign it');
    const s = ctx.db.scenario.insert({
      id: 0n,
      ...validateScenario(fields),
      source: 'nemotron',
      status: publish ? 'published' : 'draft',
      createdBy: actor.id,
      createdAt: ctx.timestamp,
    });
    if (assignTo !== undefined) {
      if (!ctx.db.account.id.find(assignTo)) throw new SenderError('no such account');
      assertLength(popupMessage, 'popupMessage', 2000);
      createRun(ctx, { scenarioId: s.id, accountId: assignTo, assignedBy: actor.id, mode, popupMessage });
    }
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

// Validates against the shared ScenarioDraft schema (the same one Nemotron targets)
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
  if ([...ctx.db.simRun.scenarioId.filter(scenarioId)].length > 0) {
    throw new SenderError('scenario has runs; set it back to draft instead');
  }
  ctx.db.scenario.id.delete(scenarioId);
});

// ---------- Admin: assigning and reviewing ----------

// popupMessage is what appears on the employee's screen to kick off the simulation.
export const assignScenario = spacetimedb.reducer(
  { scenarioId: t.u64(), accountId: t.u64(), mode: t.string(), popupMessage: t.string() },
  (ctx, { scenarioId, accountId, mode, popupMessage }) => {
    const me = requireAdmin(ctx);
    if (!ctx.db.account.id.find(accountId)) throw new SenderError('no such account');
    assertLength(popupMessage, 'popupMessage', 2000);
    createRun(ctx, { scenarioId, accountId, assignedBy: me.id, mode, popupMessage });
  }
);

export const assignScenarioToAllEmployees = spacetimedb.reducer(
  { scenarioId: t.u64(), mode: t.string(), popupMessage: t.string() },
  (ctx, { scenarioId, mode, popupMessage }) => {
    const me = requireAdmin(ctx);
    assertLength(popupMessage, 'popupMessage', 2000);
    for (const acct of ctx.db.account.iter()) {
      if (acct.role === 'employee') {
        createRun(ctx, { scenarioId, accountId: acct.id, assignedBy: me.id, mode, popupMessage });
      }
    }
  }
);

// Admin score or override. The employee sees it only after a call with approve = true.
export const reviewRun = spacetimedb.reducer(
  { runId: t.u64(), score: t.u32(), feedback: t.string(), approve: t.bool() },
  (ctx, { runId, score, feedback, approve }) => {
    const me = requireAdmin(ctx);
    const r = loadRun(ctx, runId);
    if (r.status !== 'submitted' && r.status !== 'reviewed') throw new SenderError('run has not ended');
    const s = parseOrThrow(
      RunScore,
      { score, feedback: feedback || '(no feedback)', strengths: [], mistakes: [] },
      'score'
    );
    upsertReview(ctx, runId, { ...s, reviewerKind: 'admin', reviewerId: me.id, approved: approve });
    ctx.db.simRun.id.update({ ...r, status: approve ? 'reviewed' : 'submitted' });
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
