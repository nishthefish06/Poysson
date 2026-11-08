<script setup lang="ts">
// OWNER: Person 4 (arena). Messages + a mock work account the attacker can actually change.
// Laid out like the Drills simulator: a top bar, the inbox/apps panel, and a right-hand HUD.
import type { ScenarioStep } from '@hackutd2026/shared';
import type {
  ArenaAction,
  ArenaActionResponse,
  ArenaState,
  EnvAction,
  Judgment,
  RunbookRef,
} from '@hackutd2026/shared/arena';

import { useTable } from 'spacetimedb/vue';
import { tables } from '~/module_bindings';

const id = useRoute().params.id as string;
const state = ref<ArenaState | null>(null);
// Newer snapshot wins, whether it came from an HTTP response or live from SpacetimeDB.
function apply(s: ArenaState) {
  if (!state.value || s.sessionId !== state.value.sessionId || s.rev >= state.value.rev) state.value = s;
}
const startRound = useStartArenaRound();

// Live: the server mirrors this round into SpacetimeDB on every change (attacker moves included).
const [liveRounds] = useTable(tables.myArenaRounds);
const liveRow = computed(() => liveRounds.value.find((x) => x.roundKey === id));
watch(liveRow, (row) => {
  if (!row) return;
  try {
    apply(JSON.parse(row.stateJson) as ArenaState);
  } catch {
    // a malformed snapshot: keep what we have
  }
});
// Fallback while the attacker is moving and this round isn't live (signed out, no SpacetimeDB).
let poll: ReturnType<typeof setInterval> | undefined;
watch(
  () => state.value?.thinking && !liveRow.value,
  (needPoll) => {
    clearInterval(poll);
    if (needPoll)
      poll = setInterval(async () => {
        try {
          apply(await $fetch<ArenaState>(`/api/arena/${id}`));
        } catch {
          // try again next tick
        }
      }, 1500);
  }
);
onUnmounted(() => clearInterval(poll));
const selectedId = ref<string | null>(null);
const last = ref<{ judgment: Judgment; counted: boolean; guidance: RunbookRef | null } | null>(null);
const reportText = ref('');
const { error, busy, run } = useRunner();

type Tab = 'messages' | 'mail' | 'portal' | 'security' | 'files' | 'activity';
const tab = ref<Tab>('messages');
const tabModel = computed({ get: () => tab.value as string, set: (v: string) => (tab.value = v as Tab) });

onMounted(() => run(async () => apply(await $fetch<ArenaState>(`/api/arena/${id}`))));

const active = computed(() => state.value?.status === 'active');
const thinking = computed(() => state.value?.thinking ?? false);
const locked = computed(() => !active.value || busy.value || thinking.value);
const selected = computed<ScenarioStep | null>(
  () => state.value?.steps.find((s) => s.id === selectedId.value) ?? state.value?.steps.at(-1) ?? null
);
const encrypted = computed(() => state.value?.world.files.some((f) => f.encrypted) ?? false);
const tabs = computed(() => [
  { id: 'messages', label: 'Messages', icon: 'mail', count: state.value?.steps.length ?? 0 },
  { id: 'mail', label: 'Mail', icon: 'list' },
  { id: 'portal', label: 'Care Portal', icon: 'user' },
  { id: 'security', label: 'My Security', icon: 'shield' },
  { id: 'files', label: encrypted.value ? 'Files ●' : 'Files', icon: 'lock' },
  { id: 'activity', label: 'Activity log', icon: 'clock' },
]);
const CHANNEL_ICON: Record<string, string> = {
  email: 'mail', sms: 'sms', chat: 'sms', call: 'phone', popup: 'alert', social: 'user', web: 'lock', system: 'terminal',
};
// opened_step isn't a decision, so the verdict pill only ever shows ideal / ok / harmful / neutral
const verdictStatus = (v: string) => (v === 'ideal' || v === 'ok' || v === 'harmful' ? v : 'pending');

async function post(path: string, body: ArenaAction | EnvAction, isDecision = true) {
  if (busy.value || thinking.value) return; // the attacker is still moving
  await run(async () => {
    const res = await $fetch<ArenaActionResponse>(`/api/arena/${id}/${path}`, { method: 'POST', body });
    apply(res.state);
    // opening a message isn't a decision: keep showing the last real verdict
    if (isDecision)
      last.value = { judgment: res.judgment, counted: res.counted, guidance: res.guidance ?? null };
  });
}
const act = (a: ArenaAction) => post('action', a, a.kind !== 'opened_step');
const respond = (a: EnvAction) => post('respond', a);

async function report() {
  const details = reportText.value.trim() || 'Something is wrong with my account.';
  await respond({ action: 'report_incident', details });
  reportText.value = '';
}

async function endRound() {
  if (busy.value || thinking.value) return;
  await run(async () => apply(await $fetch<ArenaState>(`/api/arena/${id}/end`, { method: 'POST' })));
}

async function newRound() {
  const mode = state.value?.mode ?? 'bait';
  await run(async () => {
    const s = await startRound(mode);
    state.value = null;
    last.value = null;
    selectedId.value = null;
    tab.value = 'messages';
    await navigateTo(`/arena/${s.sessionId}`);
    state.value = s;
  });
}

function open(s: ScenarioStep) {
  selectedId.value = s.id;
  void act({ stepId: s.id, kind: 'opened_step', detail: '' });
}
</script>

<template>
  <div v-if="state" class="arena">
    <!-- always-visible bar: where am I, what do I do, how do I leave -->
    <header class="arena__top">
      <BackButton to="/dashboard" label="Back to dashboard" />
      <div class="arena__op">
        <div class="eyebrow eyebrow--magenta">Deep Water · {{ state.mode }}</div>
        <p class="arena__hint">
          <template v-if="!active">Round over. Scroll down for what really happened.</template>
          <template v-else-if="state.mode === 'breach'"
            >Someone else is in your account. Check every tab, lock them out, undo what they changed, and
            report it.</template
          >
          <template v-else
            >Read each message and choose what to do. If you think something got into your account, check
            the other tabs.</template
          >
        </p>
      </div>
      <div class="spacer" />
      <span
        data-testid="attacker-badge"
        class="arena__attacker mono"
        :class="{ 'is-live': state.attacker.live }"
        :title="
          state.attacker.live
            ? `Every attacker move is written live by ${state.attacker.model}`
            : 'Nemotron is unavailable; a scripted attacker is playing'
        "
      >
        <span class="arena__attacker-dot" />{{
          state.attacker.live ? 'Attacker: Nemotron · live' : 'Attacker: scripted'
        }}
      </span>
      <CyberButton variant="secondary" size="sm" icon="shuffle" :disabled="busy" @click="newRound">New round</CyberButton>
      <CyberButton v-if="active" size="sm" icon="x" :disabled="busy || thinking" @click="endRound">End round</CyberButton>
    </header>

    <ArenaSummary v-if="state.summary" :state="state" @again="newRound" />

    <main class="arena__grid">
      <CyberPanel :padded="false" accent="cyan" class="arena__work">
        <div class="arena__tabs"><TabBar v-model="tabModel" :tabs="tabs" /></div>

        <div v-if="tab === 'messages'" class="arena__inbox">
          <nav class="arena__queue">
            <div class="arena__queue-head eyebrow">Inbox · {{ state.steps.length }}</div>
            <button
              v-for="s in [...state.steps].reverse()"
              :key="s.id"
              class="arena__qitem"
              :class="{ 'is-sel': selected?.id === s.id }"
              @click="open(s)"
            >
              <CyberIcon :name="CHANNEL_ICON[s.channel] ?? 'mail'" :size="16" />
              <div class="arena__qitem-main">
                <div class="arena__qitem-from">{{ s.subject || s.from }}</div>
                <div class="arena__qitem-subj mono">{{ s.channel }} · {{ s.from }}</div>
              </div>
            </button>
            <div v-if="!state.steps.length" class="arena__empty mono">// inbox empty</div>
          </nav>
          <div class="arena__detail">
            <StepView v-if="selected" :key="selected.id" :step="selected" :disabled="locked" @act="act" />
            <div v-else class="arena__detail--empty">
              <CyberIcon name="radar" :size="48" :stroke="1" />
              <div class="mono">Waiting for something to happen…</div>
            </div>
          </div>
        </div>
        <div v-else class="arena__app">
          <MailApp v-if="tab === 'mail'" :world="state.world" :disabled="locked" @respond="respond" />
          <PortalApp v-else-if="tab === 'portal'" :world="state.world" :disabled="locked" @respond="respond" />
          <SecurityApp v-else-if="tab === 'security'" :world="state.world" :disabled="locked" @respond="respond" />
          <FilesApp v-else-if="tab === 'files'" :world="state.world" :disabled="locked" @respond="respond" />
          <ActivityApp v-else :world="state.world" />
        </div>
      </CyberPanel>

      <aside class="arena__right">
        <CyberPanel accent="cyan" class="arena__hud">
          <div class="arena__stats">
            <div>
              <div class="eyebrow">Score</div>
              <div class="arena__stat-val">{{ state.score }}</div>
            </div>
            <div>
              <div class="eyebrow">Accuracy</div>
              <div class="arena__stat-val">{{ Math.round(state.accuracy * 100) }}%</div>
            </div>
            <div>
              <div class="eyebrow">Turn</div>
              <div class="arena__stat-val">{{ state.turn }}</div>
            </div>
          </div>
          <p v-if="busy || thinking" class="arena__moving mono"><span class="arena__attacker-dot" /> The attacker is moving…</p>
          <div v-if="last" data-testid="verdict" class="arena__verdict">
            <div class="arena__verdict-head">
              <StatusPill :status="verdictStatus(last.judgment.verdict)" :label="last.judgment.verdict.toUpperCase()" />
              <span class="arena__pts mono">{{
                last.counted ? `${last.judgment.points > 0 ? '+' : ''}${last.judgment.points}` : 'already counted'
              }}</span>
            </div>
            <p class="arena__verdict-text">{{ last.judgment.reason }}</p>
            <div v-if="last.guidance" data-testid="guidance" class="arena__guide">
              <div class="arena__guide-cite">📘 {{ last.guidance.cite }}</div>
              <p>{{ last.guidance.text }}</p>
            </div>
          </div>
          <p v-if="error" class="arena__error">{{ error }}</p>
        </CyberPanel>

        <CyberPanel v-if="active" title="Report to security" eyebrow="Incident" accent="magenta">
          <textarea v-model="reportText" rows="3" class="arena__textarea" placeholder="What did you notice?" />
          <CyberButton block size="sm" icon="alert" :disabled="locked" class="arena__report-btn" @click="report">Report incident</CyberButton>
        </CyberPanel>

        <CyberPanel title="What's happened" eyebrow="Timeline" accent="none" class="arena__log">
          <ol class="arena__log-list">
            <li v-for="e in [...state.log].reverse().filter((x) => x.type !== 'step')" :key="e.seq">
              <span>{{ e.text }}</span>
              <StatusPill v-if="e.verdict" size="sm" :status="verdictStatus(e.verdict)" :label="e.verdict.toUpperCase()" />
            </li>
          </ol>
        </CyberPanel>
      </aside>
    </main>
  </div>
  <div v-else class="arena__loading mono">
    {{ error || 'Loading…' }}
    <NuxtLink v-if="error" to="/arena" class="arena__retry">Start a new round</NuxtLink>
  </div>
</template>

<style scoped>
.arena { display: flex; flex-direction: column; gap: var(--s-5); }

/* top bar: same paper strip + magenta underline as the Drills simulator */
.arena__top { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-4); padding: var(--s-3) var(--s-5); background: var(--paper); border-radius: var(--r-lg); border-bottom: 4px solid var(--c-magenta); box-shadow: 5px 6px 0 rgba(18, 34, 74, .16); }
.arena__op { min-width: 0; flex: 1 1 320px; }
.arena__hint { margin: 2px 0 0; font-size: var(--fs-sm); color: var(--c-text-dim); }
.arena__attacker { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; font-size: var(--fs-xs); font-weight: 700; letter-spacing: .08em; color: var(--c-text-dim); background: var(--c-bg-2); border: 1px solid var(--c-line-strong); border-radius: var(--r-pill); }
.arena__attacker.is-live { color: #fff; background: var(--c-magenta); border-color: var(--c-magenta); }
.arena__attacker-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: blink 1s steps(2) infinite; }

.arena__grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: var(--s-4); align-items: start; }
.arena__tabs { padding: var(--s-4) var(--s-4) 0; }

/* inbox: same queue + detail layout as the Drills simulator */
.arena__inbox { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 520px; }
.arena__queue { border-right: 1px solid var(--c-line); display: flex; flex-direction: column; overflow-y: auto; max-height: 720px; }
.arena__queue-head { padding: var(--s-4) var(--s-4) var(--s-2); }
.arena__qitem { display: grid; grid-template-columns: 16px 1fr; gap: var(--s-2); align-items: start; padding: var(--s-3) var(--s-4); background: none; border: 0; border-left: 3px solid transparent; border-bottom: 1px solid var(--c-line); color: var(--c-text-dim); text-align: left; font-family: var(--f-ui); animation: slide-in .3s var(--ease); }
.arena__qitem:hover { background: var(--c-bg-2); }
.arena__qitem.is-sel { background: var(--c-bg-3); border-left-color: var(--c-magenta); color: var(--c-text); }
.arena__qitem-main { min-width: 0; }
.arena__qitem-from { font-weight: 700; font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.arena__qitem-subj { font-size: 11px; color: var(--c-text-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.arena__empty { color: var(--c-text-mute); font-size: var(--fs-xs); padding: var(--s-4); }
.arena__detail { padding: var(--s-5) var(--s-6); min-width: 0; }
.arena__detail--empty { height: 100%; min-height: 320px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-3); color: var(--c-text-mute); font-size: var(--fs-xs); }
.arena__app { padding: var(--s-5) var(--s-6) var(--s-6); }

.arena__right { display: flex; flex-direction: column; gap: var(--s-4); }
.arena__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-2); }
.arena__stat-val { font-size: var(--fs-2xl); color: var(--c-magenta); line-height: 1.1; }
.arena__moving { display: flex; align-items: center; gap: 6px; margin-top: var(--s-3); font-size: var(--fs-xs); color: var(--c-magenta); }
.arena__verdict { margin-top: var(--s-4); padding-top: var(--s-4); border-top: 1px dashed var(--c-line-strong); display: flex; flex-direction: column; gap: var(--s-2); }
.arena__verdict-head { display: flex; align-items: center; gap: var(--s-2); }
.arena__pts { font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-dim); }
.arena__verdict-text { margin: 0; font-size: var(--fs-sm); }
.arena__guide { padding: var(--s-3); background: var(--paper-2); border-left: 3px solid var(--c-cyan); border-radius: var(--r-sm); font-size: var(--fs-xs); color: var(--c-text-dim); }
.arena__guide p { margin: 4px 0 0; }
.arena__guide-cite { font-weight: 700; color: var(--c-cyan); }
.arena__error { margin: var(--s-3) 0 0; color: var(--c-harmful); font-size: var(--fs-sm); }
.arena__textarea { width: 100%; resize: vertical; min-height: 72px; padding: var(--s-3); color: var(--c-text); background: var(--paper-2); border: 1.5px solid var(--c-line-strong); border-radius: var(--r-md); font: var(--fs-sm) var(--f-ui); line-height: 1.4; }
.arena__textarea:focus { outline: none; border-color: var(--c-magenta); box-shadow: 0 0 0 3px rgba(var(--rgb-magenta), .12); }
.arena__report-btn { margin-top: var(--s-3); }
.arena__log-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--s-2); max-height: 360px; overflow-y: auto; font-size: var(--fs-sm); color: var(--c-text-dim); }
.arena__log-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-bottom: var(--s-2); border-bottom: 1px dashed var(--c-line); }
.arena__loading { padding: var(--s-8); color: var(--c-text-mute); }
.arena__retry { margin-left: var(--s-2); color: var(--c-magenta); text-decoration: underline; }

@media (max-width: 1100px) { .arena__grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .arena__inbox { grid-template-columns: 1fr; } .arena__queue { border-right: 0; border-bottom: 1px solid var(--c-line); max-height: 220px; } }
</style>
