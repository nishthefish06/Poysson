<script setup lang="ts">
/**
 * OWNER: Person 4 (logic) / UI person (styling). Renders one ScenarioStep as a fake app
 * (inbox, texts, chat, call, popup, social post, website) and emits what the employee did,
 * in the same RunEventKind vocabulary the module's logRunEvent uses.
 * Used by Practice (-> logRunEvent) and Arena (-> /api/arena/:id/action).
 * Styled like the Drills simulator: phone mock for texts/chats/calls, mail card for email, browser bar for web.
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
const phoneLike = computed(() => ['sms', 'chat', 'call'].includes(props.step.channel));
const ICONS: Record<string, string> = {
  email: 'mail',
  sms: 'sms',
  chat: 'sms',
  call: 'phone',
  popup: 'alert',
  social: 'user',
  web: 'lock',
  system: 'terminal',
};
const icon = computed(() => ICONS[props.step.channel] ?? 'mail');
</script>

<template>
  <article class="step">
    <header class="step__head">
      <span class="step__chan"><CyberIcon :name="icon" :size="14" /> {{ step.channel }}</span>
      <div class="spacer" />
      <span class="step__from mono">{{ step.from }}</span>
    </header>
    <h2 v-if="step.subject" class="step__title">{{ step.subject }}</h2>

    <!-- texts, chats and calls: a phone -->
    <div v-if="phoneLike" class="step__phone">
      <div class="step__phone-bar mono">
        <span>{{ step.channel === 'call' ? 'Call transcript' : 'Work phone' }}</span><span>5G ▮▮▮</span>
      </div>
      <div class="step__phone-from">{{ step.from }}</div>
      <div class="step__bubble">{{ step.body }}</div>
      <div class="step__phone-time mono">{{ step.channel === 'call' ? 'Voice call' : 'Text Message' }} · now</div>
    </div>

    <!-- a web page: browser bar -->
    <div v-else-if="step.channel === 'web'" class="step__web">
      <div class="step__web-bar mono"><CyberIcon name="lock" :size="12" /> {{ step.from }}</div>
      <p class="step__body">{{ step.body }}</p>
    </div>

    <!-- email, popups, social posts, system notices: a mail card -->
    <div v-else class="step__mail">
      <div class="step__mail-row"><span class="mono">From</span> <b>{{ step.from }}</b></div>
      <div v-if="step.subject" class="step__mail-row"><span class="mono">Subj</span> {{ step.subject }}</div>
      <p class="step__body">{{ step.body }}</p>
    </div>

    <div v-if="step.links?.length" class="step__links">
      <button
        v-for="l in step.links"
        :key="l.url"
        class="step__link"
        :title="l.url"
        :disabled="disabled"
        @click="act('clicked_link', l.url)"
      >
        <CyberIcon name="chain" :size="14" /> {{ l.label }}
      </button>
    </div>

    <form v-if="step.form" class="step__form" autocomplete="off" @submit.prevent="submitForm">
      <label v-for="f in step.form.fields" :key="f.name" class="step__field">
        <span class="step__field-label">{{ f.label }}</span>
        <input :type="f.kind" autocomplete="off" class="step__input" />
      </label>
      <CyberButton type="submit" size="sm" :disabled="disabled">{{ step.form.submitLabel }}</CyberButton>
    </form>

    <form v-if="canReply" class="step__reply" @submit.prevent="sendReply">
      <input v-model="reply" :disabled="disabled" class="step__input" placeholder="Reply…" />
      <CyberButton type="submit" variant="secondary" size="sm" :disabled="disabled || !reply.trim()">Send</CyberButton>
    </form>

    <StepActions :disabled="disabled" @act="(kind) => act(kind)" />
  </article>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: var(--s-4); animation: slide-in .3s var(--ease); }
.step__head { display: flex; align-items: center; gap: var(--s-3); }
.step__chan { display: inline-flex; align-items: center; gap: 6px; font-family: var(--f-mono); font-size: 11px; color: var(--c-cyan); padding: 2px 8px; border: 1px solid var(--c-cyan); border-radius: var(--r-sm); text-transform: uppercase; letter-spacing: .1em; }
.step__from { font-size: var(--fs-xs); color: var(--c-text-mute); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.step__title { font-size: var(--fs-xl); color: var(--ink); }
.step__body { margin: 0; padding: var(--s-4); font-size: var(--fs-sm); color: var(--c-text); white-space: pre-line; line-height: 1.5; }

/* same phone mock as the Drills simulator */
.step__phone { align-self: flex-start; width: 320px; max-width: 100%; padding: var(--s-4); background: #0b0b10; border: 2px solid #26263a; border-radius: 28px; box-shadow: 0 0 0 6px #111119, 0 20px 50px rgba(0, 0, 0, .35); }
.step__phone-bar { display: flex; justify-content: space-between; font-size: 10px; color: var(--c-text-mute); padding: 0 var(--s-2) var(--s-3); }
.step__phone-from { text-align: center; font-size: var(--fs-sm); font-weight: 700; color: #f0f0f5; margin-bottom: var(--s-3); }
.step__bubble { background: #26262e; color: #f0f0f5; padding: var(--s-3) var(--s-4); border-radius: 18px 18px 18px 4px; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.4; word-break: break-word; white-space: pre-line; }
.step__phone-time { font-size: 10px; color: var(--c-text-mute); margin-top: var(--s-2); padding-left: var(--s-2); }

.step__mail, .step__web { border: 1px solid var(--c-line-strong); background: var(--paper-2); border-radius: var(--r-md); overflow: hidden; }
.step__mail-row { padding: var(--s-2) var(--s-4); border-bottom: 1px solid var(--c-line); font-size: var(--fs-sm); display: flex; gap: var(--s-3); }
.step__mail-row .mono { width: 40px; font-size: 11px; color: var(--c-text-mute); }
.step__web-bar { display: flex; align-items: center; gap: 6px; padding: var(--s-2) var(--s-4); background: var(--c-bg-2); border-bottom: 1px solid var(--c-line); font-size: 11px; color: var(--c-text-dim); }

.step__links { display: flex; flex-wrap: wrap; gap: var(--s-2); }
.step__link { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: none; border: 0; color: var(--c-cyan); font-weight: 700; text-decoration: underline wavy rgba(var(--rgb-cyan), .5); text-underline-offset: 4px; }
.step__link:hover:not(:disabled) { color: var(--c-magenta); }
.step__link:disabled { opacity: .45; }

.step__form { display: flex; flex-direction: column; gap: var(--s-3); padding: var(--s-4); border: 1px dashed var(--c-line-strong); border-radius: var(--r-md); background: color-mix(in srgb, var(--paper) 60%, transparent); align-items: flex-start; }
.step__field { display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 360px; }
.step__field-label { font-size: var(--fs-sm); font-weight: 700; color: var(--c-text-dim); }
.step__input { width: 100%; height: 38px; padding: 0 var(--s-3); color: var(--c-text); background: var(--paper-2); border: 1.5px solid var(--c-line-strong); border-radius: var(--r-md); font: var(--fs-sm) var(--f-ui); }
.step__input:focus { outline: none; border-color: var(--c-magenta); box-shadow: 0 0 0 3px rgba(var(--rgb-magenta), .12); }
.step__input:disabled { opacity: .5; }
.step__reply { display: flex; gap: var(--s-2); align-items: center; }
</style>
