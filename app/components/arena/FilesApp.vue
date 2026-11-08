<script setup lang="ts">
// Files on your drive (+ restore from last night's backup).
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
</script>

<template>
  <div class="text-sm">
    <div v-if="world.ransomNote" class="mb-4 rounded border border-verdict-harmful bg-verdict-harmful/10 p-3">
      <p class="font-bold text-verdict-harmful">README_RESTORE_FILES.txt</p>
      <p class="mt-1 whitespace-pre-line">{{ world.ransomNote }}</p>
    </div>
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div v-for="f in world.files" :key="f.name" class="rounded border border-line p-3 text-center">
        <p class="text-2xl">{{ f.encrypted ? '🔒' : '📄' }}</p>
        <p class="mt-1 break-all">{{ f.encrypted ? f.name + '.locked' : f.name }}</p>
      </div>
    </div>
    <button
      v-if="world.files.some((f) => f.encrypted)"
      :disabled="disabled"
      class="mt-4 rounded border border-line px-3 py-1 hover:border-neon-cyan disabled:opacity-40"
      @click="emit('respond', { action: 'restore_files' })"
    >
      Restore from last night's backup
    </button>
  </div>
</template>
