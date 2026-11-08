// Runs once when the database is first published: records the owner and seeds starter content
// (guides, practice questions, scenarios) from seed-data.ts.
import spacetimedb from './schema';
import type { Ctx } from './access';
import { GUIDES, QUESTIONS, SCENARIOS } from './seed-data';

function seedContent(ctx: Ctx) {
  GUIDES.forEach((g, i) =>
    ctx.db.guide.insert({ id: 0n, ...g, audience: g.audience ?? 'employee', sortOrder: i })
  );
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
