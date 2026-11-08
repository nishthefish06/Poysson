<script setup lang="ts">
/**
 * CyberInput
 * states: default · focus · error · disabled
 * v-model bound. Optional leading icon, hint and error text.
 */
const model = defineModel<string>({ default: '' })
const props = withDefaults(defineProps<{
  label?: string
  type?: string
  placeholder?: string
  icon?: string
  hint?: string
  error?: string
  disabled?: boolean
  autocomplete?: string
}>(), { type: 'text' })
const id = useId()
const reveal = ref(false)
const inputType = computed(() => (props.type === 'password' && reveal.value ? 'text' : props.type))
</script>

<template>
  <label class="cyber-input" :class="{ 'cyber-input--error': error, 'cyber-input--disabled': disabled }" :for="id">
    <span v-if="label" class="cyber-input__label">
      {{ label }}
    </span>
    <span class="cyber-input__field">
      <CyberIcon v-if="icon" :name="icon" :size="16" class="cyber-input__icon" />
      <input
        :id="id" v-model="model" :type="inputType" :placeholder="placeholder"
        :disabled="disabled" :autocomplete="autocomplete" class="cyber-input__control"
        :aria-invalid="!!error"
      >
      <button v-if="type === 'password'" type="button" class="cyber-input__reveal" :aria-label="reveal ? 'Hide password' : 'Show password'" @click="reveal = !reveal">
        <CyberIcon :name="reveal ? 'x' : 'eye'" :size="16" />
      </button>
      <SketchBox :width="1.8" :overshoot="6" :boil="false" />
    </span>
    <span v-if="error" class="cyber-input__msg cyber-input__msg--error">! {{ error }}</span>
    <span v-else-if="hint" class="cyber-input__msg">{{ hint }}</span>
  </label>
</template>

<style scoped>
.cyber-input { display: flex; flex-direction: column; gap: var(--s-2); }
.cyber-input__label { font-family: var(--f-hand); font-size: 19px; font-weight: 700; color: var(--ink); }
.cyber-input__field {
  position: relative; display: flex; align-items: center; gap: var(--s-2);
  height: 46px; padding: 0 var(--s-3);
  background: var(--paper-2); border: 0;
  border-radius: var(--r-md);
  transition: border-color var(--t-fast), box-shadow var(--t-med);
}
.cyber-input__field:focus-within { box-shadow: 3px 4px 0 var(--c-magenta); }
.cyber-input__icon { color: var(--c-text-mute); }
.cyber-input__field:focus-within .cyber-input__icon { color: var(--c-cyan); }
.cyber-input__control {
  flex: 1; min-width: 0; height: 100%; background: none; border: 0; outline: 0;
  color: var(--c-text); font-family: var(--f-mono); font-size: var(--fs-md);
  caret-color: var(--c-magenta);
}
.cyber-input__control::placeholder { color: var(--c-text-mute); }
.cyber-input__reveal { background: none; border: 0; color: var(--c-text-mute); cursor: var(--cursor-fish-bite); padding: 4px; display: flex; }
.cyber-input__reveal:hover { color: var(--c-cyan); }
.cyber-input__msg { font-family: var(--f-mono); font-size: var(--fs-xs); color: var(--c-text-mute); }
.cyber-input--error .cyber-input__field { box-shadow: 3px 4px 0 var(--c-harmful); animation: shake .35s; }
.cyber-input__msg--error { color: var(--c-harmful); }
.cyber-input--disabled { opacity: .45; }
</style>
