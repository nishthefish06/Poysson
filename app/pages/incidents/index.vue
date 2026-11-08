<script setup lang="ts">
import { COPY as copy } from '~/data/copy'
/*
 * INCIDENT OPS: entry point. Two tracks: read the Guides, or Practice (which then splits into
 * training drills an admin assigned to you and incident simulations).
 */
import { VECTORS } from '~/data/incidents'
import type { HubTrack } from '~/components/HubTracks.vue'

const TRACKS: HubTrack[] = [
  {
    to: '/incidents/guides',
    icon: 'fish',
    label: copy.guides,
    title: 'Learn',
    desc: copy.guidesDesc,
    cta: 'Open the tackle box',
    accent: 'cyan',
  },
  {
    to: '/incidents/practice',
    icon: 'hook',
    label: 'Out on the water',
    title: 'Practice',
    desc: 'Run the drills your security lead assigned, or build your own incident and fish it live.',
    cta: 'Cast off',
    accent: 'magenta',
  },
]
</script>

<template>
  <div class="hub">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">{{ copy.incidents }}</div>
        <h1 class="page-head__title">{{ copy.hubTitle }}</h1>
        <p class="page-head__sub">Study the playbook for {{ VECTORS.length }} threat vectors, then put it to work under the clock.</p>
      </div>
    </header>

    <HubTracks :tracks="TRACKS" />
  </div>
</template>

<style scoped>
.hub { display: flex; flex-direction: column; gap: var(--s-6); }
.hub .page-head { margin-bottom: 0; }
</style>
