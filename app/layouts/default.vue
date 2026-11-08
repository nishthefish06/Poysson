<script setup lang="ts">
import { useReducer } from 'spacetimedb/vue';
import { reducers } from '~/module_bindings';
import { COPY } from '~/data/copy';

const { player, logout: resetGame } = useGame();
const { isAdmin } = useSession();
const logout = useReducer(reducers.logout);
const route = useRoute();
const BASE_NAV = [
  { to: '/dashboard', label: COPY.dashboard, icon: 'anchor' },
  { to: '/incidents', label: COPY.incidents, icon: 'hook' },
  { to: '/arena', label: COPY.arena, icon: 'wave' },
  { to: '/audit', label: COPY.audit, icon: 'fish' },
];
const NAV = computed(() =>
  isAdmin.value ? [{ to: '/admin', label: 'Admin', icon: 'shield' }, ...BASE_NAV] : BASE_NAV
);

/* ---- sidebar: expanded / collapsed to an icon rail (desktop), drawer (mobile) ---- */
const NAV_KEY = 'poysson:nav-open';
const navOpen = ref(true);
const isMobile = ref(false);
let mq: MediaQueryList | undefined;
const syncMobile = () => {
  isMobile.value = !!mq?.matches;
  // Mobile drawer always starts closed; desktop restores the saved choice.
  if (isMobile.value) navOpen.value = false;
  else {
    try {
      navOpen.value = localStorage.getItem(NAV_KEY) !== '0';
    } catch {
      navOpen.value = true;
    }
  }
};
function toggleNav() {
  navOpen.value = !navOpen.value;
  if (!isMobile.value) {
    try {
      localStorage.setItem(NAV_KEY, navOpen.value ? '1' : '0');
    } catch {
      /* storage blocked */
    }
  }
}

/* ---- profile dropdown ---- */
const menuOpen = ref(false);
const menuRoot = ref<HTMLElement>();
function onDocClick(e: MouseEvent) {
  if (menuOpen.value && menuRoot.value && !menuRoot.value.contains(e.target as Node)) menuOpen.value = false;
}
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  menuOpen.value = false;
  if (isMobile.value) navOpen.value = false;
}

onMounted(() => {
  mq = window.matchMedia('(max-width: 900px)');
  syncMobile();
  mq.addEventListener('change', syncMobile);
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  mq?.removeEventListener('change', syncMobile);
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
watch(
  () => route.path,
  () => {
    menuOpen.value = false;
    if (isMobile.value) navOpen.value = false;
  },
);

// Drop the server session, then go to /login ourselves: SessionGate only redirects when it's
// connected and the dev auth bypass is off.
async function doLogout() {
  menuOpen.value = false;
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
  <div class="app-shell" :class="{ 'is-collapsed': !navOpen, 'is-mobile': isMobile }">
    <div v-if="isMobile && navOpen" class="app-shell__scrim" @click="navOpen = false" />

    <aside class="app-shell__nav" :aria-hidden="isMobile && !navOpen">
      <div class="app-shell__nav-head">
        <NuxtLink v-show="navOpen" to="/dashboard" class="app-shell__logo">
          <CyberIcon name="fish" :size="24" class="app-shell__logo-fish" /><span>POYSSON</span>
        </NuxtLink>
        <button
          class="app-shell__toggle"
          :title="navOpen ? 'Close sidebar' : 'Open sidebar'"
          :aria-label="navOpen ? 'Close sidebar' : 'Open sidebar'"
          :aria-expanded="navOpen"
          @click="toggleNav"
        >
          <CyberIcon name="sidebar" :size="18" />
        </button>
      </div>
      <nav class="app-shell__links">
        <NuxtLink
          v-for="n in NAV"
          :key="n.to"
          :to="n.to"
          class="app-shell__link"
          :class="{ 'is-active': route.path.startsWith(n.to) }"
          :title="navOpen ? undefined : n.label"
        >
          <CyberIcon :name="n.icon" :size="18" /> <span class="app-shell__label">{{ n.label }}</span>
        </NuxtLink>
      </nav>
      <div class="spacer" />
    </aside>

    <div class="app-shell__main">
      <header class="app-shell__top">
        <button v-if="isMobile" class="app-shell__toggle" aria-label="Open sidebar" @click="toggleNav">
          <CyberIcon name="menu" :size="18" />
        </button>
        <div class="app-shell__crumb mono">// {{ route.path.split('/').filter(Boolean).join(' / ').toUpperCase() || 'HOME' }}</div>
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

        <div ref="menuRoot" class="app-shell__profile">
          <button
            class="app-shell__avatar"
            :title="player.handle"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            {{ player.handle.slice(0, 2).toUpperCase() }}
          </button>
          <div v-if="menuOpen" class="app-shell__menu" role="menu">
            <div class="app-shell__menu-head">
              <div class="app-shell__menu-name">{{ player.handle }}</div>
              <div class="app-shell__menu-email mono">{{ player.email }}</div>
            </div>
            <NuxtLink to="/profile" class="app-shell__menu-item" role="menuitem">
              <CyberIcon name="user" :size="16" /> View profile
            </NuxtLink>
            <NuxtLink to="/settings" class="app-shell__menu-item" role="menuitem">
              <CyberIcon name="settings" :size="16" /> Settings
            </NuxtLink>
            <div class="app-shell__menu-sep" />
            <button class="app-shell__menu-item app-shell__menu-item--danger" role="menuitem" @click="doLogout">
              <CyberIcon name="logout" :size="16" /> Log out
            </button>
          </div>
        </div>
      </header>
      <main class="app-shell__content">
        <slot />
      </main>
    </div>
    <AssignmentPopup />
  </div>
</template>

<style scoped>
.app-shell {
  --nav-rail: 64px;
  display: grid;
  grid-template-columns: var(--nav-w) 1fr;
  min-height: 100vh;
  transition: grid-template-columns var(--t-fast);
}
.app-shell.is-collapsed {
  grid-template-columns: var(--nav-rail) 1fr;
}
.app-shell__nav {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
  padding: var(--s-5) var(--s-3);
  background: var(--paper);
  border-right: 0;
  box-shadow: 4px 0 0 rgba(18, 34, 74, .12);
  overflow: hidden;
}
.app-shell__nav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  min-height: 36px;
}
.is-collapsed .app-shell__nav-head {
  justify-content: center;
}
.app-shell__logo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--f-display);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.04em;
  color: var(--c-magenta);
  padding: 0 var(--s-2);
  white-space: nowrap;
}
.app-shell__logo-fish {
  animation: wobble 2.4s ease-in-out infinite;
}
.app-shell__toggle {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--r-pill);
  color: var(--c-text-dim);
  cursor: pointer;
  transition: all var(--t-fast);
}
.app-shell__toggle:hover {
  color: var(--c-cyan);
  border-color: var(--c-line-strong);
  background: var(--c-bg-2);
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
  font-family: var(--f-display);
  font-weight: 500;
  letter-spacing: 0.01em;
  font-size: var(--fs-md);
  border-radius: var(--r-md);
  white-space: nowrap;
  transition: all var(--t-fast);
}
.is-collapsed .app-shell__link {
  justify-content: center;
  padding: 0;
}
.is-collapsed .app-shell__label {
  display: none;
}
.app-shell__link:hover {
  color: var(--c-text);
  background: var(--c-bg-2);
  text-shadow: none;
}
.app-shell__link.is-active {
  color: #fff;
  background: var(--c-magenta);
  box-shadow: 2px 3px 0 var(--ink);
  transform: rotate(-1deg);
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
  background: var(--paper);
  border-bottom: 4px solid var(--c-magenta);
  box-shadow: 0 4px 0 rgba(18, 34, 74, .12);
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
.app-shell__profile {
  position: relative;
}
.app-shell__avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  cursor: pointer;
  font-family: var(--f-display);
  font-weight: 700;
  font-size: var(--fs-sm);
  color: var(--c-text-invert);
  background: var(--chrome);
  box-shadow: var(--glow-chrome);
  border-radius: var(--blob);
  animation: blob 10s var(--ease-soft) infinite;
}
.app-shell__avatar:focus-visible {
  outline: 2px solid var(--c-cyan);
  outline-offset: 2px;
}
.app-shell__menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  min-width: 220px;
  padding: var(--s-2);
  background: var(--paper-2);
  border: 2px solid var(--ink);
  border-radius: var(--r-md);
  box-shadow: var(--pop);
  animation: menu-in 120ms ease-out;
}
@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.app-shell__menu-head {
  padding: var(--s-2) var(--s-3) var(--s-3);
  border-bottom: 1px solid var(--c-line);
  margin-bottom: var(--s-2);
}
.app-shell__menu-name {
  font-family: var(--f-display);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-text);
}
.app-shell__menu-email {
  font-size: 11px;
  color: var(--c-text-mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-shell__menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  height: 38px;
  padding: 0 var(--s-3);
  background: none;
  border: 0;
  cursor: pointer;
  color: var(--c-text-dim);
  font-family: var(--f-ui);
  font-size: var(--fs-sm);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: left;
  border-radius: var(--r-sm);
}
.app-shell__menu-item:hover {
  color: var(--c-cyan);
  background: var(--c-bg-2);
  text-shadow: none;
}
.app-shell__menu-item--danger:hover {
  color: var(--c-harmful);
}
.app-shell__menu-sep {
  height: 1px;
  margin: var(--s-2) 0;
  background: var(--c-line);
}
.app-shell__content {
  padding: var(--s-8);
  max-width: 1440px;
  width: 100%;
}

/* ---- mobile: sidebar becomes an overlay drawer ---- */
.app-shell.is-mobile {
  grid-template-columns: 1fr;
}
.is-mobile .app-shell__nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 50;
  width: var(--nav-w);
  background: var(--paper-2);
  transform: translateX(-100%);
  transition: transform var(--t-fast);
}
.is-mobile:not(.is-collapsed) .app-shell__nav {
  transform: none;
}
.app-shell__scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.55);
}
@media (max-width: 900px) {
  .app-shell__top {
    padding: 0 var(--s-4);
    gap: var(--s-3);
  }
  .app-shell__xp {
    display: none;
  }
  .app-shell__content {
    padding: var(--s-4);
  }
}
</style>
