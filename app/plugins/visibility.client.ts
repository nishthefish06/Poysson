// Adds `is-tab-hidden` to <html> while the tab is in the background, so base.css can pause
// every CSS animation. (rAF loops stop on their own; FishGuide also stops its loop explicitly.)
export default defineNuxtPlugin(() => {
  const sync = () => document.documentElement.classList.toggle('is-tab-hidden', document.hidden)
  document.addEventListener('visibilitychange', sync)
  sync()
})
