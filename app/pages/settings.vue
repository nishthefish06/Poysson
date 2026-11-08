<script setup lang="ts">
/*
 * SETTINGS: account info, simulation defaults, demo data.
 * DYNAMIC: player, setup (mode, difficulty).
 */
import { DIFFICULTY, type Difficulty } from '~/data/incidents'

const { player, state, resetDemo } = useGame()
const setup = computed(() => state.value.setup)
const diffs = Object.entries(DIFFICULTY) as [Difficulty, (typeof DIFFICULTY)[Difficulty]][]
const MODES = [
  { id: 'guided', label: 'Guided' },
  { id: 'unguided', label: 'Unguided' },
] as const

const confirmReset = ref(false)
function reset() {
  resetDemo()
  navigateTo('/login')
}
</script>

<template>
  <div class="set">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Settings</div>
        <h1 class="page-head__title">Preferences</h1>
      </div>
    </header>

    <CyberPanel title="Account" eyebrow="Operator">
      <dl class="set__rows">
        <div class="set__row"><dt>Handle</dt><dd>{{ player.handle }}</dd></div>
        <div class="set__row"><dt>Email</dt><dd class="mono">{{ player.email }}</dd></div>
        <div class="set__row">
          <dt>Passkeys</dt>
          <dd>
            {{ player.passkeys.length }} bound
            <CyberButton size="sm" variant="ghost" icon="plus" to="/passkey">Add passkey</CyberButton>
          </dd>
        </div>
      </dl>
    </CyberPanel>

    <CyberPanel title="Simulation defaults" eyebrow="Incident Ops" accent="magenta">
      <dl class="set__rows">
        <div class="set__row">
          <dt>Mode</dt>
          <dd class="set__seg" role="radiogroup" aria-label="Default simulation mode">
            <button
              v-for="m in MODES" :key="m.id" role="radio" :aria-checked="setup.mode === m.id"
              :class="{ 'is-on': setup.mode === m.id }" @click="state.setup.mode = m.id"
            >{{ m.label }}</button>
          </dd>
        </div>
        <div class="set__row">
          <dt>Difficulty</dt>
          <dd class="set__seg" role="radiogroup" aria-label="Default difficulty">
            <button
              v-for="[id, d] in diffs" :key="id" role="radio" :aria-checked="setup.difficulty === id"
              :class="{ 'is-on': setup.difficulty === id }" @click="state.setup.difficulty = id"
            >{{ d.label }}</button>
          </dd>
        </div>
      </dl>
    </CyberPanel>

    <CyberPanel title="Demo data" eyebrow="Hackathon" accent="red">
      <p class="dim set__note">Wipes local runs, badges, XP and audit entries on this browser, then signs you out.</p>
      <div class="set__danger">
        <template v-if="!confirmReset">
          <CyberButton variant="danger" size="sm" icon="trash" @click="confirmReset = true">Reset demo data</CyberButton>
        </template>
        <template v-else>
          <span class="mono set__confirm">Are you sure?</span>
          <CyberButton variant="danger" size="sm" icon="trash" @click="reset">Yes, reset</CyberButton>
          <CyberButton variant="ghost" size="sm" @click="confirmReset = false">Cancel</CyberButton>
        </template>
      </div>
    </CyberPanel>
  </div>
</template>

<style scoped>
.set { display: flex; flex-direction: column; gap: var(--s-5); max-width: 760px; }
.set .page-head { margin-bottom: 0; }
.set__rows { margin: 0; display: flex; flex-direction: column; }
.set__row { display: grid; grid-template-columns: 160px 1fr; gap: var(--s-4); align-items: center; padding: var(--s-3) 0; border-bottom: 1px solid var(--c-line); }
.set__row:last-child { border-bottom: 0; }
.set__row dt { font-size: var(--fs-xs); letter-spacing: .15em; text-transform: uppercase; color: var(--c-text-mute); }
.set__row dd { margin: 0; display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-3); color: var(--c-text); }
.set__seg { gap: 0 !important; }
.set__seg button { padding: 6px 14px; background: var(--c-bg-2); border: 1px solid var(--c-line-strong); color: var(--c-text-dim); cursor: pointer; font-family: var(--f-ui); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; font-size: var(--fs-xs); }
.set__seg button + button { border-left: 0; }
.set__seg button.is-on { color: var(--c-cyan); border-color: var(--c-cyan); background: rgba(0, 240, 255, .12); }
.set__note { font-size: var(--fs-sm); margin: 0 0 var(--s-3); }
.set__danger { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-3); }
.set__confirm { color: var(--c-harmful); font-size: var(--fs-sm); }
@media (max-width: 600px) { .set__row { grid-template-columns: 1fr; gap: var(--s-2); } }
</style>
