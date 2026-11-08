// Owner-only demo data: a roster of fictional employees with simulated history (scored runs,
// practice answers, a few runs waiting to start), so dashboards and stats look like a real team.
import { SenderError, t } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';
import { ScenarioContent, START_DIFFICULTY, type AttackType, type Difficulty } from '@hackutd2026/shared';
import spacetimedb from './schema';
import { isOwner, type Ctx } from './access';
import { createAccount } from './accounts';
import { DEMO_ADMINS, DEMO_EMPLOYEES, FEEDBACK } from './seed-data';

const MICROS_PER_HOUR = 3_600_000_000n;

function hoursAgo(ctx: Ctx, hours: number) {
  return new Timestamp(ctx.timestamp.microsSinceUnixEpoch - BigInt(Math.round(hours * 3600)) * 1_000_000n);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// One finished, scored run for an employee, shaped by their skill at that attack type.
function scoredRun(
  ctx: Ctx,
  employeeId: bigint,
  scenario: { id: bigint; contentJson: string; difficulty: string },
  skill: number,
  adminId: bigint
) {
  const content = ScenarioContent.parse(JSON.parse(scenario.contentJson));
  const startedHoursAgo = ctx.random.integerInRange(6, 24 * 13);
  const durationHours = ctx.random.integerInRange(1, 3) / 4;
  const selfStarted = ctx.random() < 0.5;
  const mode = ctx.random() < 0.5 ? 'guided' : 'unguided';
  const score = clamp(Math.round(skill * 100 + ctx.random.integerInRange(-12, 12)), 15, 100);
  const band = score >= 80 ? FEEDBACK.strong : score >= 55 ? FEEDBACK.mixed : FEEDBACK.weak;
  const lastStage = content.steps[content.steps.length - 1]?.stage ?? 'during';

  const run = ctx.db.simRun.insert({
    id: 0n,
    scenarioId: scenario.id,
    accountId: employeeId,
    assignedBy: selfStarted ? employeeId : adminId,
    mode,
    status: 'reviewed',
    stage: lastStage,
    difficulty: clamp(
      (START_DIFFICULTY[scenario.difficulty as Difficulty] ?? 2) + (score >= 80 ? 1 : 0),
      1,
      5
    ),
    lockedOut: false,
    popupMessage: selfStarted ? '' : 'Your training lead assigned a new simulation.',
    assignedAt: hoursAgo(ctx, startedHoursAgo + 2),
    startedAt: hoursAgo(ctx, startedHoursAgo),
    submittedAt: hoursAgo(ctx, startedHoursAgo - durationHours),
  });

  const at = (fraction: number) => hoursAgo(ctx, startedHoursAgo - durationHours * fraction);
  const event = (kind: string, stepId: string, detail: string, fraction: number) =>
    ctx.db.runEvent.insert({ id: 0n, runId: run.id, kind, stepId, detail, at: at(fraction) });
  event('started', '', mode, 0);
  const goodKinds = ['reported_suspicious', 'refused_request', 'verified_identity', 'escalated'];
  const badKinds = ['complied_request', 'clicked_link', 'shared_credentials'];
  content.steps.forEach((step, i) => {
    const good = ctx.random() < skill;
    const kinds = good ? goodKinds : badKinds;
    const kind = kinds[ctx.random.integerInRange(0, kinds.length - 1)]!;
    event(kind, step.id, good ? 'handled per guide' : 'fell for it', (i + 1) / (content.steps.length + 1));
  });
  event('submitted', '', 'report submitted', 1);

  ctx.db.runReport.insert({
    runId: run.id,
    accountId: employeeId,
    summary:
      score >= 55
        ? 'Recognized the attack and escalated to security.'
        : 'Followed the request before realizing it was suspicious.',
    actionsTaken:
      score >= 55
        ? 'Refused the request, verified through the directory, escalated.'
        : 'Reported after the fact.',
    submittedAt: run.submittedAt!,
  });
  ctx.db.review.insert({
    runId: run.id,
    reviewerKind: 'agent',
    reviewerId: 0n,
    score,
    feedback: band.feedback,
    strengths: [...band.strengths],
    mistakes: [...band.mistakes],
    approved: true,
    reviewedAt: run.submittedAt!,
  });
}

export const seedDemoActivity = spacetimedb.reducer({ password: t.string() }, (ctx, { password }) => {
  if (!isOwner(ctx)) throw new SenderError('only the database owner can seed demo activity');
  const scenarios = [...ctx.db.scenario.iter()].filter((s) => s.status === 'published');
  if (!scenarios.length) throw new SenderError('no published scenarios to build history from');
  const questions = [...ctx.db.practiceQuestion.iter()];

  let adminId = 0n;
  for (const a of DEMO_ADMINS) {
    const existing = ctx.db.account.email.find(a.email);
    adminId = existing?.id ?? createAccount(ctx, { ...a, role: 'admin', password, isDemo: true }).id;
  }

  for (const e of DEMO_EMPLOYEES) {
    if (ctx.db.account.email.find(e.email)) continue; // already seeded: keep their history
    const acct = createAccount(ctx, {
      email: e.email,
      displayName: e.displayName,
      phone: e.phone,
      role: 'employee',
      password,
      isDemo: true,
    });

    // History: most scenarios attempted once, some twice.
    for (const s of scenarios) {
      const skill = e.skill[s.attackType as AttackType] ?? 0.5;
      if (ctx.random() < 0.7) scoredRun(ctx, acct.id, s, skill, adminId);
      if (ctx.random() < 0.25) scoredRun(ctx, acct.id, s, Math.min(1, skill + 0.1), adminId);
    }

    // One assigned run waiting on the dashboard (the pop-up) for about half the team.
    if (ctx.random() < 0.5) {
      const s = scenarios[ctx.random.integerInRange(0, scenarios.length - 1)]!;
      const content = ScenarioContent.parse(JSON.parse(s.contentJson));
      ctx.db.simRun.insert({
        id: 0n,
        scenarioId: s.id,
        accountId: acct.id,
        assignedBy: adminId,
        mode: ctx.random() < 0.5 ? 'guided' : 'unguided',
        status: 'assigned',
        stage: content.steps[0]?.stage ?? 'during',
        difficulty: START_DIFFICULTY[s.difficulty as Difficulty] ?? 2,
        lockedOut: false,
        popupMessage: 'New drill from your training lead: complete it before your next shift.',
        assignedAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch - 3n * MICROS_PER_HOUR),
        startedAt: undefined,
        submittedAt: undefined,
      });
    }

    // Practice answers, right about as often as their skill suggests.
    for (const q of questions) {
      if (ctx.random() > 0.8) continue;
      const skill = e.skill[q.attackType as AttackType] ?? 0.5;
      const correct = ctx.random() < skill;
      const wrong = [...q.choices.keys()].filter((i) => i !== q.correctIndex);
      const choiceIndex = correct ? q.correctIndex : wrong[ctx.random.integerInRange(0, wrong.length - 1)]!;
      ctx.db.practiceAnswer.insert({
        id: 0n,
        accountId: acct.id,
        questionId: q.id,
        choiceIndex,
        correct,
        answeredAt: hoursAgo(ctx, ctx.random.integerInRange(1, 24 * 14)),
      });
    }
  }
});
