<template>
  <div class="auth-layout">
    <div class="auth-layout__brand">
      <span class="auth-layout__logo glitch" data-text="NEON//IR">NEON//IR</span>
      <span class="eyebrow">Incident Response Ops · v2.077</span>
    </div>
    <main class="auth-layout__card">
      <slot />
    </main>
    <footer class="auth-layout__foot mono">
      <span>SECURE CHANNEL // TLS1.3</span>
      <span class="auth-layout__dot" />
      <span>NODE: halcyon-sea-03</span>
      <span class="auth-layout__dot" />
      <NuxtLink to="/styleguide">component library</NuxtLink>
    </footer>
    <div class="auth-layout__city" aria-hidden="true" />
  </div>
</template>

<style scoped>
.auth-layout { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-6); padding: var(--s-6) var(--s-4); position: relative; overflow: hidden; }
.auth-layout__brand { display: flex; flex-direction: column; align-items: center; gap: var(--s-2); }
.auth-layout__logo { font-family: var(--f-display); font-size: 44px; font-weight: 900; letter-spacing: .12em; color: var(--c-cyan); text-shadow: var(--text-glow-cyan); }
.auth-layout__card {
  width: 100%; max-width: 440px; padding: var(--s-8);
  background: linear-gradient(180deg, rgba(15, 20, 36, .95), rgba(9, 12, 22, .95));
  border: 1px solid var(--c-line-strong); clip-path: var(--clip-chamfer);
  box-shadow: 0 30px 80px rgba(0, 0, 0, .6);
  position: relative;
}
.auth-layout__card::before { content: ''; position: absolute; top: 0; left: 30px; right: 30px; height: 2px; background: linear-gradient(90deg, transparent, var(--c-magenta), var(--c-cyan), transparent); }
.auth-layout__foot { display: flex; gap: var(--s-3); align-items: center; font-size: var(--fs-xs); color: var(--c-text-mute); letter-spacing: .12em; flex-wrap: wrap; justify-content: center; }
.auth-layout__dot { width: 4px; height: 4px; background: var(--c-magenta); }
.auth-layout__city {
  position: absolute; left: 0; right: 0; bottom: 0; height: 180px; z-index: -1; opacity: .5;
  background:
    linear-gradient(to top, var(--c-bg-0), transparent),
    repeating-linear-gradient(90deg, #0d1222 0 30px, transparent 30px 34px, #0a0f1d 34px 70px, transparent 70px 76px, #111833 76px 96px, transparent 96px 100px);
  mask: linear-gradient(to top, #000 0 40%, transparent);
  clip-path: polygon(0 60%, 4% 60%, 4% 30%, 9% 30%, 9% 50%, 14% 50%, 14% 10%, 18% 10%, 18% 45%, 25% 45%, 25% 25%, 31% 25%, 31% 55%, 38% 55%, 38% 5%, 41% 5%, 41% 40%, 48% 40%, 48% 20%, 55% 20%, 55% 50%, 62% 50%, 62% 15%, 66% 15%, 66% 35%, 73% 35%, 73% 0, 76% 0, 76% 45%, 83% 45%, 83% 25%, 90% 25%, 90% 55%, 95% 55%, 95% 30%, 100% 30%, 100% 100%, 0 100%);
}
</style>
