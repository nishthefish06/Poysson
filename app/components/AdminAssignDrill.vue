<script setup lang="ts">
/*
 * Assign a drill to one employee or the whole team. The new run reaches the employee live and
 * <AssignmentPopup> shows it on whatever page they're on.
 * Guided only: unguided drills need an agent posting into them, and the live attacker plays in
 * the Arena instead.
 * LIVE: all_scenarios, admin_accounts; assignScenario / assignScenarioToAllEmployees reducers.
 */
import { useReducer, useTable } from 'spacetimedb/vue';
import { ATTACK_LABELS, type AttackType } from '@hackutd2026/shared';
import { reducers, tables } from '~/module_bindings';

const [scenarios] = useTable(tables.allScenarios);
const [accounts] = useTable(tables.adminAccounts);
const assignOne = useReducer(reducers.assignScenario);
const assignAll = useReducer(reducers.assignScenarioToAllEmployees);
const { error, busy, run } = useRunner();
const notice = ref('');

const published = computed(() =>
  scenarios.value
    .filter((s) => s.status === 'published')
    .sort((a, b) => a.attackType.localeCompare(b.attackType) || a.title.localeCompare(b.title))
);
const employees = computed(() =>
  accounts.value
    .filter((a) => a.role === 'employee')
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
);

const ALL = 'all';
const scenarioId = ref('');
const assignee = ref('');
const message = ref('New drill from your security lead: please finish it before your next shift.');
const picked = computed(() => published.value.find((s) => String(s.id) === scenarioId.value));

async function assign() {
  notice.value = '';
  const s = picked.value;
  if (!s || !assignee.value) return;
  const popupMessage = message.value.trim();
  const everyone = assignee.value === ALL;
  const ok = await run(() =>
    everyone
      ? assignAll({ scenarioId: s.id, mode: 'guided', popupMessage })
      : assignOne({ scenarioId: s.id, accountId: BigInt(assignee.value), mode: 'guided', popupMessage })
  );
  if (!ok) return;
  const who = everyone
    ? `all ${employees.value.length} employees`
    : (employees.value.find((e) => String(e.id) === assignee.value)?.displayName ?? 'them');
  notice.value = `Assigned “${s.title}” to ${who}. It pops up on their screen now.`;
}
</script>

<template>
  <CyberPanel title="Assign a drill" eyebrow="Pops up live for the employee" accent="cyan">
    <form class="asg" @submit.prevent="assign">
      <label class="asg__field asg__field--wide">
        <span class="asg__label">Drill</span>
        <select v-model="scenarioId" class="asg__select" required>
          <option value="" disabled>Pick a drill…</option>
          <option v-for="s in published" :key="String(s.id)" :value="String(s.id)">
            {{ ATTACK_LABELS[s.attackType as AttackType] ?? s.attackType }} · {{ s.title }} ({{
              s.difficulty
            }})
          </option>
        </select>
        <span v-if="picked" class="asg__hint">{{ picked.summary }}</span>
      </label>

      <label class="asg__field">
        <span class="asg__label">Assign to</span>
        <select v-model="assignee" class="asg__select" required>
          <option value="" disabled>Pick someone…</option>
          <option :value="ALL">All employees ({{ employees.length }})</option>
          <option v-for="e in employees" :key="String(e.id)" :value="String(e.id)">
            {{ e.displayName }}
          </option>
        </select>
      </label>

      <label class="asg__field asg__field--wide">
        <span class="asg__label">Pop-up message</span>
        <input v-model="message" class="asg__input" maxlength="2000" placeholder="Shown to the employee" />
      </label>

      <div class="asg__actions">
        <CyberButton type="submit" icon="play" :loading="busy" :disabled="!picked || !assignee">
          Assign drill
        </CyberButton>
        <span class="asg__mode">Guided, with hints</span>
      </div>

      <p v-if="error" class="asg__msg asg__msg--err" role="alert">{{ error }}</p>
      <p v-else-if="notice" class="asg__msg" role="status">{{ notice }}</p>
    </form>
  </CyberPanel>
</template>

<style scoped>
.asg {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--s-4);
  align-items: start;
}
.asg__field {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  min-width: 0;
}
.asg__field--wide {
  grid-column: 1 / 2;
}
.asg__label {
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-dim);
}
.asg__select,
.asg__input {
  width: 100%;
  height: 42px;
  padding: 0 var(--s-3);
  background: var(--paper-2);
  border: 2px solid var(--ink);
  border-radius: var(--r-md);
  font-family: var(--f-ui);
  font-size: var(--fs-md);
  color: var(--c-text);
}
.asg__select:focus,
.asg__input:focus {
  outline: 3px solid var(--c-magenta-tint);
  border-color: var(--c-magenta);
}
.asg__hint {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
}
.asg__actions {
  grid-column: 2 / 3;
  grid-row: 2 / 4;
  align-self: end;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-2);
}
.asg__mode {
  font-size: var(--fs-xs);
  color: var(--c-text-mute);
}
.asg__msg {
  grid-column: 1 / -1;
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--c-ideal);
  color: var(--c-ideal);
  font-size: var(--fs-sm);
}
.asg__msg--err {
  border-left-color: var(--c-harmful);
  color: var(--c-harmful);
}
@media (max-width: 800px) {
  .asg {
    grid-template-columns: 1fr;
  }
  .asg__field--wide,
  .asg__actions {
    grid-column: auto;
    grid-row: auto;
  }
}
</style>
