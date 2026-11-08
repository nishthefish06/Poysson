<script setup lang="ts">
/*
 * AUDIT LOG — every security-relevant event, each anchored on Solana.
 * DYNAMIC: state.audit (prepended by useGame().audit()).
 */
import type { AuditEntry } from '~/composables/useGame'

const { state } = useGame()
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
const kindIcon: Record<AuditEntry['kind'], string> = { auth: 'lock', run: 'crosshair', config: 'key', report: 'print' }
const verifying = ref<string | null>(null)
function verify(id: string) {
  verifying.value = id
  setTimeout(() => { if (verifying.value === id) verifying.value = null }, 1500)
}
</script>

<template>
  <div class="audit">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Tamper-evident · Solana devnet</div>
        <h1 class="page-head__title">Audit log</h1>
        <p class="page-head__sub">Each event's hash is written to a Solana memo transaction. If a row is edited, the on-chain hash stops matching.</p>
      </div>
    </header>

    <div class="audit__chain">
      <StatCard label="Events anchored" :value="state.audit.length" icon="chain" accent="magenta" />
      <StatCard label="Latest slot" :value="state.audit[0]?.slot.toLocaleString() ?? '—'" icon="chip" accent="cyan" />
      <StatCard label="Integrity" value="100" unit="%" icon="shield" accent="green" caption="all hashes match" />
    </div>

    <CyberPanel :padded="false">
      <div class="audit__toolbar">
        <TabBar v-model="filter" :tabs="tabs" />
        <div class="spacer" />
        <div class="audit__search"><CyberInput v-model="q" icon="eye" placeholder="Search event / tx…" /></div>
      </div>
      <div class="audit__table-wrap">
        <table class="audit__table">
          <thead>
            <tr><th>Time</th><th>Event</th><th>Detail</th><th>Source IP</th><th>Slot</th><th>On-chain</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in rows" :key="a.id" class="audit__row">
              <td class="mono mute">{{ new Date(a.ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</td>
              <td><span class="audit__ev mono" :class="`k-${a.kind}`"><CyberIcon :name="kindIcon[a.kind]" :size="13" /> {{ a.event }}</span></td>
              <td>{{ a.detail }}</td>
              <td class="mono dim">{{ a.ip }}</td>
              <td class="mono mute">{{ a.slot.toLocaleString() }}</td>
              <td>
                <div class="audit__verify">
                  <SolanaVerified :tx="a.tx" :slot="a.slot" />
                  <button class="audit__recheck mono" @click="verify(a.id)">{{ verifying === a.id ? 'checking…' : 're-verify' }}</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length"><td colspan="6" class="mute mono audit__none">// no matching events</td></tr>
          </tbody>
        </table>
      </div>
    </CyberPanel>
  </div>
</template>

<style scoped>
.audit { display: flex; flex-direction: column; gap: var(--s-5); }
.audit .page-head { margin-bottom: 0; }
.audit__chain { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.audit__toolbar { display: flex; align-items: flex-end; gap: var(--s-4); padding: var(--s-4) var(--s-5) 0; }
.audit__search { width: 280px; padding-bottom: var(--s-2); }
.audit__table-wrap { overflow-x: auto; }
.audit__table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.audit__table th { text-align: left; font-family: var(--f-mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--c-text-mute); padding: var(--s-3) var(--s-4); border-bottom: 1px solid var(--c-line-strong); white-space: nowrap; }
.audit__table td { padding: var(--s-3) var(--s-4); border-bottom: 1px solid var(--c-line); white-space: nowrap; }
.audit__row:hover td { background: var(--c-bg-2); }
.audit__ev { display: inline-flex; gap: 6px; align-items: center; font-size: 11px; font-weight: 700; }
.k-auth { color: var(--c-cyan); }
.k-run { color: var(--c-magenta); }
.k-config { color: var(--c-yellow); }
.k-report { color: var(--c-ideal); }
.audit__verify { display: flex; gap: var(--s-3); align-items: center; }
.audit__recheck { background: none; border: 0; color: var(--c-text-mute); font-size: 10px; cursor: pointer; text-decoration: underline dotted; }
.audit__recheck:hover { color: var(--c-cyan); }
.audit__none { text-align: center; padding: var(--s-8) !important; }
</style>
