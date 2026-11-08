<script setup lang="ts">
// Sign-in screens: one card over the pixel-art city. Pages set `authSubtitle` in definePageMeta.
const route = useRoute();
const subtitle = computed(
  () => (route.meta.authSubtitle as string | undefined) ?? 'Cybersecurity & scam avoidance'
);
// Landing intro (once per session): the cast runs behind the card and carries the real card in.
const introOn = useState<boolean>('castIntro', () => false);
</script>

<template>
  <div class="auth">
    <CastIntro v-if="introOn" />
    <main class="auth__card" :class="{ 'is-intro': introOn }" :inert="introOn || undefined">
      <header class="auth__head">
        <span class="auth__logo"><CyberIcon name="shield" :size="22" /></span>
        <h1 class="auth__title" data-text="Poysson">Poysson</h1>
        <p class="auth__subtitle">{{ subtitle }}</p>
      </header>
      <div class="auth__divider" aria-hidden="true"><span /></div>
      <slot />
      <SketchBox :width="2.8" />
      <Sparkles :size="18" color="var(--c-magenta)" />
    </main>
    <div class="auth__city" aria-hidden="true" />
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--s-6) var(--s-4);
  position: relative;
  isolation: isolate;
}
/* Pixel-art city (Craftpix free "futuristic city" pack, city 3). */
.auth__city {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #6fa8f0 url('/auth-city.png') center bottom / cover no-repeat;
  image-rendering: pixelated;
}
.auth__card {
  width: 100%;
  max-width: 440px;
  padding: var(--s-8) var(--s-8) var(--s-6);
  --edge: color-mix(in srgb, var(--auth-magenta) 45%, transparent);
  border: 0;
  border-radius: var(--r-lg);
  background: var(--paper);
  box-shadow: 7px 8px 0 var(--c-magenta), var(--glow-panel);
  position: relative;
}
.auth__card.is-intro {
  opacity: 0; /* CastIntro drives transform/opacity and lands it in place */
}
.auth__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--s-2);
}
.auth__logo {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--blob); animation: blob 10s var(--ease-soft) infinite;
  background: var(--chrome);
  color: var(--c-text-invert);
  box-shadow: var(--glow-chrome);
  margin-bottom: var(--s-2);
}
.auth__title {
  font-family: var(--f-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-size: 24px;
  color: var(--c-magenta);
  position: relative;
  /* Glitch when the card appears, and again on hover. */
  animation: auth-glitch 0.55s steps(1) 0.1s 1 both;
}
.auth__title:hover {
  animation: auth-glitch-again 0.45s steps(1) 1;
}
@keyframes auth-glitch {
  0% {
    text-shadow:
      -3px 0 var(--auth-magenta),
      2px 0 rgba(255, 255, 255, 0.35);
    transform: translateX(2px);
    clip-path: inset(0 0 45% 0);
  }
  15% {
    text-shadow:
      2px 0 var(--auth-magenta),
      -2px 0 rgba(255, 255, 255, 0.35);
    transform: translateX(-2px);
    clip-path: inset(40% 0 0 0);
  }
  30% {
    text-shadow: -1px 0 var(--auth-magenta);
    transform: none;
    clip-path: inset(0);
  }
  45% {
    text-shadow:
      3px 0 var(--auth-magenta),
      -1px 0 rgba(255, 255, 255, 0.3);
    transform: translateX(1px);
    clip-path: inset(20% 0 30% 0);
  }
  60%,
  100% {
    text-shadow: none;
    transform: none;
    clip-path: none;
  }
}
@keyframes auth-glitch-again {
  0% {
    text-shadow:
      -2px 0 var(--auth-magenta),
      2px 0 rgba(255, 255, 255, 0.3);
    transform: translateX(1px);
  }
  30% {
    text-shadow: 2px 0 var(--auth-magenta);
    transform: translateX(-1px);
    clip-path: inset(30% 0 20% 0);
  }
  60%,
  100% {
    text-shadow: none;
    transform: none;
    clip-path: none;
  }
}
.auth__subtitle {
  font-family: var(--f-display);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-text-dim);
  margin: 0;
}
.auth__divider {
  position: relative;
  height: 1px;
  margin: var(--s-5) 0 var(--s-6);
  background: color-mix(in srgb, var(--auth-magenta) 60%, transparent);
  clip-path: inset(-12px 0);
}
/* Datastream: a light pulse that runs along the divider. */
.auth__divider::before {
  content: '';
  position: absolute;
  top: -1px;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  animation: auth-stream 3.5s linear infinite;
}
@keyframes auth-stream {
  from {
    left: -60px;
  }
  to {
    left: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .auth__title,
  .auth__divider::before {
    animation: none;
  }
}
.auth__divider span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  background: var(--auth-magenta);
  transform: translate(-50%, -50%) rotate(45deg);
  outline: 6px solid var(--paper-2);
}
.auth__city { display: none; } /* the ocean layer is the backdrop now */
</style>

<!-- Shared by the auth pages (login, verify, enroll). -->
<style>
:root {
  --auth-magenta: #e20074;
  --auth-clip-sm: inset(0 round var(--r-md));
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
.auth-heading {
  font-family: var(--f-display);
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink);
}
.auth-text {
  font-size: 13px;
  color: var(--c-text-dim);
  margin: calc(var(--s-3) * -1) 0 0;
}
.auth-label {
  display: flex;
  justify-content: space-between;
  font-family: var(--f-display);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-text-dim);
  margin-bottom: 6px;
}
.auth-field {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 38px;
  padding: 0 var(--s-3);
  border: 2px solid var(--ink);
  border-radius: var(--r-md);
  background: var(--paper-2);
  color: var(--auth-magenta);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.auth-field:focus-within {
  border-color: var(--auth-magenta);
  box-shadow: 3px 4px 0 var(--auth-magenta);
}
.auth-field input {
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  outline: 0;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
}
.auth-field input::placeholder {
  color: var(--c-text-mute);
}
.auth-field--code input {
  font-family: var(--f-mono);
  font-size: 18px;
  letter-spacing: 0.5em;
  text-align: center;
}
.auth-icon-btn {
  background: none;
  border: 0;
  padding: 0;
  color: inherit;
  cursor: var(--cursor-fish-bite);
  display: grid;
}
.auth-btn {
  height: 40px;
  border: 0;
  border: 2px solid var(--ink);
  border-radius: var(--r-md);
  box-shadow: 3px 4px 0 var(--ink);
  background: var(--auth-magenta);
  color: #fff;
  font-family: var(--f-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: var(--cursor-fish-bite);
  transition: transform 0.15s var(--ease-bounce), box-shadow 0.15s;
}
.auth-btn:hover {
  transform: translate(-1px, -2px) rotate(-0.6deg);
  box-shadow: 5px 7px 0 var(--ink);
}
.auth-btn:active {
  transform: translate(2px, 3px);
  box-shadow: 0 0 0 var(--ink);
}
.auth-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.auth-link {
  align-self: center;
  background: none;
  border: 0;
  color: var(--c-text-dim);
  font-size: 12px;
  cursor: var(--cursor-fish-bite);
}
.auth-link:hover {
  color: var(--auth-magenta);
}
.auth-error {
  font-size: 12px;
  color: var(--c-harmful);
  margin: -6px 0 0;
}
.auth-hint {
  font-size: 11px;
  color: var(--c-text-mute);
  text-align: center;
  margin: 0;
}
</style>
