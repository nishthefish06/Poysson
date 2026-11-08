<script setup lang="ts">
// Files on your drive (+ restore from last night's backup).
import type { EnvAction, World } from '@hackutd2026/shared/arena';
defineProps<{ world: World; disabled?: boolean }>();
const emit = defineEmits<{ respond: [EnvAction] }>();
</script>

<template>
  <div class="wa">
    <div v-if="world.ransomNote" class="wa__ransom">
      <div class="wa__ransom-title mono"><CyberIcon name="alert" :size="14" /> README_RESTORE_FILES.txt</div>
      <p class="wa__body">{{ world.ransomNote }}</p>
    </div>
    <div class="eyebrow eyebrow--cyan">Your drive</div>
    <div class="wa__files">
      <div v-for="f in world.files" :key="f.name" class="wa__file" :class="{ 'is-locked': f.encrypted }">
        <CyberIcon :name="f.encrypted ? 'lock' : 'list'" :size="28" />
        <span class="wa__file-name mono">{{ f.encrypted ? f.name + '.locked' : f.name }}</span>
        <SketchBox :width="1.6" :overshoot="5" />
      </div>
    </div>
    <div v-if="world.files.some((f) => f.encrypted)">
      <CyberButton
        variant="secondary"
        size="sm"
        icon="rewind"
        :disabled="disabled"
        @click="emit('respond', { action: 'restore_files' })"
        >Restore from last night's backup</CyberButton
      >
    </div>
  </div>
</template>
