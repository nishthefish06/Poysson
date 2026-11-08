<script setup lang="ts">
/*
 * Live assignment pop-up. When an admin assigns a simulation, the new run reaches this employee
 * through the my_runs subscription and this card drops in on whatever page they're on, with
 * the admin's message and a Start button. Dismissed runs are remembered per browser.
 */
import { useTable } from 'spacetimedb/vue';
import { ATTACK_LABELS, type AttackType } from '@hackutd2026/shared';
import { tables } from '~/module_bindings';

const { account } = useSession();
const [runs] = useTable(tables.myRuns);
const route = useRoute();

const key = computed(() => `poysson:dismissed-assignments:${account.value?.id ?? 'anon'}`);
const dismissed = ref(new Set<string>());
watch(
  key,
  (k) => {
    try {
      dismissed.value = new Set(JSON.parse(localStorage.getItem(k) ?? '[]') as string[]);
    } catch {
      dismissed.value = new Set();
    }
  },
  { immediate: true }
);
function remember(id: bigint) {
  dismissed.value = new Set([...dismissed.value, String(id)]);
  try {
    localStorage.setItem(key.value, JSON.stringify([...dismissed.value]));
  } catch {
    // storage blocked: it just shows again next visit
  }
}

// Newest assignment the employee hasn't started or dismissed, unless they're already on it.
const current = computed(
  () =>
    runs.value
      .filter(
        (r) =>
          r.status === 'assigned' &&
          !r.selfStarted &&
          !dismissed.value.has(String(r.id)) &&
          route.path !== `/practice/${r.id}`
      )
      .sort((a, b) => (a.assignedAt.microsSinceUnixEpoch < b.assignedAt.microsSinceUnixEpoch ? 1 : -1))[0]
);
const waiting = computed(() => runs.value.filter((r) => r.status === 'assigned' && !r.selfStarted).length);

function start() {
  const r = current.value;
  if (!r) return;
  remember(r.id);
  void navigateTo(`/practice/${r.id}`);
}
function later() {
  if (current.value) remember(current.value.id);
}
</script>

<template>
  <Transition name="assign">
    <aside
      v-if="current"
      :key="String(current.id)"
      class="assign"
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="assign-title"
    >
      <div class="assign__ping"><CyberIcon name="hook" :size="22" /></div>
      <div class="assign__body">
        <p class="assign__eyebrow">New drill assigned · live</p>
        <h2 id="assign-title" class="assign__title">{{ current.title }}</h2>
        <p class="assign__meta">
          {{ ATTACK_LABELS[current.attackType as AttackType] ?? current.attackType }} ·
          {{ current.difficulty }} · {{ current.mode === 'guided' ? 'guided, with hints' : 'unguided' }}
        </p>
        <p v-if="current.popupMessage" class="assign__msg">“{{ current.popupMessage }}”</p>
        <p class="assign__brief">{{ current.summary }}</p>
        <div class="assign__actions">
          <CyberButton icon="play" @click="start">Start now</CyberButton>
          <CyberButton variant="ghost" @click="later">Later</CyberButton>
          <span v-if="waiting > 1" class="assign__more">{{ waiting - 1 }} more waiting in Practice</span>
        </div>
      </div>
      <button class="assign__close" aria-label="Dismiss" @click="later">
        <CyberIcon name="x" :size="16" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.assign {
  position: fixed;
  right: var(--s-6);
  bottom: var(--s-6);
  z-index: 60;
  width: min(420px, calc(100vw - 2 * var(--s-4)));
  display: flex;
  gap: var(--s-4);
  padding: var(--s-5);
  background: var(--paper-2);
  border: 3px solid var(--ink);
  border-radius: var(--r-lg);
  box-shadow: 6px 6px 0 var(--ink);
  color: var(--c-text);
}
.assign__ping {
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--c-magenta);
  color: var(--c-text-invert);
  border: 2px solid var(--ink);
  animation: ping 1.6s var(--ease) infinite;
}
.assign__body {
  min-width: 0;
  flex: 1;
}
.assign__eyebrow {
  font-family: var(--f-ui);
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-magenta);
}
.assign__title {
  font-family: var(--f-display);
  font-size: var(--fs-xl);
  line-height: 1.15;
  margin-top: 2px;
}
.assign__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
  margin-top: var(--s-1);
}
.assign__msg {
  margin-top: var(--s-3);
  padding: var(--s-2) var(--s-3);
  background: var(--c-magenta-tint);
  border-left: 3px solid var(--c-magenta);
  border-radius: var(--r-sm);
  font-family: var(--f-hand);
  font-size: calc(var(--fs-lg) + 3px);
}
.assign__brief {
  margin-top: var(--s-3);
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
}
.assign__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-4);
}
.assign__more {
  font-size: var(--fs-xs);
  color: var(--c-text-mute);
}
.assign__close {
  position: absolute;
  top: var(--s-2);
  right: var(--s-2);
  background: none;
  border: 0;
  color: var(--c-text-mute);
  cursor: var(--cursor-fish-bite);
  padding: var(--s-1);
}
.assign__close:hover {
  color: var(--c-text);
}
@keyframes ping {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--rgb-magenta), 0.5);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(var(--rgb-magenta), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--rgb-magenta), 0);
  }
}
.assign-enter-active {
  transition:
    transform var(--t-med) var(--ease-bounce),
    opacity var(--t-med) var(--ease);
}
.assign-leave-active {
  transition:
    transform var(--t-fast) var(--ease-soft),
    opacity var(--t-fast) var(--ease-soft);
}
.assign-enter-from,
.assign-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
@media (max-width: 600px) {
  .assign {
    right: var(--s-4);
    left: var(--s-4);
    bottom: var(--s-4);
    width: auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .assign__ping {
    animation: none;
  }
  .assign-enter-active,
  .assign-leave-active {
    transition: opacity var(--t-fast);
  }
}
</style>
