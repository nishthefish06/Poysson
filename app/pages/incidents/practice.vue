<script setup lang="ts">
import { COPY as copy } from '~/data/copy'
/*
 * PRACTICE: pick a track. Training drills an admin assigned to you (live from SpacetimeDB), or an
 * incident simulation you build yourself.
 */
import { useTable } from 'spacetimedb/vue'
import { tables } from '~/module_bindings'
import type { HubTrack } from '~/components/HubTracks.vue'

const [runs] = useTable(tables.myRuns)
const todo = computed(
  () => runs.value.filter(r => !r.selfStarted && (r.status === 'assigned' || r.status === 'in_progress')).length,
)

const tracks = computed<HubTrack[]>(() => [
  {
    to: '/incidents/assigned',
    icon: 'anchor',
    label: 'Charter trips',
    title: 'Training drills',
    desc: 'Drills your security lead sets for you, with hints along the way. Saved to your record.',
    cta: todo.value ? 'See my drills' : 'Check my drills',
    accent: 'magenta',
    badge: todo.value ? `${todo.value} to do` : undefined,
  },
  {
    to: '/incidents/simulations',
    icon: 'hook',
    label: copy.sims,
    title: 'Incident practice',
    desc: copy.simsDesc,
    cta: 'Build an incident',
    accent: 'cyan',
  },
])
</script>

<template>
  <div class="hub">
    <header class="page-head">
      <div>
        <BackButton to="/incidents" :label="copy.incidents" />
        <div class="eyebrow eyebrow--magenta">Practice</div>
        <h1 class="page-head__title">How do you want to practice?</h1>
        <p class="page-head__sub">Work through what you've been assigned, or build an incident of your own.</p>
      </div>
    </header>

    <HubTracks :tracks="tracks" />
  </div>
</template>

<style scoped>
.hub { display: flex; flex-direction: column; gap: var(--s-6); }
.hub .page-head { margin-bottom: 0; }
</style>
