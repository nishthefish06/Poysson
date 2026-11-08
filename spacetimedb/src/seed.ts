// Runs once when the database is first published: records the owner and seeds starter content
// (guides, practice questions, scenarios) from seed-data.ts.
import spacetimedb from './schema';
import type { Ctx } from './access';
import { SenderError, t } from 'spacetimedb/server';
import { runbookGuides } from '@hackutd2026/shared/runbooks';
import { isOwner } from './access';
import { GUIDES, QUESTIONS, SCENARIOS } from './seed-data';

function seedContent(ctx: Ctx) {
  GUIDES.forEach((g, i) =>
    ctx.db.guide.insert({ id: 0n, ...g, audience: g.audience ?? 'employee', sortOrder: i })
  );
  // Company runbooks: the same text the AI retrieves from (app/server/utils/runbook-search.ts).
  runbookGuides().forEach((g, i) => ctx.db.guide.insert({ id: 0n, ...g, sortOrder: 1000 + i }));
  for (const q of QUESTIONS) ctx.db.practiceQuestion.insert({ id: 0n, ...q });
  for (const s of SCENARIOS) {
    ctx.db.scenario.insert({
      id: 0n,
      attackType: s.attackType,
      title: s.title,
      difficulty: s.difficulty,
      summary: s.summary,
      briefing: s.briefing,
      contentJson: JSON.stringify(s.content),
      rubricJson: JSON.stringify(s.rubric),
      source: 'manual',
      status: 'published',
      createdBy: 0n,
      createdAt: ctx.timestamp,
    });
  }
}

export const init = spacetimedb.init((ctx) => {
  ctx.db.moduleOwner.insert({ id: 0, identity: ctx.sender });
  seedContent(ctx);
});

// Owner-only: add or update the runbook guides in a database that was published before they
// existed (no --delete-data needed). Matches by title, so running it twice changes nothing.
export const seedRunbooks = spacetimedb.reducer({ confirm: t.bool() }, (ctx, { confirm }) => {
  if (!isOwner(ctx)) throw new SenderError('only the database owner can seed runbooks');
  if (!confirm) return;
  const existing = new Map([...ctx.db.guide.iter()].map((g) => [g.title, g]));
  runbookGuides().forEach((g, i) => {
    const old = existing.get(g.title);
    if (old) ctx.db.guide.id.update({ ...old, ...g });
    else ctx.db.guide.insert({ id: 0n, ...g, sortOrder: 1000 + i });
  });
});
