<script setup lang="ts">
/**
 * OWNER: Person 4 (logic) / UI person (styling). Renders one ScenarioStep as a fake app
 * (inbox, texts, chat, call, popup, social post, website) and emits what the employee did,
 * in the same RunEventKind vocabulary the module's logRunEvent uses.
 * Used by Practice (-> logRunEvent) and Arena (-> /api/arena/:id/action).
 */
import type { ScenarioStep } from '@hackutd2026/shared';
import type { ArenaAction } from '@hackutd2026/shared/arena';

const props = defineProps<{ step: ScenarioStep; disabled?: boolean }>();
const emit = defineEmits<{ act: [ArenaAction] }>();

const reply = ref('');
const act = (kind: ArenaAction['kind'], detail = '') => {
  if (!props.disabled) emit('act', { stepId: props.step.id, kind, detail });
};
function sendReply() {
  if (!reply.value.trim()) return;
  act('replied', reply.value);
  reply.value = '';
}
function submitForm(e: Event) {
  // Never read or send the typed values: only record that the form was submitted.
  (e.target as HTMLFormElement).reset();
  act('shared_credentials', `submitted form on ${props.step.from}`);
}
const canReply = computed(() => ['email', 'sms', 'chat', 'social'].includes(props.step.channel));
</script>

<template>
  <article class="rounded border border-line bg-panel">
    <!-- header differs per channel; the UI person makes each one look like the real thing -->
    <header class="flex items-center justify-between border-b border-line px-4 py-2 text-sm">
      <span class="font-mono uppercase text-neutral-500">{{ step.channel }}</span>
      <span v-if="step.channel === 'web'" class="truncate font-mono">🔒 {{ step.from }}</span>
      <span v-else>{{ step.from }}</span>
    </header>

    <div class="p-4">
      <p v-if="step.subject" class="mb-2 font-semibold">{{ step.subject }}</p>
      <p class="whitespace-pre-line">{{ step.body }}</p>

      <p v-for="l in step.links ?? []" :key="l.url" class="mt-2">
        <button
          class="text-neon-cyan underline"
          :title="l.url"
          :disabled="disabled"
          @click="act('clicked_link', l.url)"
        >
          {{ l.label }}
        </button>
      </p>

      <form v-if="step.form" class="mt-3 space-y-2" autocomplete="off" @submit.prevent="submitForm">
        <label v-for="f in step.form.fields" :key="f.name" class="block text-sm">
          {{ f.label }}
          <input :type="f.kind" autocomplete="off" class="mt-1 block w-full rounded bg-bg px-2 py-1" />
        </label>
        <button :disabled="disabled" class="rounded bg-neon-cyan px-3 py-1 text-white">
          {{ step.form.submitLabel }}
        </button>
      </form>

      <form v-if="canReply" class="mt-3 flex gap-2" @submit.prevent="sendReply">
        <input
          v-model="reply"
          :disabled="disabled"
          class="flex-1 rounded bg-bg px-2 py-1"
          placeholder="Reply…"
        />
      </form>
    </div>

    <StepActions :disabled="disabled" @act="(kind) => act(kind)" />
  </article>
</template>
