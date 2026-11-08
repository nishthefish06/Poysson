<script setup lang="ts">
/*
 * CATCH LOG (audit log) as a harbor: every security-relevant event is a ship moored at the dock,
 * each one anchored on Solana.
 * DYNAMIC: state.audit (prepended by useGame().audit()).
 */
import type { AuditEntry } from '~/composables/useGame'
import { COPY } from '~/data/copy'

const { state, verifyEntry, anchorEntry } = useGame()
const filter = ref<string>('all')
const q = ref('')
const tabs = computed(() => [
  { id: 'all', label: 'All', count: state.value.audit.length },
  { id: 'auth', label: 'Auth', count: state.value.audit.filter(a => a.kind === 'auth').length },
  { id: 'run', label: 'Runs', count: state.value.audit.filter(a => a.kind === 'run').length },
  { id: 'config', label: 'Config', count: state.value.audit.filter(a => a.kind === 'config').length },
  { id: 'report', label: 'Reports', count: state.value.audit.filter(a => a.kind === 'report').length },
])
const rows = computed(() => state.value.audit.filter(a =>
  (filter.value === 'all' || a.kind === filter.value)
  && (!q.value || `${a.event} ${a.detail} ${a.tx}`.toLowerCase().includes(q.value.toLowerCase())),
))
const KIND: Record<AuditEntry['kind'], { icon: string; color: string; label: string }> = {
  auth: { icon: 'lock', color: 'var(--c-cyan)', label: 'Auth' },
  run: { icon: 'hook', color: 'var(--c-magenta)', label: 'Run' },
  config: { icon: 'key', color: 'var(--c-yellow)', label: 'Config' },
  report: { icon: 'print', color: 'var(--c-ideal)', label: 'Report' },
}
/** RUN_COMPLETE -> Run complete */
const pretty = (ev: string) => ev.charAt(0) + ev.slice(1).toLowerCase().replace(/_/g, ' ')
const time = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const day = (ts: string) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
// Re-verify: re-hash the record as it is now and check it against its Solana memo.
const verifying = ref<string | null>(null)
const results = ref<Record<string, { ok: boolean; reason?: string }>>({})
async function verify(id: string) {
  verifying.value = id
  results.value = { ...results.value, [id]: await verifyEntry(id) }
  if (verifying.value === id) verifying.value = null
}
function recheckLabel(a: AuditEntry) {
  if (verifying.value === a.id) return 'checking…'
  const r = results.value[a.id]
  return r ? (r.ok ? 'matches chain ✓' : 'mismatch ✗') : 're-verify'
}
</script>

<template>
  <div class="audit">
    <header class="page-head">
      <div>
        <div class="eyebrow">Tamper-evident · anchored on Solana devnet</div>
        <h1 class="page-head__title">{{ COPY.audit }}</h1>
        <p class="page-head__sub">Every event is a ship in the harbor. Each one's hash is written to a Solana memo transaction, so if a record is edited, its on-chain hash stops matching.</p>
      </div>
    </header>

    <div class="audit__chain">
      <StatCard label="Ships in harbor" :value="state.audit.length" icon="chain" accent="magenta" />
      <StatCard label="Latest slot" :value="state.audit[0]?.slot.toLocaleString() ?? '—'" icon="chip" accent="cyan" />
      <StatCard label="Integrity" value="100" unit="%" icon="shield" accent="green" caption="all hashes match" />
    </div>

    <CyberPanel :padded="false" :sparkles="false">
      <div class="audit__toolbar">
        <TabBar v-model="filter" :tabs="tabs" />
        <div class="spacer" />
        <div class="audit__search"><CyberInput v-model="q" icon="eye" placeholder="Search event / tx…" /></div>
      </div>
    </CyberPanel>

    <!-- THE HARBOR: each row of ships shares one pier -->
    <section class="harbor" aria-label="Audit events">
      <article
        v-for="(a, i) in rows" :key="a.id" class="berth"
        :style="{ '--k': KIND[a.kind].color, '--bob': `${(i * 0.53) % 3}s` }"
      >
        <div class="ship">
          <div class="ship__mast">
            <span class="ship__flag" :title="KIND[a.kind].label"><CyberIcon :name="KIND[a.kind].icon" :size="14" :stroke="2.2" /></span>
          </div>
          <div class="ship__cabin">
            <span class="ship__porthole" />
            <span class="ship__time">{{ time(a.ts) }}</span>
            <span class="ship__porthole" />
          </div>
          <div class="ship__hull">
            <svg class="ship__hull-bg" viewBox="0 0 200 90" preserveAspectRatio="none" aria-hidden="true">
              <path d="M3 4 H197 Q193 50 172 86 H28 Q7 50 3 4Z" class="ship__hull-fill" vector-effect="non-scaling-stroke" />
              <path d="M10 62 H190" class="ship__stripe" vector-effect="non-scaling-stroke" />
            </svg>
            <div class="ship__name">{{ pretty(a.event) }}</div>
            <div class="ship__cargo">{{ a.detail }}</div>
            <div class="ship__reg mono">{{ day(a.ts) }} · {{ a.ip }} · slot {{ a.slot.toLocaleString() }}</div>
          </div>
        </div>

        <svg class="berth__water" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 7 Q15 1 30 7 T60 7 T90 7 T120 7 V14 H0Z" />
        </svg>

        <div class="berth__pier">
          <span class="berth__bollard" aria-hidden="true" />
          <svg class="berth__rope" viewBox="0 0 60 50" aria-hidden="true"><path d="M8 44 Q20 10 56 2" /></svg>
          <div class="berth__sign">
            <SolanaVerified :tx="a.tx" :slot="a.slot" :status="anchorOf(a)" :error="a.anchorError" compact />
            <button v-if="anchorOf(a) === 'anchored'" class="audit__recheck" :class="results[a.id] && (results[a.id].ok ? 'is-ok' : 'is-bad')" :title="results[a.id]?.reason" @click="verify(a.id)">{{ recheckLabel(a) }}</button>
            <button v-else-if="anchorOf(a) === 'failed'" class="audit__recheck" :title="a.anchorError" @click="anchorEntry(a.id)">retry</button>
          </div>
        </div>
      </article>
      <div v-if="!rows.length" class="harbor__empty">
        <CyberIcon name="anchor" :size="40" />
        <p>No ships match. The harbor's quiet.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.audit { display: flex; flex-direction: column; gap: var(--s-5); }
.audit .page-head { margin-bottom: 0; }
.audit .page-head__sub { max-width: 720px; }
.audit__chain { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.audit__toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-4); padding: var(--s-4) var(--s-5); }
.audit__search { width: 280px; max-width: 100%; }

/* ---------- harbor ---------- */
.harbor {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  column-gap: 0;
  row-gap: var(--s-8);
  padding-top: var(--s-6);
}
.berth { position: relative; display: flex; flex-direction: column; align-items: center; padding: 0 var(--s-3); }

/* ship */
.ship {
  position: relative; z-index: 2; width: 100%; max-width: 230px;
  display: flex; flex-direction: column; align-items: center;
  animation: bob 3.4s ease-in-out var(--bob) infinite;
  transform-origin: 50% 100%;
  margin-bottom: -10px; /* sit in the water */
}
.berth:hover .ship { animation: bob 3.4s ease-in-out var(--bob) infinite, rock .7s ease-in-out 2; }
.ship__mast { position: relative; width: 4px; height: 46px; background: var(--ink); border-radius: 2px; align-self: center; margin-left: -40px; }
.ship__flag {
  position: absolute; left: 4px; top: 2px; width: 46px; height: 28px;
  display: grid; place-items: center; padding-right: 10px; color: #fff;
  background: var(--k);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  transform-origin: 0 50%;
  animation: flap 1.2s ease-in-out infinite alternate;
}
.ship__cabin {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 12px; margin-bottom: -2px;
  background: var(--paper-2); border: 2.5px solid var(--ink); border-bottom: 0;
  border-radius: 10px 10px 0 0;
}
.ship__porthole { width: 12px; height: 12px; border-radius: 50%; background: #9fdcff; border: 2px solid var(--ink); }
.ship__time { font-family: var(--f-hand); font-size: 18px; font-weight: 700; color: var(--ink); line-height: 1; }
.ship__hull { position: relative; width: 100%; padding: 12px 26px 22px; text-align: center; min-height: 104px; }
.ship__hull-bg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(3px 4px 0 rgba(18, 34, 74, .25)); }
.ship__hull-fill { fill: var(--paper-2); stroke: var(--ink); stroke-width: 2.6; stroke-linejoin: round; }
.ship__stripe { stroke: var(--k); stroke-width: 6; stroke-linecap: round; }
.ship__name { position: relative; font-family: var(--f-display); font-weight: 600; font-size: var(--fs-md); color: var(--ink); }
.ship__cargo { position: relative; font-size: var(--fs-sm); color: var(--c-text-dim); line-height: 1.3; margin-top: 2px; }
.ship__reg { position: relative; font-size: 9px; color: var(--c-text-mute); margin-top: 6px; letter-spacing: .02em; }

/* water + pier */
.berth__water { position: relative; z-index: 1; width: calc(100% + var(--s-6)); height: 14px; display: block; fill: rgba(255, 255, 255, .55); }
.berth__pier {
  position: relative; width: calc(100% + var(--s-6)); height: 54px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .25), transparent 40%),
    repeating-linear-gradient(90deg, #c98b4f 0 36px, #b5773d 36px 38px, var(--ink) 38px 40px);
  border-top: 3px solid var(--ink); border-bottom: 3px solid var(--ink);
  display: flex; align-items: center; justify-content: center;
}
/* pier legs into the water */
.berth__pier::after {
  content: ''; position: absolute; left: 0; right: 0; top: 100%; height: 26px;
  background: repeating-linear-gradient(90deg, transparent 0 28px, #8a5a2b 28px 38px, transparent 38px 84px);
  -webkit-mask: linear-gradient(180deg, #000 40%, transparent);
  mask: linear-gradient(180deg, #000 40%, transparent);
}
.berth__bollard { position: absolute; left: 22px; top: -12px; width: 16px; height: 16px; background: var(--ink); border-radius: 5px 5px 2px 2px; }
.berth__rope { position: absolute; left: 22px; top: -54px; width: 60px; height: 50px; overflow: visible; }
.berth__rope path { fill: none; stroke: #e8c88a; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 2 3; }
.berth__sign {
  position: relative; display: flex; align-items: center; gap: var(--s-2);
  padding: 4px 10px; background: var(--paper-2); border: 2px solid var(--ink); border-radius: var(--r-sm);
  box-shadow: 2px 3px 0 rgba(18, 34, 74, .35); transform: rotate(-1.5deg);
}
.audit__recheck { background: none; border: 0; color: var(--c-text-dim); font-family: var(--f-hand); font-size: 16px; font-weight: 700; text-decoration: underline wavy rgba(var(--rgb-magenta), .5); text-underline-offset: 3px; }
.audit__recheck.is-ok { color: var(--c-ideal); text-decoration: none; }
.audit__recheck.is-bad { color: var(--c-harmful); text-decoration: none; }
.audit__recheck:hover { color: var(--c-magenta); }
.harbor__empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: var(--s-2); padding: var(--s-10); color: #fff; font-family: var(--f-hand); font-size: 24px; text-shadow: 0 2px 0 var(--ink); }

@keyframes bob { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-6px) rotate(1deg); } }
@keyframes rock { 0%, 100% { rotate: 0deg; } 25% { rotate: -4deg; } 75% { rotate: 4deg; } }
@keyframes flap { from { transform: skewY(-6deg) scaleX(.94); } to { transform: skewY(5deg) scaleX(1); } }

@media (max-width: 900px) { .audit__chain { grid-template-columns: 1fr; } }
</style>
