<script setup lang="ts">
// OWNER: Person 4 (arena). Messages + a mock work account the attacker can actually change.
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
const tabs: { id: Tab; label: string }[] = [
  { id: 'messages', label: 'Messages' },
  { id: 'mail', label: 'Mail' },
  { id: 'portal', label: 'Care Portal' },
  { id: 'security', label: 'My Security' },
  { id: 'files', label: 'Files' },
  { id: 'activity', label: 'Activity log' },
];

onMounted(() => run(async () => apply(await $fetch<ArenaState>(`/api/arena/${id}`))));

const active = computed(() => state.value?.status === 'active');
const thinking = computed(() => state.value?.thinking ?? false);
const locked = computed(() => !active.value || busy.value || thinking.value);
const selected = computed<ScenarioStep | null>(
  () => state.value?.steps.find((s) => s.id === selectedId.value) ?? state.value?.steps.at(-1) ?? null
);
const encrypted = computed(() => state.value?.world.files.some((f) => f.encrypted) ?? false);

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
  <main v-if="state" class="p-4">
    <!-- always-visible bar: where am I, what do I do, how do I leave -->
    <header class="mb-4 flex flex-wrap items-center gap-3 rounded bg-panel p-3 text-sm">
      <NuxtLink to="/dashboard" class="rounded border border-line px-3 py-1">← Dashboard</NuxtLink>
      <button class="rounded border border-line px-3 py-1" :disabled="busy" @click="newRound">
        New round
      </button>
      <span class="rounded bg-line px-2 py-0.5 font-mono text-xs uppercase">{{ state.mode }}</span>
      <span
        data-testid="attacker-badge"
        class="rounded px-2 py-0.5 text-xs"
        :class="state.attacker.live ? 'bg-neon-pink text-white' : 'bg-line text-neutral-700'"
        :title="
          state.attacker.live
            ? `Every attacker move is written live by ${state.attacker.model}`
            : 'Nemotron is unavailable; a scripted attacker is playing'
        "
      >
        {{ state.attacker.live ? 'Attacker: Nemotron · live' : 'Attacker: scripted' }}
      </span>
      <p class="flex-1 text-neutral-700">
        <template v-if="!active">Round over. Scroll down for what really happened.</template>
        <template v-else-if="state.mode === 'breach'"
          >Someone else is in your account. Check every tab, lock them out, undo what they changed, and report
          it.</template
        >
        <template v-else
          >Read each message and choose what to do. If you think something got into your account, check the
          other tabs.</template
        >
      </p>
      <span class="font-bold">{{ state.score }} pts</span>
      <span class="text-neutral-600">turn {{ state.turn }}</span>
      <button
        v-if="active"
        class="rounded border border-line px-3 py-1"
        :disabled="busy || thinking"
        @click="endRound"
      >
        End round
      </button>
    </header>

    <ArenaSummary v-if="state.summary" :state="state" class="mb-8" @again="newRound" />

    <div class="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <section class="rounded bg-panel p-3">
        <nav class="mb-3 flex flex-wrap gap-1 border-b border-line pb-2">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="rounded px-3 py-1 text-sm"
            :class="tab === t.id ? 'bg-line font-semibold' : 'text-neutral-600 hover:bg-line/50'"
            @click="tab = t.id"
          >
            {{ t.label }}<span v-if="t.id === 'files' && encrypted" class="ml-1 text-verdict-harmful">●</span>
          </button>
        </nav>

        <div v-if="tab === 'messages'" class="grid gap-4 md:grid-cols-[14rem_1fr]">
          <aside>
            <button
              v-for="s in [...state.steps].reverse()"
              :key="s.id"
              class="mb-1 block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-line"
              :class="{ 'bg-line': selected?.id === s.id }"
              @click="open(s)"
            >
              <span class="font-mono text-xs uppercase text-neutral-500">{{ s.channel }}</span>
              {{ s.subject || s.from }}
            </button>
            <p v-if="!state.steps.length" class="text-sm text-neutral-500">Inbox empty.</p>
          </aside>
          <div>
            <StepView v-if="selected" :step="selected" :disabled="locked" @act="act" />
            <p v-else class="text-neutral-500">Waiting for something to happen…</p>
          </div>
        </div>
        <MailApp v-else-if="tab === 'mail'" :world="state.world" :disabled="locked" @respond="respond" />
        <PortalApp v-else-if="tab === 'portal'" :world="state.world" :disabled="locked" @respond="respond" />
        <SecurityApp
          v-else-if="tab === 'security'"
          :world="state.world"
          :disabled="locked"
          @respond="respond"
        />
        <FilesApp v-else-if="tab === 'files'" :world="state.world" :disabled="locked" @respond="respond" />
        <ActivityApp v-else :world="state.world" />
      </section>

      <aside class="space-y-3 text-sm">
        <div class="rounded bg-panel p-3">
          <p class="text-neutral-600">Accuracy {{ Math.round(state.accuracy * 100) }}%</p>
          <p v-if="busy || thinking" class="mt-1 text-neon-pink">The attacker is moving…</p>
          <div v-if="last" data-testid="verdict" class="mt-2 rounded border border-line p-2">
            <p class="font-semibold" :class="`text-verdict-${last.judgment.verdict}`">
              {{ last.judgment.verdict }} ({{ last.counted ? last.judgment.points : 'already counted' }})
            </p>
            <p>{{ last.judgment.reason }}</p>
            <div
              v-if="last.guidance"
              data-testid="guidance"
              class="mt-2 border-t border-line pt-2 text-xs text-neutral-600"
            >
              <p class="font-semibold text-neon-cyan">📘 {{ last.guidance.cite }}</p>
              <p class="mt-1">{{ last.guidance.text }}</p>
            </div>
          </div>
          <p v-if="error" class="mt-2 text-verdict-harmful">{{ error }}</p>
        </div>
        <div v-if="active" class="rounded bg-panel p-3">
          <p class="mb-1 font-semibold">Report to security</p>
          <textarea
            v-model="reportText"
            rows="3"
            class="w-full rounded border border-line bg-bg p-2"
            placeholder="What did you notice?"
          />
          <button
            :disabled="locked"
            class="mt-1 rounded bg-neon-cyan px-3 py-1 font-semibold text-white disabled:opacity-40"
            @click="report"
          >
            Report incident
          </button>
        </div>
        <div class="rounded bg-panel p-3">
          <p class="mb-1 font-semibold">What's happened</p>
          <ol class="space-y-1 text-neutral-600">
            <li v-for="e in [...state.log].reverse().filter((x) => x.type !== 'step')" :key="e.seq">
              {{ e.text }}<span v-if="e.verdict"> → {{ e.verdict }}</span>
            </li>
          </ol>
        </div>
      </aside>
    </div>
  </main>
  <main v-else class="p-8 text-neutral-500">
    {{ error || 'Loading…' }}
    <NuxtLink v-if="error" to="/arena" class="ml-2 underline">Start a new round</NuxtLink>
  </main>
</template>
