<script setup lang="ts">
/* TRAINING DRILLS: what an admin set for you, still to do. Updates live. */
</script>

<template>
  <div class="asg-page">
    <header class="page-head">
      <div>
        <NuxtLink to="/incidents/practice" class="asg-page__back mono"><CyberIcon name="back" :size="14" /> Practice</NuxtLink>
        <div class="eyebrow eyebrow--magenta">Charter trips</div>
        <h1 class="page-head__title">Training drills</h1>
        <p class="page-head__sub">Guided drills from your security lead, with hints along the way. Every step is saved to your record.</p>
      </div>
    </header>

    <AssignedTrips />
  </div>
</template>

<style scoped>
.asg-page { display: flex; flex-direction: column; gap: var(--s-6); }
.asg-page .page-head { margin-bottom: 0; }
.asg-page__back { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); letter-spacing: .15em; text-transform: uppercase; color: var(--c-text-mute); margin-bottom: var(--s-2); }
</style>
