/*
 * Shared state for <FishGuide>, the fish that trails the cursor and guides you through sign-in.
 * Pages call these helpers; FishGuide does the swimming.
 *
 *   mood    what the fish is doing right now (see FishMood)
 *   target  element the fish swims to and looks at (null = follow the cursor / park)
 *   shakes  bumped to make the auth card do its "nope" shake
 */
export type FishMood =
  | 'idle' // trailing the cursor, or parked on touch / reduced motion
  | 'focus' // swims beside the focused field and looks at it
  | 'cover' // password field: fins over its eyes
  | 'peek' // password shown: one eye peeking
  | 'loading' // swimming circles around the submit button
  | 'sonar' // waiting for the 2FA code: sonar ripples
  | 'shake' // wrong credentials / code: head shake + bubbles
  | 'success' // a loop, then a dash through the card

interface FishGuideState {
  mood: FishMood
  target: HTMLElement | null
  shakes: number
  /** bumped on every success so FishGuide restarts the loop even if mood was already 'success' */
  successes: number
}

const state = reactive<FishGuideState>({ mood: 'idle', target: null, shakes: 0, successes: 0 })
let resetTimer: ReturnType<typeof setTimeout> | undefined

export function useFishGuide() {
  /** Swim to an element (a field, a button) with a given mood. */
  function guide(el: HTMLElement | null, mood: FishMood = 'focus') {
    clearTimeout(resetTimer)
    state.target = el
    state.mood = el ? mood : 'idle'
  }
  /** Back to following the cursor. */
  function release() {
    clearTimeout(resetTimer)
    state.target = null
    state.mood = 'idle'
  }
  /** Wrong password / code: head shake, bubbles, card shake; then back to `after`. */
  function nope(after: FishMood = 'focus') {
    clearTimeout(resetTimer)
    state.mood = 'shake'
    state.shakes++
    resetTimer = setTimeout(() => { state.mood = state.target ? after : 'idle' }, 900)
  }
  /** Signed in (or 2FA passed): loop, then dash through the card. */
  function celebrate() {
    clearTimeout(resetTimer)
    state.mood = 'success'
    state.successes++
    resetTimer = setTimeout(() => { state.target = null; state.mood = 'idle' }, 1800)
  }
  return { state: readonly(state), guide, release, nope, celebrate }
}
