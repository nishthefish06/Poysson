// Persists game state to localStorage so refreshes during a demo keep progress.
const KEY = 'neon-ir:v1'

export default defineNuxtPlugin(() => {
  const { state } = useGame()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) state.value = { ...state.value, ...JSON.parse(raw) }
    // Saves from before guided/unguided mode existed
    state.value.setup.mode ??= 'guided'
  } catch { /* storage blocked: run in-memory */ }
  // Finish anchoring anything left pending when the page was closed (or that failed earlier).
  useGame().retryAnchors()
  watch(state, (v) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ }
  }, { deep: true })
})
