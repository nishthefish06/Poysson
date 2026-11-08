<script setup lang="ts">
/*
 * ADMIN — user management. Admin-only: SessionGate sends admins here after sign-in, and anyone
 * else who opens it goes back to /dashboard.
 * LIVE: admin_accounts view; adminCreateAccount / adminSetRole / adminResetTotp reducers.
 */
import { useReducer, useTable } from 'spacetimedb/vue';
import { reducers, tables } from '~/module_bindings';

const { account, isAdmin, ready } = useSession();
watchEffect(() => {
  if (ready.value && account.value && !isAdmin.value) void navigateTo('/dashboard', { replace: true });
});

const [accounts] = useTable(tables.adminAccounts);
const createAccount = useReducer(reducers.adminCreateAccount);
const setRole = useReducer(reducers.adminSetRole);
const resetTotp = useReducer(reducers.adminResetTotp);
const { error, busy, run } = useRunner();
const notice = ref('');

const filter = ref('all');
const q = ref('');
const tabs = computed(() => [
  { id: 'all', label: 'All', count: accounts.value.length },
  { id: 'employee', label: 'Employees', count: accounts.value.filter((a) => a.role === 'employee').length },
  { id: 'admin', label: 'Admins', count: accounts.value.filter((a) => a.role === 'admin').length },
]);
const rows = computed(() =>
  accounts.value
    .filter((a) => filter.value === 'all' || a.role === filter.value)
    .filter((a) => !q.value || `${a.displayName} ${a.email}`.toLowerCase().includes(q.value.toLowerCase()))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
);
const enrolled = computed(() => accounts.value.filter((a) => a.totpEnabled).length);
const pending2fa = computed(() => accounts.value.filter((a) => !a.totpEnabled && !a.isDemo).length);

// ---------- Add user ----------
const blank = () => ({ email: '', displayName: '', role: 'employee', phone: '', tempPassword: '' });
const form = reactive(blank());
const formError = ref('');
function suggestPassword() {
  const words = ['trout', 'reef', 'tide', 'koi', 'marlin', 'kelp', 'pike', 'shoal'];
  const w = () => words[Math.floor(Math.random() * words.length)];
  form.tempPassword = `${w()}-${w()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
async function addUser() {
  formError.value = !form.displayName.trim()
    ? 'Enter a name.'
    : !/.+@.+\..+/.test(form.email)
      ? 'Enter a valid email address.'
      : form.tempPassword.length < 8
        ? 'Temporary password must be at least 8 characters.'
        : '';
  if (formError.value) return;
  const email = form.email;
  if (await run(() => createAccount({ ...form }))) {
    notice.value = `Created ${email}. They set up their authenticator app on first sign-in.`;
    Object.assign(form, blank());
  }
}

function toggleRole(a: { id: bigint; role: string; displayName: string }) {
  const role = a.role === 'admin' ? 'employee' : 'admin';
  notice.value = '';
  void run(() => setRole({ accountId: a.id, role })).then(
    (ok) => ok && (notice.value = `${a.displayName} is now ${role === 'admin' ? 'an admin' : 'an employee'}.`)
  );
}
function reset2fa(a: { id: bigint; displayName: string }) {
  if (!confirm(`Reset 2FA for ${a.displayName}? They'll be signed out and must re-enroll.`)) return;
  notice.value = '';
  void run(() => resetTotp({ accountId: a.id })).then(
    (ok) => ok && (notice.value = `2FA reset for ${a.displayName}.`)
  );
}

function joined(ts: { microsSinceUnixEpoch: bigint }) {
  return new Date(Number(ts.microsSinceUnixEpoch / 1000n)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
</script>

<template>
  <div v-if="!account && ready" class="adm">
    <CyberPanel title="Admin" accent="red"><p class="mute">Sign in with an admin account to manage users.</p></CyberPanel>
  </div>
  <div v-else class="adm">
    <header class="page-head">
      <div>
        <div class="eyebrow eyebrow--magenta">Command · access control</div>
        <h1 class="page-head__title">Admin console</h1>
        <p class="page-head__sub">Add operators, promote admins and reset authenticators.</p>
      </div>
    </header>

    <section class="adm__stats">
      <StatCard label="Accounts" :value="accounts.length" icon="user" />
      <StatCard label="Admins" :value="tabs[2]!.count" icon="shield" accent="magenta" />
      <StatCard label="2FA enrolled" :value="enrolled" icon="key" accent="green" />
      <StatCard label="Awaiting 2FA" :value="pending2fa" icon="alert" accent="yellow" caption="first sign-in pending" />
    </section>

    <div class="adm__live"><AdminLiveFeed /></div>

    <p v-if="error" class="adm__msg adm__msg--err" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="adm__msg" role="status">{{ notice }}</p>

    <div class="adm__grid">
      <CyberPanel title="Operators" :eyebrow="`${rows.length} shown`" :padded="false">
        <div class="adm__toolbar">
          <TabBar v-model="filter" :tabs="tabs" />
          <div class="spacer" />
          <div class="adm__search"><CyberInput v-model="q" icon="radar" placeholder="Search name or email" /></div>
        </div>
        <div class="adm__table-wrap">
          <table class="adm__table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Role</th>
                <th>2FA</th>
                <th>Joined</th>
                <th class="adm__actions-h">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in rows" :key="String(a.id)">
                <td>
                  <div class="adm__name">
                    {{ a.displayName }}
                    <span v-if="a.id === account?.id" class="adm__tag adm__tag--cy">YOU</span>
                    <span v-if="a.isDemo" class="adm__tag">DEMO</span>
                  </div>
                  <div class="mono mute adm__email">{{ a.email }}</div>
                </td>
                <td>
                  <span class="adm__role" :class="{ 'is-admin': a.role === 'admin' }">{{ a.role }}</span>
                </td>
                <td>
                  <span v-if="a.totpEnabled" class="adm__ok"><CyberIcon name="check" :size="14" /> on</span>
                  <span v-else-if="a.isDemo" class="mute">skipped</span>
                  <span v-else class="adm__warn">pending</span>
                </td>
                <td class="mono mute">{{ joined(a.createdAt) }}</td>
                <td class="adm__actions">
                  <CyberButton
                    size="sm"
                    variant="secondary"
                    :disabled="busy || a.id === account?.id"
                    @click="toggleRole(a)"
                    >{{ a.role === 'admin' ? 'Make employee' : 'Make admin' }}</CyberButton
                  >
                  <CyberButton
                    size="sm"
                    variant="ghost"
                    icon="rewind"
                    :disabled="busy || !a.totpEnabled"
                    @click="reset2fa(a)"
                    >Reset 2FA</CyberButton
                  >
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="5" class="mute adm__empty">No operators match.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CyberPanel>

      <CyberPanel title="Add operator" eyebrow="New account" accent="magenta">
        <form class="adm__form" novalidate @submit.prevent="addUser">
          <CyberInput v-model="form.displayName" label="Full name" icon="user" placeholder="Jordan Lee" />
          <CyberInput
            v-model="form.email"
            label="Work email"
            type="email"
            icon="mail"
            placeholder="jordan.lee@t-mobile.com"
            autocomplete="off"
          />
          <CyberInput v-model="form.phone" label="Phone (optional)" icon="phone" placeholder="+1 555 010 0000" />
          <div>
            <span class="adm__label">Role</span>
            <div class="adm__seg">
              <button
                v-for="r in ['employee', 'admin']"
                :key="r"
                type="button"
                :class="{ 'is-on': form.role === r }"
                @click="form.role = r"
              >
                {{ r }}
              </button>
            </div>
          </div>
          <div class="adm__pw">
            <CyberInput
              v-model="form.tempPassword"
              label="Temporary password"
              icon="lock"
              placeholder="8+ characters"
              autocomplete="new-password"
              hint="Share it with them directly. They'll add 2FA on first sign-in."
            />
            <CyberButton size="sm" variant="ghost" icon="shuffle" @click="suggestPassword">Generate</CyberButton>
          </div>
          <p v-if="formError" class="adm__msg adm__msg--err" role="alert">{{ formError }}</p>
          <CyberButton type="submit" icon="plus" block :loading="busy">Create account</CyberButton>
        </form>
      </CyberPanel>
    </div>
  </div>
</template>

<style scoped>
.adm__live {
  margin-bottom: var(--s-6);
}
.adm__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-4);
  margin-bottom: var(--s-6);
}
.adm__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--s-6);
  align-items: start;
}
.adm__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-3);
  padding: var(--s-4);
  border-bottom: 1px solid var(--c-line);
}
.adm__search {
  width: 260px;
}
.adm__table-wrap {
  overflow-x: auto;
}
.adm__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}
.adm__table th {
  text-align: left;
  font-size: var(--fs-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-mute);
  font-weight: 600;
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--c-line);
}
.adm__table td {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--c-line);
  vertical-align: middle;
}
.adm__table tbody tr:hover {
  background: var(--c-bg-2);
}
.adm__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--s-2);
}
.adm__email {
  font-size: var(--fs-xs);
}
.adm__tag {
  font-size: 10px;
  letter-spacing: 0.12em;
  padding: 1px 6px;
  border: 1px solid var(--c-line-strong);
  color: var(--c-text-mute);
}
.adm__tag--cy {
  color: var(--c-cyan);
  border-color: var(--c-cyan);
}
.adm__role {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
}
.adm__role.is-admin {
  color: var(--c-magenta);
}
.adm__ok {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--c-ideal);
}
.adm__warn {
  color: var(--c-ok);
}
.adm__actions-h {
  text-align: right !important;
}
.adm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-2);
  white-space: nowrap;
}
.adm__empty {
  text-align: center;
  padding: var(--s-8) !important;
}
.adm__form {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
.adm__label {
  display: block;
  font-size: var(--fs-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--c-text-dim);
  margin-bottom: var(--s-2);
}
.adm__seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--c-line-strong);
}
.adm__seg button {
  background: none;
  border: 0;
  padding: var(--s-2);
  color: var(--c-text-dim);
  font-family: var(--f-ui);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--fs-xs);
  cursor: pointer;
}
.adm__seg button.is-on {
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.16), transparent);
  color: var(--c-cyan);
}
.adm__pw {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  align-items: flex-start;
}
.adm__pw > :first-child {
  width: 100%;
}
.adm__msg {
  margin-bottom: var(--s-4);
  padding: var(--s-2) var(--s-3);
  border-left: 2px solid var(--c-ideal);
  color: var(--c-ideal);
  font-size: var(--fs-sm);
}
.adm__form .adm__msg {
  margin-bottom: 0;
}
.adm__msg--err {
  border-left-color: var(--c-harmful);
  color: var(--c-harmful);
}
@media (max-width: 1100px) {
  .adm__grid {
    grid-template-columns: 1fr;
  }
  .adm__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .adm__search {
    width: 100%;
  }
}
</style>
