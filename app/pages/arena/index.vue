<script setup lang="ts">
// OWNER: Person 4 (arena).
import type { ArenaMode } from '@hackutd2026/shared/arena';

const { error, busy, run } = useRunner();
const startRound = useStartArenaRound();
async function start(mode: ArenaMode) {
  await run(async () => {
    const s = await startRound(mode);
    await navigateTo(`/arena/${s.sessionId}`);
  });
}
</script>

<template>
  <main class="arena-start">
    <NuxtLink to="/dashboard" class="arena-start__back mono"><CyberIcon name="back" :size="14" /> Back to dashboard</NuxtLink>
    <h1 class="arena-start__title">Arena</h1>
    <p class="arena-start__intro">
      You get a mock work account: mail, a customer care portal, your security settings and your files. An AI
      attacker plays against you live. Some messages are real, some are attacks. If the attacker gets in, it
      really changes things in your account, and you have to find and undo the damage.
    </p>
    <div class="arena-start__modes">
      <button :disabled="busy" class="mode mode--bait" @click="start('bait')">
        <span class="mode__icon"><CyberIcon name="hook" :size="24" /></span>
        <span class="mode__who">Every employee</span>
        <span class="mode__name">Bait</span>
        <span class="mode__desc">
          Nothing has happened yet. Messages arrive; spot the attacks and don't hand over your login. Slip up
          and the attacker gets in.
        </span>
        <SketchBox :width="2.2" />
      </button>
      <button :disabled="busy" class="mode mode--breach" @click="start('breach')">
        <span class="mode__icon"><CyberIcon name="alert" :size="24" /></span>
        <span class="mode__who">Response team</span>
        <span class="mode__name">Breach</span>
        <span class="mode__desc">
          Someone is already in your account. Find what they changed, lock them out, undo it and report it,
          before they do more.
        </span>
        <SketchBox :width="2.2" />
      </button>
    </div>
    <p v-if="busy" class="arena-start__busy">Starting… the attacker is picking its first move.</p>
    <p v-if="error" class="arena-start__err">{{ error }}</p>
    <p class="arena-start__note">
      Everything here is fake: fictional company, fictional customers. Nothing you type into a login form is
      sent anywhere.
    </p>
    <SketchBox :width="2.6" />
  </main>
</template>

<style scoped>
/* Hand-drawn panel, same recipe as <CyberPanel>: paper, soft shadow, <SketchBox> outline. */
.arena-start {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  padding: var(--s-8);
  background: var(--paper);
  border-radius: var(--r-lg);
  box-shadow:
    5px 6px 0 rgba(18, 34, 74, 0.16),
    var(--glow-panel);
}
.arena-start__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-xs);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--c-text-mute);
}
.arena-start__title {
  font-family: var(--f-display);
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--ink);
  margin-top: var(--s-2);
}
.arena-start__intro {
  color: var(--c-text-dim);
  margin-top: var(--s-2);
}
.arena-start__modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-5);
  margin-top: var(--s-6);
}
.mode {
  --c: var(--c-cyan);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-1);
  padding: var(--s-5);
  font: inherit;
  text-align: left;
  color: var(--c-text);
  cursor: pointer;
  position: relative;
  background: var(--paper-2);
  border: 0;
  border-radius: var(--r-lg);
  box-shadow: 4px 5px 0 color-mix(in srgb, var(--c) 55%, var(--ink));
  transition:
    transform var(--t-med) var(--ease-bounce),
    box-shadow var(--t-med) var(--ease-bounce);
}
.mode--breach {
  --c: var(--c-magenta);
}
.mode:not(:disabled):hover {
  transform: translate(-2px, -3px) rotate(-0.6deg);
  box-shadow: 7px 8px 0 color-mix(in srgb, var(--c) 55%, var(--ink));
}
.mode:disabled {
  cursor: progress;
  opacity: 0.7;
}
.mode__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: var(--s-2);
  color: var(--c);
  border: 2.5px solid var(--c);
  border-radius: var(--blob);
  background: color-mix(in srgb, var(--c) 12%, var(--paper-2));
  animation: blob 10s var(--ease-soft) infinite;
}
.mode__who {
  font-family: var(--f-hand);
  font-size: var(--fs-lg);
  color: var(--c-text-dim);
  line-height: 1;
}
.mode__name {
  font-family: var(--f-display);
  font-size: var(--fs-xl);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c);
}
.mode__desc {
  color: var(--c-text-dim);
  font-size: var(--fs-sm);
}
.arena-start__busy {
  margin-top: var(--s-4);
  font-family: var(--f-hand);
  font-size: var(--fs-xl);
  color: var(--c-magenta);
}
.arena-start__err {
  margin-top: var(--s-3);
  color: var(--c-harmful);
}
.arena-start__note {
  margin-top: var(--s-6);
  font-size: var(--fs-xs);
  color: var(--c-text-mute);
}
@media (max-width: 700px) {
  .arena-start {
    padding: var(--s-5);
  }
  .arena-start__modes {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mode__icon {
    animation: none;
  }
}
</style>
