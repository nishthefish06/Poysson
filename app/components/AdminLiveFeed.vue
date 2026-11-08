<script setup lang="ts">
/*
 * Admin live activity: arena rounds in progress and a feed of every move, decision and verdict,
 * from arena rounds (Nemotron) and assigned/practice drills. Everything here is a SpacetimeDB
 * subscription, so it updates the moment an employee acts or the attacker moves.
 * LIVE: all_arena_rounds, all_arena_log, all_runs, all_run_events.
 */
import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const [arenaRounds] = useTable(tables.allArenaRounds);
const [arenaLog] = useTable(tables.allArenaLog);
const [runs] = useTable(tables.allRuns);
const [runEvents] = useTable(tables.allRunEvents);

const micros = (ts: { microsSinceUnixEpoch: bigint }) => Number(ts.microsSinceUnixEpoch / 1000n);
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | undefined;
onMounted(() => (clock = setInterval(() => (now.value = Date.now()), 5000)));
onUnmounted(() => clearInterval(clock));
// Only highlight rows that arrive after the first load, not the whole history at once.
const settled = ref(false);
onMounted(() => setTimeout(() => (settled.value = true), 2500));
function ago(ms: number) {
  const s = Math.max(0, Math.round((now.value - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

// Arena rounds: in progress first, then the most recently finished.
const playing = computed(() =>
  arenaRounds.value
    .filter((r) => r.status === 'active')
    .sort((a, b) => micros(b.updatedAt) - micros(a.updatedAt))
);
const finished = computed(() =>
  arenaRounds.value
    .filter((r) => r.status !== 'active')
    .sort((a, b) => micros(b.updatedAt) - micros(a.updatedAt))
    .slice(0, 3)
);

type Tone = 'ideal' | 'ok' | 'neutral' | 'harmful' | 'attacker' | 'info';
interface FeedItem {
  key: string;
  at: number;
  who: string;
  where: string;
  text: string;
  tone: Tone;
}

const GOOD = new Set([
  'reported_suspicious',
  'verified_identity',
  'refused_request',
  'escalated',
  'blocked_sender',
]);
const BAD = new Set(['clicked_link', 'complied_request', 'shared_credentials']);
const KIND_TEXT: Record<string, string> = {
  started: 'started the drill',
  submitted: 'submitted their report',
  replied: 'replied',
  clicked_link: 'clicked the link',
  reported_suspicious: 'reported it as suspicious',
  verified_identity: 'verified through an official channel',
  refused_request: 'refused the request',
  complied_request: 'did what the attacker asked',
  shared_credentials: 'entered their credentials',
  escalated: 'escalated to security',
  blocked_sender: 'blocked the sender',
  notified_customer: 'notified the customer',
  note: 'added a note',
};

const feed = computed<FeedItem[]>(() => {
  const roundById = new Map(arenaRounds.value.map((r) => [r.id, r]));
  const runById = new Map(runs.value.map((r) => [r.id, r]));
  const items: FeedItem[] = [];
  for (const l of arenaLog.value) {
    const round = roundById.get(l.roundId);
    if (!round) continue; // unclaimed rounds aren't shown
    const fromAttacker = l.type === 'step' || l.type === 'narration';
    items.push({
      key: `a${l.id}`,
      at: micros(l.at),
      who: fromAttacker ? 'Attacker' : round.displayName,
      where: `Arena · ${round.mode}${fromAttacker ? ` vs ${round.displayName}` : ''}`,
      text: l.text,
      tone: fromAttacker ? 'attacker' : ((l.verdict || 'info') as Tone),
    });
  }
  for (const e of runEvents.value) {
    if (e.kind === 'opened_step') continue;
    const run = runById.get(e.runId);
    if (!run) continue;
    items.push({
      key: `r${e.id}`,
      at: micros(e.at),
      who: run.employeeName,
      where: `${run.mode === 'guided' ? 'Guided' : 'Unguided'} drill · ${run.scenarioTitle}`,
      text: KIND_TEXT[e.kind] ?? e.kind.replaceAll('_', ' '),
      tone: GOOD.has(e.kind) ? 'ideal' : BAD.has(e.kind) ? 'harmful' : 'info',
    });
  }
  return items.sort((a, b) => b.at - a.at).slice(0, 40);
});

const OUTCOME: Record<string, string> = {
  clean: 'clean',
  contained: 'contained',
  compromised: 'compromised',
};
</script>

<template>
  <CyberPanel title="Live activity" eyebrow="Streaming from SpacetimeDB" accent="magenta" :padded="false">
    <template #actions>
      <span class="live"><span class="live__dot" /> LIVE</span>
    </template>
    <div class="feed">
      <section class="feed__rounds">
        <h3 class="feed__h">In the arena now</h3>
        <p v-if="!playing.length" class="mute feed__empty">Nobody is playing right now.</p>
        <ul class="rounds">
          <li v-for="r in playing" :key="String(r.id)" class="round" :class="{ 'is-thinking': r.thinking }">
            <div class="round__top">
              <strong>{{ r.displayName }}</strong>
              <span class="round__mode">{{ r.mode }}</span>
              <span class="spacer" />
              <span class="round__score">{{ r.score }} pts</span>
            </div>
            <div class="round__meta">
              <span v-if="r.thinking" class="round__moving">Attacker is moving…</span>
              <span v-else>Turn {{ r.turn }} · {{ Math.round(r.accuracy * 100) }}% accurate</span>
              <span class="spacer" />
              <span :class="r.attackerLive ? 'round__live' : 'mute'">{{
                r.attackerLive ? 'Nemotron' : 'scripted'
              }}</span>
            </div>
          </li>
        </ul>
        <template v-if="finished.length">
          <h3 class="feed__h feed__h--sub">Recently finished</h3>
          <ul class="rounds">
            <li v-for="r in finished" :key="String(r.id)" class="round round--done">
              <div class="round__top">
                <strong>{{ r.displayName }}</strong>
                <span class="round__mode">{{ r.mode }}</span>
                <span class="spacer" />
                <span class="round__outcome" :class="`is-${r.outcome}`">{{
                  OUTCOME[r.outcome] ?? r.outcome
                }}</span>
              </div>
              <div class="round__meta">{{ r.score }} pts · {{ ago(micros(r.updatedAt)) }}</div>
            </li>
          </ul>
        </template>
      </section>

      <section class="feed__stream">
        <h3 class="feed__h">Every move</h3>
        <p v-if="!feed.length" class="mute feed__empty">No activity yet.</p>
        <TransitionGroup tag="ol" :name="settled ? 'pop' : 'none'" class="stream">
          <li v-for="f in feed" :key="f.key" class="item" :class="`tone-${f.tone}`">
            <span class="item__bar" />
            <div class="item__body">
              <div class="item__line">
                <strong>{{ f.who }}</strong> {{ f.text }}
              </div>
              <div class="item__meta">{{ f.where }} · {{ ago(f.at) }}</div>
            </div>
          </li>
        </TransitionGroup>
      </section>
    </div>
  </CyberPanel>
</template>

<style scoped>
.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--f-ui);
  font-weight: 800;
  font-size: var(--fs-xs);
  letter-spacing: 0.14em;
  color: var(--c-harmful);
}
.live__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-harmful);
  animation: blink 1.2s steps(2) infinite;
}
.feed {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
}
.feed__rounds {
  padding: var(--s-4);
  border-right: 1px solid var(--c-line);
}
.feed__stream {
  padding: var(--s-4);
  min-width: 0;
}
.feed__h {
  font-family: var(--f-ui);
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-dim);
  margin-bottom: var(--s-3);
}
.feed__h--sub {
  margin-top: var(--s-5);
}
.feed__empty {
  font-size: var(--fs-sm);
}
.rounds {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.round {
  padding: var(--s-3);
  background: var(--paper-2);
  border: 2px solid var(--ink);
  border-radius: var(--r-md);
  font-size: var(--fs-sm);
}
.round.is-thinking {
  border-color: var(--c-magenta);
  box-shadow: 0 0 0 3px var(--c-magenta-tint);
}
.round--done {
  border-width: 1px;
  border-color: var(--c-line-strong);
}
.round__top,
.round__meta {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}
.round__meta {
  margin-top: 2px;
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
}
.round__mode {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--c-text-mute);
}
.round__score {
  font-family: var(--f-display);
  font-weight: 700;
}
.round__moving {
  color: var(--c-magenta);
  font-weight: 700;
}
.round__live {
  color: var(--c-magenta);
  font-weight: 700;
}
.round__outcome {
  font-size: var(--fs-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.round__outcome.is-clean {
  color: var(--c-ideal);
}
.round__outcome.is-contained {
  color: var(--c-ok);
}
.round__outcome.is-compromised {
  color: var(--c-harmful);
}
.stream {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 420px;
  overflow-y: auto;
}
.item {
  display: flex;
  gap: var(--s-3);
  padding: var(--s-2) var(--s-2) var(--s-2) 0;
  border-radius: var(--r-sm);
}
.item__bar {
  flex: none;
  width: 4px;
  border-radius: 2px;
  background: var(--c-line-strong);
}
.item__line {
  font-size: var(--fs-sm);
}
.item__meta {
  font-size: var(--fs-xs);
  color: var(--c-text-mute);
}
.tone-ideal .item__bar {
  background: var(--c-ideal);
}
.tone-ok .item__bar {
  background: var(--c-ok);
}
.tone-harmful .item__bar {
  background: var(--c-harmful);
}
.tone-harmful .item__line strong {
  color: var(--c-harmful);
}
.tone-attacker .item__bar {
  background: var(--c-magenta);
}
.tone-attacker .item__line strong {
  color: var(--c-magenta);
}
.pop-enter-active {
  transition:
    background 1.6s var(--ease),
    transform var(--t-med) var(--ease-bounce),
    opacity var(--t-med) var(--ease);
}
.pop-enter-from {
  opacity: 0;
  transform: translateY(-8px);
  background: var(--c-magenta-tint);
}
@keyframes blink {
  50% {
    opacity: 0.2;
  }
}
@media (max-width: 900px) {
  .feed {
    grid-template-columns: 1fr;
  }
  .feed__rounds {
    border-right: 0;
    border-bottom: 1px solid var(--c-line);
  }
}
@media (prefers-reduced-motion: reduce) {
  .live__dot {
    animation: none;
  }
  .pop-enter-active {
    transition: opacity var(--t-fast);
  }
}
</style>
