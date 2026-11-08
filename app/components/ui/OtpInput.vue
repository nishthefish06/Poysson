<script setup lang="ts">
/**
 * OtpInput: six bubble-style digit inputs for a one-time code.
 *  - typing a digit advances; Backspace on an empty bubble goes back (and clears it)
 *  - ←/→ move between bubbles, Home/End jump
 *  - paste (or iOS/Android one-time-code autofill into the first bubble) spreads the digits
 *  - emits `complete` with the full code as soon as the sixth digit lands
 * v-model is the code string (0-6 digits).
 */
const props = withDefaults(defineProps<{ length?: number; disabled?: boolean; invalid?: boolean; label?: string; autofocus?: boolean }>(), {
  length: 6, disabled: false, invalid: false, label: 'One-time code', autofocus: false,
})
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ complete: [code: string]; focusin: [el: HTMLElement] }>()

const boxes = ref<HTMLInputElement[]>([])
const digits = computed(() => Array.from({ length: props.length }, (_, i) => model.value[i] ?? ''))

function set(next: string) {
  const clean = next.replace(/\D/g, '').slice(0, props.length)
  model.value = clean
  if (clean.length === props.length) emit('complete', clean)
}
function focusAt(i: number) {
  const el = boxes.value[Math.max(0, Math.min(props.length - 1, i))]
  el?.focus()
  el?.select()
}

function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement
  const typed = el.value.replace(/\D/g, '')
  if (!typed) {
    // non-digit typed: put the old value back
    el.value = digits.value[i]
    return
  }
  if (typed.length > 1) {
    // autofill / fast typing dropped several digits into one bubble
    set(model.value.slice(0, i) + typed)
    focusAt(i + typed.length)
    return
  }
  const arr = digits.value.slice()
  arr[i] = typed
  // keep it contiguous: no holes before this bubble
  const joined = arr.join('').slice(0, props.length)
  set(joined)
  focusAt(Math.min(joined.length, props.length - 1))
}

function onKeydown(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    e.preventDefault()
    const arr = digits.value.slice()
    if (arr[i]) {
      arr[i] = ''
      set(arr.join(''))
      focusAt(i)
    } else if (i > 0) {
      arr[i - 1] = ''
      set(arr.join(''))
      focusAt(i - 1)
    }
  } else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusAt(0) }
  else if (e.key === 'End') { e.preventDefault(); focusAt(props.length - 1) }
}

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  const d = text.replace(/\D/g, '')
  if (!d) return
  e.preventDefault()
  set(d)
  focusAt(Math.min(d.length, props.length - 1))
}

/** Clear and put focus on the first bubble (after a wrong code). */
function reset() {
  model.value = ''
  nextTick(() => focusAt(0))
}
defineExpose({ reset, focus: () => focusAt(Math.min(model.value.length, props.length - 1)) })

onMounted(() => { if (props.autofocus) focusAt(0) })
</script>

<template>
  <div class="otp" :class="{ 'is-invalid': invalid, 'is-disabled': disabled }" role="group" :aria-label="label">
    <input
      v-for="(d, i) in digits" :key="i"
      :ref="(el) => { if (el) boxes[i] = el as HTMLInputElement }"
      class="otp__bubble" :class="{ 'is-filled': d }"
      :value="d"
      type="text" inputmode="numeric" pattern="[0-9]*"
      :autocomplete="i === 0 ? 'one-time-code' : 'off'"
      :maxlength="i === 0 ? length : 1"
      :disabled="disabled"
      :aria-label="`Digit ${i + 1} of ${length}`"
      :aria-invalid="invalid || undefined"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste"
      @focus="($event.target as HTMLInputElement).select(); emit('focusin', $event.target as HTMLElement)"
    />
  </div>
</template>

<style scoped>
.otp { display: flex; justify-content: center; gap: 8px; }
.otp__bubble {
  width: 46px; height: 52px; padding: 0;
  border-radius: 50% 50% 46% 46% / 54% 54% 46% 46%;
  border: 2px solid var(--line-ink);
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, .9) 0 12%, transparent 14%),
    radial-gradient(circle at 50% 60%, rgba(var(--rgb-cyan), .14), rgba(var(--rgb-cyan), .04) 70%),
    var(--paper-2);
  color: var(--c-text);
  font-family: var(--f-mono); font-size: 22px; font-weight: 700; text-align: center;
  caret-color: var(--c-magenta);
  transition: transform .18s cubic-bezier(.3, 1.6, .5, 1), border-color .15s, box-shadow .15s;
}
.otp__bubble:focus { outline: none; border-color: var(--c-magenta); box-shadow: 0 0 0 3px rgba(var(--rgb-magenta), .35); transform: translateY(-3px) scale(1.06); }
.otp__bubble.is-filled { border-color: var(--c-magenta); background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, .9) 0 12%, transparent 14%), rgba(var(--rgb-magenta), .12), var(--paper-2); }
.is-invalid .otp__bubble { border-color: var(--c-harmful); }
.is-disabled .otp__bubble { opacity: .55; }
@media (max-width: 400px) { .otp { gap: 5px; } .otp__bubble { width: 40px; height: 46px; font-size: 19px; } }
</style>
