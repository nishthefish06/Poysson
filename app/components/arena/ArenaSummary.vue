<script setup lang="ts">
// End of round: outcome, debrief, what the attacker did (and whether you undid it), message by message.
import type { ArenaState } from '@hackutd2026/shared/arena';
defineProps<{ state: ArenaState }>();
const emit = defineEmits<{ again: [] }>();
</script>

<template>
  <section v-if="state.summary" class="sum">
    <CyberPanel
      :eyebrow="`Round over · ${state.mode} mode`"
      :accent="state.summary.outcome === 'compromised' ? 'red' : 'cyan'"
    >
      <h2 class="sum__headline" :class="state.summary.outcome === 'compromised' ? 'is-bad' : 'is-good'">
        {{ state.summary.headline }}
      </h2>
      <div class="sum__stats">
        <div>
          <div class="eyebrow">Score</div>
          <div class="sum__stat-val">{{ state.score }}</div>
        </div>
        <div>
          <div class="eyebrow">Accuracy</div>
          <div class="sum__stat-val">{{ Math.round(state.accuracy * 100) }}%</div>
        </div>
      </div>
      <p class="sum__debrief">{{ state.summary.debrief }}</p>
      <p class="sum__source mono">
        Debrief written by
        {{
          state.summary.debriefSource === 'gemini'
            ? 'Gemini'
            : state.summary.debriefSource === 'nemotron'
              ? 'Nemotron'
              : 'the built-in coach'
        }}.
      </p>
      <div class="sum__actions">
        <CyberButton icon="shuffle" @click="emit('again')">New round</CyberButton>
        <BackButton to="/dashboard" label="Back to dashboard" />
      </div>
    </CyberPanel>

    <div
      v-if="state.summary.attackerReveal"
      data-testid="attacker-reveal"
      class="sum__reveal"
    >
      <div class="eyebrow eyebrow--magenta">🎣 The attacker's side</div>
      <p class="sum__reveal-text">“{{ state.summary.attackerReveal.text }}”</p>
      <p class="sum__source mono">
        {{
          state.summary.attackerReveal.source === 'nemotron'
            ? 'Written by Nemotron, the model that played the attacker, from its own moves this round.'
            : 'Reconstructed from this round’s moves.'
        }}
      </p>
      <SketchBox color="var(--c-magenta)" :width="2.4" />
    </div>

    <div class="sum__cols">
      <CyberPanel v-if="state.summary.attackerActions.length" title="What the attacker did" accent="red">
        <div v-for="(a, i) in state.summary.attackerActions" :key="i" class="sum__line">
          <StatusPill
            size="sm"
            :status="a.remediated ? 'ideal' : 'harmful'"
            :label="
              a.remediated
                ? a.undoable
                  ? '✓ undone'
                  : '✓ reported'
                : a.undoable
                  ? '✗ still in place'
                  : '✗ can\'t be undone, and not reported'
            "
          />
          <span>{{ a.text }}</span>
        </div>
      </CyberPanel>

      <CyberPanel title="Every message, revealed" accent="cyan">
        <div v-for="m in state.summary.messages" :key="m.stepId" class="sum__msg">
          <div class="sum__line">
            <StatusPill size="sm" :status="m.malicious ? 'harmful' : 'ideal'" :label="m.malicious ? 'ATTACK' : 'legit'" />
            <b>{{ m.title }}</b>
            <span v-if="m.ignored" class="sum__verdict is-ok">ignored (safe; reporting it is better)</span>
            <span v-else class="sum__verdict" :class="m.handledWell ? 'is-good' : 'is-bad'">{{
              m.handledWell ? 'handled well' : 'missed'
            }}</span>
          </div>
          <p v-if="m.redFlags.length" class="sum__tells">Tells: {{ m.redFlags.join(' · ') }}</p>
        </div>
      </CyberPanel>
    </div>

    <CyberPanel
      v-if="state.summary.runbook.length"
      data-testid="summary-runbook"
      title="Runbook sections to review"
      eyebrow="Playbook"
      accent="cyan"
    >
      <div v-for="r in state.summary.runbook" :key="r.id" class="sum__guide">
        <div class="sum__guide-cite">📘 {{ r.cite }}</div>
        <p>{{ r.text }}</p>
      </div>
    </CyberPanel>
  </section>
</template>

<style scoped>
.sum { display: flex; flex-direction: column; gap: var(--s-4); }
.sum__headline { font-size: var(--fs-xl); margin: 0 0 var(--s-3); }
.sum__headline.is-bad { color: var(--c-harmful); }
.sum__headline.is-good { color: var(--c-ideal); }
.sum__stats { display: flex; gap: var(--s-8); margin-bottom: var(--s-4); }
.sum__stat-val { font-size: var(--fs-2xl); color: var(--c-magenta); line-height: 1.1; }
.sum__debrief { margin: 0; padding: var(--s-4); background: var(--paper-2); border-radius: var(--r-md); line-height: 1.6; }
.sum__source { margin: var(--s-2) 0 0; font-size: var(--fs-xs); color: var(--c-text-mute); }
.sum__actions { display: flex; align-items: center; gap: var(--s-3); margin-top: var(--s-4); }
.sum__reveal { position: relative; padding: var(--s-5) var(--s-6); background: color-mix(in srgb, var(--c-magenta-tint) 70%, var(--paper)); border-radius: var(--r-lg); box-shadow: 5px 6px 0 rgba(18, 34, 74, .16); }
.sum__reveal-text { margin: var(--s-2) 0 0; font-style: italic; line-height: 1.6; color: var(--ink); }
.sum__cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-4); align-items: start; }
.sum__line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-2); font-size: var(--fs-sm); padding: var(--s-2) 0; }
.sum__msg { border-bottom: 1px dashed var(--c-line); padding-bottom: var(--s-2); margin-bottom: var(--s-2); }
.sum__verdict { font-size: var(--fs-xs); font-weight: 700; }
.sum__verdict.is-good { color: var(--c-ideal); }
.sum__verdict.is-bad { color: var(--c-harmful); }
.sum__verdict.is-ok { color: var(--c-ok); }
.sum__tells { margin: 0; font-size: var(--fs-xs); color: var(--c-text-dim); }
.sum__guide { padding: var(--s-3); margin-bottom: var(--s-2); background: var(--paper-2); border-left: 3px solid var(--c-cyan); border-radius: var(--r-sm); font-size: var(--fs-sm); }
.sum__guide p { margin: 4px 0 0; color: var(--c-text-dim); }
.sum__guide-cite { font-weight: 700; color: var(--c-cyan); }
@media (max-width: 1000px) { .sum__cols { grid-template-columns: 1fr; } }
</style>
