<script setup lang="ts">
/* STYLEGUIDE — every component and variant in one place (the code equivalent of a Figma component sheet). */
definePageMeta({ layout: 'bare' })
const email = ref('')
const pw = ref('hunter2')
const tab = ref('score')
const secs = ref(95)
const colors = ['--c-bg-0', '--c-bg-1', '--c-bg-2', '--c-line-strong', '--c-cyan', '--c-magenta', '--c-yellow', '--c-violet', '--c-ideal', '--c-ok', '--c-harmful', '--c-text', '--c-text-dim']
</script>

<template>
  <div class="sg">
    <header class="sg__head">
      <div>
        <div class="eyebrow eyebrow--magenta">NEON//IR design system</div>
        <h1>Component library</h1>
      </div>
      <div class="spacer" />
      <CyberButton variant="ghost" size="sm" icon="back" to="/login">Back to app</CyberButton>
    </header>

    <section class="sg__sec">
      <h2 class="sg__h">Tokens / color</h2>
      <div class="sg__swatches">
        <div v-for="c in colors" :key="c" class="sg__swatch"><span :style="{ background: `var(${c})` }" /><code>{{ c }}</code></div>
      </div>
      <div class="sg__type">
        <div style="font-family: var(--f-display); font-size: 32px; font-weight: 900">Orbitron — Display</div>
        <div style="font-family: var(--f-ui); font-size: 18px">Chakra Petch — UI labels & body</div>
        <div style="font-family: var(--f-mono); font-size: 14px">JetBrains Mono — logs, data, timestamps</div>
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">CyberButton</h2>
      <div class="sg__row">
        <CyberButton variant="primary" icon="bolt">Primary</CyberButton>
        <CyberButton variant="secondary" icon="shield">Secondary</CyberButton>
        <CyberButton variant="danger" icon="alert">Danger</CyberButton>
        <CyberButton variant="ghost">Ghost</CyberButton>
        <CyberButton variant="primary" loading>Loading</CyberButton>
        <CyberButton variant="primary" disabled>Disabled</CyberButton>
      </div>
      <div class="sg__row">
        <CyberButton size="sm">Small</CyberButton>
        <CyberButton size="md">Medium</CyberButton>
        <CyberButton size="lg" icon-right="arrow">Large</CyberButton>
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">CyberInput</h2>
      <div class="sg__grid3">
        <CyberInput v-model="email" label="Default" icon="user" placeholder="operator@halcyon.io" hint="Helper text" />
        <CyberInput v-model="pw" label="Password" type="password" icon="lock" />
        <CyberInput model-value="bad@" label="Error" icon="mail" error="Invalid operator ID" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">StatCard</h2>
      <div class="sg__grid5">
        <StatCard label="Cyan" :value="42" icon="chip" :delta="5" caption="caption" />
        <StatCard label="Magenta" :value="7" accent="magenta" icon="star" />
        <StatCard label="Yellow" :value="12" unit="d" accent="yellow" icon="flame" />
        <StatCard label="Green" :value="93" unit="%" accent="green" icon="check" :delta="-3" />
        <StatCard label="Red" :value="2" accent="red" icon="alert" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">XpBar</h2>
      <div class="stack">
        <XpBar :value="320" :max="2250" :level="3" size="sm" />
        <XpBar :value="1180" :max="2250" :level="7" />
        <XpBar :value="1900" :max="2250" :level="12" size="lg" :gain="400" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">CyberBadge</h2>
      <div class="sg__row">
        <CyberBadge name="Bronze" tier="bronze" icon="bolt" desc="Tier: bronze" />
        <CyberBadge name="Silver" tier="silver" icon="shield" desc="Tier: silver" />
        <CyberBadge name="Gold" tier="gold" icon="star" desc="Tier: gold" />
        <CyberBadge name="Neon" tier="neon" icon="chip" desc="Tier: neon" fresh />
        <CyberBadge name="Locked" tier="gold" locked desc="Not yet earned" />
        <CyberBadge name="Small" tier="neon" icon="radar" size="sm" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">StatusPill · CyberTimer · SolanaVerified</h2>
      <div class="sg__row">
        <StatusPill status="ideal" /><StatusPill status="ok" /><StatusPill status="harmful" /><StatusPill status="pending" />
        <StatusPill status="ideal" size="sm" /><StatusPill status="harmful" size="sm" />
      </div>
      <div class="sg__row">
        <CyberTimer :seconds="secs" :total="180" />
        <CyberTimer :seconds="45" :total="180" />
        <CyberTimer :seconds="12" :total="180" />
        <CyberTimer :seconds="secs" :total="180" variant="digital" />
        <input v-model.number="secs" type="range" min="0" max="180">
      </div>
      <div class="sg__row">
        <SolanaVerified tx="5KtPn1mZ7yC8bJx9QeLrWv2sHdT3gN4aF6uE8pR1oYkMcXiBzA7qVwS2nD5hG9jL3fU6tE4rY8oP1kN7mQ2xZ" />
        <SolanaVerified tx="5KtPn1mZ7yC8bJx9QeLrWv2sHdT3gN4aF6uE8pR1oYkMcXiBzA7qVwS2nD5hG9jL3fU6tE4rY8oP1kN7mQ2xZ" compact />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">TabBar</h2>
      <TabBar v-model="tab" :tabs="[{ id: 'score', label: 'Score', icon: 'trophy' }, { id: 'replay', label: 'Replay', icon: 'rewind' }, { id: 'tips', label: 'Tips', icon: 'info', count: 3 }, { id: 'report', label: 'Report', icon: 'print' }]" />
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">LogRow (alert · log · action)</h2>
      <div class="sg__log">
        <LogRow type="alert" severity="crit" time="00:14" src="EDR" text="FIN-WS-07: 4,812 files renamed to *.lckd" />
        <LogRow type="alert" severity="med" time="00:18" src="MAIL-GW" text="14 recipients received Overdue invoice #88213" />
        <LogRow type="log" time="00:21" src="DNS" text="Lookup: okta-verify-secure.co (registered 2 days ago)" />
        <LogRow type="action" rating="ideal" time="00:25" src="YOU" text="Network-isolate host via EDR" />
        <LogRow type="action" rating="ok" time="00:31" src="YOU" text="Tell CFO to ignore it" />
        <LogRow type="action" rating="harmful" time="00:40" src="YOU" text="Power the machine off" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">ActionButton</h2>
      <div class="sg__actions">
        <ActionButton label="Idle state" hotkey="1" />
        <ActionButton label="Chosen — ideal" hotkey="2" state="chosen" rating="ideal" :points="100" />
        <ActionButton label="Chosen — ok" hotkey="3" state="chosen" rating="ok" :points="50" />
        <ActionButton label="Chosen — harmful" hotkey="4" state="chosen" rating="harmful" :points="-60" />
        <ActionButton label="Locked (other option chosen)" hotkey="5" state="locked" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">ScenarioCard (threat vector)</h2>
      <div class="sg__grid5">
        <ScenarioCard :index="1" code="PHX" name="Armed" blurb="Selected state" icon="sms" color="--c-magenta" armed :skill="82" />
        <ScenarioCard :index="2" code="IDN" name="Offline" blurb="Unselected state" icon="key" color="--c-cyan" :skill="40" />
      </div>
    </section>

    <section class="sg__sec">
      <h2 class="sg__h">CyberPanel · SkillRadar</h2>
      <div class="sg__grid3">
        <CyberPanel title="Cyan panel" eyebrow="eyebrow">Body content</CyberPanel>
        <CyberPanel title="Magenta panel" eyebrow="eyebrow" accent="magenta">Body content</CyberPanel>
        <CyberPanel title="Red panel" eyebrow="eyebrow" accent="red">Body content</CyberPanel>
      </div>
      <SkillRadar :skills="{ phish: 82, identity: 68, malware: 74, exfil: 55, insider: 61 }" :compare="{ phish: 60, identity: 80, malware: 50, exfil: 70, insider: 40 }" />
    </section>
  </div>
</template>

<style scoped>
.sg { max-width: 1200px; margin: 0 auto; padding: var(--s-8) var(--s-6) var(--s-12); display: flex; flex-direction: column; gap: var(--s-10); }
.sg__head { display: flex; align-items: flex-end; }
.sg__sec { display: flex; flex-direction: column; gap: var(--s-4); }
.sg__h { font-size: var(--fs-sm); letter-spacing: .2em; text-transform: uppercase; color: var(--c-cyan); padding-bottom: var(--s-2); border-bottom: 1px solid var(--c-line); }
.sg__row { display: flex; flex-wrap: wrap; gap: var(--s-4); align-items: center; }
.sg__grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-4); }
.sg__grid5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--s-4); }
.sg__swatches { display: flex; flex-wrap: wrap; gap: var(--s-3); }
.sg__swatch { display: flex; flex-direction: column; gap: 4px; }
.sg__swatch span { width: 84px; height: 48px; border: 1px solid var(--c-line-strong); }
.sg__swatch code { font-size: 10px; color: var(--c-text-dim); }
.sg__type { display: flex; flex-direction: column; gap: var(--s-2); }
.sg__log { background: var(--c-bg-1); border: 1px solid var(--c-line); padding-left: var(--s-3); }
.sg__actions { max-width: 420px; display: flex; flex-direction: column; gap: var(--s-2); }
</style>
