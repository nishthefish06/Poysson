<script setup lang="ts">
/** OWNER: UI person. Poyo, the little mascot. Pages only set `mood` and `message`. */
defineProps<{ mood?: 'idle' | 'happy' | 'worried' | 'alert'; message?: string }>();
</script>

<template>
  <div class="fixed bottom-4 right-4 flex items-end gap-2">
    <p v-if="message" class="max-w-xs rounded-lg bg-panel px-3 py-2 text-sm">{{ message }}</p>
    <div class="h-12 w-12 rounded-full bg-neon-cyan/30" :title="`Poyo (${mood ?? 'idle'})`" />
  </div>
</template>
