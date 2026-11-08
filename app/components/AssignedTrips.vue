<script setup lang="ts">
/*
 * Drills an admin assigned to this employee, still to do (new or in progress). Live from the
 * my_runs subscription, so a new assignment appears here the moment it's made.
 */
import { useTable } from 'spacetimedb/vue';
import { ATTACK_LABELS, type AttackType } from '@hackutd2026/shared';
import { tables } from '~/module_bindings';

const [runs] = useTable(tables.myRuns);
const trips = computed(() =>
  runs.value
    .filter((r) => !r.selfStarted && (r.status === 'assigned' || r.status === 'in_progress'))
    .sort((a, b) => (a.assignedAt.microsSinceUnixEpoch < b.assignedAt.microsSinceUnixEpoch ? 1 : -1))
);
const label = (t: string) => ATTACK_LABELS[t as AttackType] ?? t;
</script>

<template>
  <CyberPanel title="Your drills" :eyebrow="`Charter trips · ${trips.length}`" accent="magenta">
    <p v-if="!trips.length" class="trips__empty">
      Nothing assigned right now. Drills from your security lead land here, and pop up the moment they're
      booked.
    </p>
    <ul v-else class="trips">
      <li v-for="r in trips" :key="String(r.id)" class="trip">
        <div class="trip__body">
          <div class="trip__top">
            <span class="trip__title">{{ r.title }}</span>
            <span class="trip__pill" :class="r.status === 'assigned' ? 'is-new' : 'is-going'">
              {{ r.status === 'assigned' ? 'New' : 'In progress' }}
            </span>
          </div>
          <div class="trip__meta">{{ label(r.attackType) }} · {{ r.difficulty }} · guided, with hints</div>
          <p v-if="r.popupMessage" class="trip__msg">“{{ r.popupMessage }}”</p>
        </div>
        <CyberButton :to="`/practice/${r.id}`" icon="play" size="sm">
          {{ r.status === 'assigned' ? 'Start' : 'Continue' }}
        </CyberButton>
      </li>
    </ul>
  </CyberPanel>
</template>

<style scoped>
.trips__empty {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
}
.trips {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.trip {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-4);
  background: var(--paper-2);
  border: 2px solid var(--ink);
  border-radius: var(--r-md);
}
.trip__body {
  flex: 1;
  min-width: 0;
}
.trip__top {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex-wrap: wrap;
}
.trip__title {
  font-family: var(--f-display);
  font-size: var(--fs-lg);
  font-weight: 600;
}
.trip__pill {
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 1px 8px;
  border-radius: var(--r-pill);
  border: 1.5px solid currentColor;
}
.trip__pill.is-new {
  color: var(--c-magenta);
}
.trip__pill.is-going {
  color: var(--c-ok);
}
.trip__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
  margin-top: 2px;
}
.trip__msg {
  margin-top: var(--s-2);
  font-family: var(--f-hand);
  font-size: calc(var(--fs-lg) + 3px);
  color: var(--c-text);
}
@media (max-width: 600px) {
  .trip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
