<script setup lang="ts">
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';

const { player, logout: resetGame } = useGame();
const { isAdmin } = useSession();
const logout = useReducer(reducers.logout);
const route = useRoute();
const BASE_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/incidents', label: 'Incident Ops', icon: 'crosshair' },
  { to: '/practice', label: 'Practice', icon: 'play' },
  { to: '/arena', label: 'Arena', icon: 'bolt' },
  { to: '/results', label: 'Last Debrief', icon: 'chart' },
  { to: '/audit', label: 'Audit Log', icon: 'list' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];
const NAV = computed(() =>
  isAdmin.value ? [{ to: '/admin', label: 'Admin', icon: 'shield' }, ...BASE_NAV] : BASE_NAV
);
// Drop the server session, then go to /login ourselves: SessionGate only redirects when it's
// connected and the dev auth bypass is off.
async function doLogout() {
  resetGame();
  try {
    await logout();
  } catch {
    // Not connected or already signed out: still leave the app.
  }
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-shell__nav">
      <NuxtLink to="/dashboard" class="app-shell__logo">
        <span class="glitch" data-text="POYSSON">POYSSON</span>
      </NuxtLink>
      <nav class="app-shell__links">
        <NuxtLink
          v-for="n in NAV"
          :key="n.to"
          :to="n.to"
          class="app-shell__link"
          :class="{ 'is-active': route.path.startsWith(n.to) }"
        >
          <CyberIcon :name="n.icon" :size="18" /> <span>{{ n.label }}</span>
        </NuxtLink>
      </nav>
      <div class="spacer" />
      <div class="app-shell__status mono">
        <div><span class="app-shell__live" /> SOC LINK ONLINE</div>
        <div class="mute">latency 12ms · enc AES-256</div>
      </div>
      <button class="app-shell__logout" @click="doLogout">
        <CyberIcon name="logout" :size="16" /> Jack out
      </button>
    </aside>

    <div class="app-shell__main">
      <header class="app-shell__top">
        <div class="app-shell__crumb mono">// {{ route.path.replace('/', '').toUpperCase() || 'HOME' }}</div>
        <div class="spacer" />
        <div class="app-shell__xp">
          <XpBar
            :value="player.xp"
            :max="xpForLevel(player.level)"
            :level="player.level"
            size="sm"
            :show-label="false"
          />
        </div>
        <div class="app-shell__streak"><CyberIcon name="flame" :size="16" /> {{ player.streak }}</div>
        <NuxtLink to="/profile" class="app-shell__avatar" :title="player.handle">{{
          player.handle.slice(0, 2).toUpperCase()
        }}</NuxtLink>
      </header>
      <main class="app-shell__content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--nav-w) 1fr;
  min-height: 100vh;
}
.app-shell__nav {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  padding: var(--s-6) var(--s-4);
  background: rgba(6, 8, 15, 0.85);
  border-right: 1px solid var(--c-line);
  backdrop-filter: blur(6px);
}
.app-shell__logo {
  font-family: var(--f-display);
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 0.12em;
  color: var(--c-cyan);
  text-shadow: var(--text-glow-cyan);
  padding: 0 var(--s-2);
}
.app-shell__links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.app-shell__link {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  height: 42px;
  padding: 0 var(--s-3);
  color: var(--c-text-dim);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: var(--fs-sm);
  border-left: 2px solid transparent;
  transition: all var(--t-fast);
}
.app-shell__link:hover {
  color: var(--c-text);
  background: var(--c-bg-2);
  text-shadow: none;
}
.app-shell__link.is-active {
  color: var(--c-cyan);
  border-left-color: var(--c-cyan);
  background: linear-gradient(90deg, rgba(0, 240, 255, 0.14), transparent);
  text-shadow: var(--text-glow-cyan);
}
.app-shell__status {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--c-ideal);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-3);
  border: 1px solid var(--c-line);
}
.app-shell__live {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--c-ideal);
  box-shadow: 0 0 6px var(--c-ideal);
  animation: blink 1.4s steps(2) infinite;
  margin-right: 4px;
}
.app-shell__logout {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  background: none;
  border: 0;
  color: var(--c-text-mute);
  cursor: pointer;
  font-family: var(--f-ui);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--fs-xs);
  padding: var(--s-2);
}
.app-shell__logout:hover {
  color: var(--c-harmful);
}
.app-shell__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-shell__top {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--top-h);
  display: flex;
  align-items: center;
  gap: var(--s-5);
  padding: 0 var(--s-8);
  background: rgba(4, 5, 10, 0.8);
  border-bottom: 1px solid var(--c-line);
  backdrop-filter: blur(8px);
}
.app-shell__crumb {
  font-size: var(--fs-xs);
  letter-spacing: 0.2em;
  color: var(--c-magenta);
}
.app-shell__xp {
  width: 220px;
}
.app-shell__streak {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--c-ok);
  font-family: var(--f-display);
  font-weight: 700;
}
.app-shell__avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-family: var(--f-display);
  font-weight: 900;
  font-size: var(--fs-sm);
  color: var(--c-text-invert);
  background: linear-gradient(135deg, var(--c-cyan), var(--c-magenta));
  clip-path: var(--clip-chamfer-sm);
}
.app-shell__content {
  padding: var(--s-8);
  max-width: 1440px;
  width: 100%;
}
@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .app-shell__nav {
    position: static;
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    padding: var(--s-3) var(--s-4);
  }
  .app-shell__links {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .app-shell__link span,
  .app-shell__status {
    display: none;
  }
  .app-shell__top {
    padding: 0 var(--s-4);
  }
  .app-shell__xp {
    display: none;
  }
  .app-shell__content {
    padding: var(--s-4);
  }
}
</style>
