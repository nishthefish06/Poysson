// Every runbook passage, grouped by runbook (for the Guides page).
export default defineEventHandler(() => {
  const groups = new Map<string, ReturnType<typeof allRunbooks>>();
  for (const p of allRunbooks()) groups.set(p.runbook, [...(groups.get(p.runbook) ?? []), p]);
  return { runbooks: [...groups.entries()].map(([title, sections]) => ({ title, sections })) };
});
