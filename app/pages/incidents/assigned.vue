<script setup lang="ts">
/* TRAINING DRILLS: what an admin set for you, still to do. Updates live. */
</script>

<template>
  <div class="asg-page">
    <header class="page-head">
      <div>
        <BackButton to="/incidents/practice" label="Back to practice" />
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
</style>
