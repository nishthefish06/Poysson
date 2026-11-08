// Persists game state to localStorage so refreshes during a demo keep progress.
const KEY = 'neon-ir:v1'

export default defineNuxtPlugin(() => {
  const { state } = useGame()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) state.value = { ...state.value, ...JSON.parse(raw) }
  } catch { /* storage blocked: run in-memory */ }
  watch(state, (v) => {
    try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ }
  }, { deep: true })
})
