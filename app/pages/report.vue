<script setup lang="ts">
/* REPORT — standalone printable after-action report. Toolbar hides on print. */
definePageMeta({ layout: 'bare' })
const { state, audit } = useGame()
const route = useRoute()
const run = computed(() => state.value.runs.find(r => r.id === route.query.run) ?? state.value.runs[0])
function print() {
  if (run.value) audit('REPORT_EXPORTED', `${run.value.codename} · PDF`, 'report')
  window.print()
}
</script>

<template>
  <div class="report-page">
    <div class="report-page__bar">
      <BackButton to="/results" label="Back to debrief" />
      <div class="spacer" />
      <SolanaVerified v-if="run" :tx="run.tx" :status="anchorOf(run)" />
      <CyberButton variant="primary" size="sm" icon="print" @click="print">Print / Save PDF</CyberButton>
    </div>
    <ReportDocument v-if="run" :run="run" />
    <p v-else class="mute mono" style="text-align:center">// no runs yet</p>
  </div>
</template>

<style scoped>
.report-page { padding: 0 var(--s-6) var(--s-12); background: #10131c; min-height: 100vh; }
.report-page__bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: var(--s-3); max-width: 8.5in; margin: 0 auto var(--s-6); padding: var(--s-4) 0; background: #10131c; }
.report-page :deep(.report-doc) { box-shadow: 0 20px 60px rgba(0, 0, 0, .6); }
@media print {
  .report-page { padding: 0; background: #fff; }
  .report-page__bar { display: none; }
  .report-page :deep(.report-doc) { box-shadow: none; width: auto; min-height: 0; padding: 0; }
  @page { size: letter; margin: .6in; }
}
</style>
