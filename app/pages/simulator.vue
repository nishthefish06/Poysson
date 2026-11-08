<script setup lang="ts">
/*
 * SIMULATOR — hero screen.
 * Layout:  [ live feed ] [ inbox / ticket queue + detail ] [ timer · score · actions ]
 *          [ ───────────────────── comms panel ───────────────────── ]
 * States:  start (pre-engage overlay) → live (with harmful-action flag) → finished overlay
 * DYNAMIC: everything here is driven by state.plan + a local clock.
 */
import {
  COMMS_ACTIONS, injectById, rng, vectorById,
  type IncidentAction, type Inject, type Rating,
} from '~/data/incidents'
import type { Decision, RunResult } from '~/composables/useGame'

definePageMeta({ layout: 'bare' })
const { state, completeRun } = useGame()
const plan = state.value.plan
if (!plan) navigateTo('/incidents')

type Phase = 'start' | 'countdown' | 'live' | 'finished'
const phase = ref<Phase>('start')
const countdown = ref(3)
const elapsed = ref(0)
const remaining = computed(() => Math.max(0, (plan?.duration ?? 0) - elapsed.value))

interface FeedLine { id: number; type: 'alert' | 'log' | 'action'; src: string; text: string; t: number; severity?: Inject['severity']; rating?: Rating }
const feed = ref<FeedLine[]>([])
const arrived = ref<{ inject: Inject; at: number; actions: IncidentAction[] }[]>([])
const decisions = ref<Decision[]>([])
const comms = ref<RunResult['comms']>([])
const chat = ref<{ id: number; who: string; role: string; text: string; t: number; me?: boolean }[]>([])
const draftMessage = ref('')
const responseDraft = ref('')
const showGuidebook = ref(false)
const guideSearch = ref('')

const GUIDEBOOK = [
  { id: 'phish', vector: 'phish', title: 'Phishing and smishing', tip: 'Validate the sender and destination independently. Quarantine the message or campaign, preserve the original, then notify affected users.', indicators: ['Urgency or unusual pressure', 'Look-alike domains and shortened links', 'Unexpected attachments or MFA requests'] },
  { id: 'identity', vector: 'identity', title: 'Identity compromise', tip: 'Treat successful authentication plus anomalous activity as a credential incident. Revoke sessions, rotate credentials, and verify through a trusted channel.', indicators: ['Impossible travel or unfamiliar origin', 'MFA fatigue or push storms', 'Unexpected mailbox, token, or privilege changes'] },
  { id: 'malware', vector: 'malware', title: 'Malware and ransomware', tip: 'Contain the host through the security platform while preserving volatile evidence. Block known infrastructure and avoid destructive cleanup before collection.', indicators: ['Mass file changes or encryption', 'Suspicious parent-child process chains', 'Beaconing or connections to known-bad infrastructure'] },
  { id: 'exfil', vector: 'exfil', title: 'Data exposure and exfiltration', tip: 'Stop the transfer or close the exposure, preserve logs, and identify the data and access path. Escalate privacy or legal impact early.', indicators: ['Large or unusual outbound transfers', 'Public storage or access-policy changes', 'Archives, staging activity, or unknown destinations'] },
  { id: 'insider', vector: 'insider', title: 'Pretexting and insider risk', tip: 'Slow down high-pressure requests and verify out of band. Preserve the request and route sensitive changes through the approved approval path.', indicators: ['Authority, urgency, or anger used as leverage', 'Requests to bypass normal verification', 'Spoofed caller identity or unusual access behavior'] },
] as const
const selectedId = ref<string | null>(null)
const flag = ref<{ text: string; consequence?: string } | null>(null)
const lastRating = ref<Rating | null>(null)
let seq = 0
let timer: ReturnType<typeof setInterval> | undefined
let startedAt = 0

const score = computed(() => Math.max(0, decisions.value.reduce((a, d) => a + d.points + d.speedBonus, 0) + comms.value.reduce((a, c) => a + c.points, 0)))
const harmfulCount = computed(() => decisions.value.filter(d => d.rating === 'harmful').length)
const selected = computed(() => arrived.value.find(a => a.inject.id === selectedId.value) ?? null)
const decisionFor = (id: string) => decisions.value.find(d => d.injectId === id)
const pending = computed(() => arrived.value.filter(a => !decisionFor(a.inject.id)).length)
const progress = computed(() => plan ? decisions.value.length / plan.schedule.length : 0)
const guideResults = computed(() => {
  const query = guideSearch.value.trim().toLowerCase()
  const currentVector = selected.value?.inject.vector
  return GUIDEBOOK
    .filter(entry => !query || [entry.title, entry.vector, entry.tip, ...entry.indicators].join(' ').toLowerCase().includes(query))
    .sort((a, b) => Number(b.vector === currentVector) - Number(a.vector === currentVector))
})

const push = (l: Omit<FeedLine, 'id' | 't'>) => { feed.value.unshift({ ...l, id: ++seq, t: elapsed.value }) }
const say = (who: string, role: string, text: string, me = false) => { chat.value.push({ id: ++seq, who, role, text, t: elapsed.value, me }) }

const NOISE = [
  ['FW', 'Allowed 443/tcp 10.20.4.11 → 52.96.12.4 (o365)'],
  ['AD', 'Kerberos TGT issued: svc-backup@HALCYON'],
  ['EDR', 'Sensor heartbeat OK — 1,204 endpoints'],
  ['DNS', 'NXDOMAIN spike 0.4% (baseline)'],
  ['VPN', 'Session start: a.lopez (Portland, OR)'],
  ['SIEM', 'Correlation rules reloaded (412 active)'],
  ['PROXY', 'Blocked category: newly-registered-domain (3)'],
]

function engage() {
  phase.value = 'countdown'
  const t = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) { clearInterval(t); goLive() }
  }, 700)
}

function goLive() {
  if (!plan) return
  phase.value = 'live'
  startedAt = performance.now()
  push({ type: 'log', src: 'SOC', text: `Incident ${plan.id} opened — commander: ${state.value.player.handle}` })
  say('Kade', 'SOC Lead', 'Bridge is open. Multiple sensors going off. Your call, commander.')
  const r = rng(plan.seed + 7)
  timer = setInterval(() => {
    elapsed.value = (performance.now() - startedAt) / 1000
    // fire injects
    for (const s of plan.schedule) {
      if (s.at <= elapsed.value && !arrived.value.some(a => a.inject.id === s.injectId)) fire(s.injectId, r)
    }
    // background noise
    if (Math.floor(elapsed.value * 4) % 22 === 0 && r() > 0.5) {
      const [src, text] = NOISE[Math.floor(r() * NOISE.length)]
      if (feed.value[0]?.text !== text) push({ type: 'log', src, text })
    }
    // end conditions
    if (remaining.value <= 0) finish()
    else if (arrived.value.length === plan.schedule.length && pending.value === 0) setTimeout(finish, 1200)
  }, 250)
}

function fire(id: string, r: () => number) {
  const inject = injectById(id)
  const actions = inject.actions.slice().sort(() => r() - 0.5)
  arrived.value.push({ inject, at: elapsed.value, actions })
  inject.feed.forEach((f, i) => setTimeout(() => push({ ...f, severity: f.type === 'alert' ? inject.severity : undefined }), i * 600))
  if (inject.comms) setTimeout(() => say(inject.comms!.who, inject.comms!.role, inject.comms!.text), 1500)
  if (!selectedId.value || decisionFor(selectedId.value)) selectedId.value = inject.id
}

function choose(a: IncidentAction) {
  const sel = selected.value
  if (!sel || decisionFor(sel.inject.id) || phase.value !== 'live') return
  const respTime = elapsed.value - sel.at
  const speedBonus = a.rating !== 'harmful' && respTime <= 20 ? 10 : 0
  decisions.value.push({ injectId: sel.inject.id, vector: sel.inject.vector, arrivedAt: sel.at, at: elapsed.value, actionId: a.id, rating: a.rating, points: a.points, speedBonus })
  lastRating.value = a.rating
  push({ type: 'action', src: 'YOU', text: `${a.label} → ${sel.inject.title}`, rating: a.rating })
  if (a.consequence) setTimeout(() => push({ type: 'alert', src: 'IMPACT', text: a.consequence!, severity: 'crit' }), 700)
  if (a.rating === 'harmful') {
    flag.value = { text: a.feedback, consequence: a.consequence }
    setTimeout(() => { flag.value = null }, 4500)
  }
  // auto-advance to next unresolved item
  setTimeout(() => {
    const next = arrived.value.find(x => !decisionFor(x.inject.id))
    if (next) selectedId.value = next.inject.id
  }, 1400)
}

function submitResponse() {
  const sel = selected.value
  const response = responseDraft.value.trim()
  if (!sel || !response || decisionFor(sel.inject.id) || phase.value !== 'live') return

  const words = response.toLowerCase().match(/[a-z0-9]+/g) ?? []
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'then', 'will', 'host', 'user'])
  const meaningful = new Set(words.filter(word => word.length > 3 && !stopWords.has(word)))
  const ranked = sel.actions.map(action => {
    const actionWords = new Set(action.label.toLowerCase().match(/[a-z0-9]+/g)?.filter(word => word.length > 3 && !stopWords.has(word)) ?? [])
    return { action, score: [...actionWords].filter(word => meaningful.has(word)).length }
  }).sort((a, b) => b.score - a.score)
  const fallback = sel.actions.find(action => action.rating === 'ok') ?? sel.actions.find(action => action.rating !== 'harmful') ?? sel.actions[0]
  const judged = ranked[0]?.score ? ranked[0].action : fallback

  choose(judged)
  push({ type: 'action', src: 'ORDER', text: `Written order: ${response}`, rating: judged.rating })
  say('You', 'Commander', response, true)
  responseDraft.value = ''
}

function sendComms(c: typeof COMMS_ACTIONS[number]) {
  if (comms.value.some(x => x.id === c.id) || phase.value !== 'live') return
  const firedVectors = arrived.value.map(a => a.inject.vector)
  const ideal = !c.idealWhen || c.idealWhen.some(v => firedVectors.includes(v))
  comms.value.push({ id: c.id, at: elapsed.value, points: ideal ? c.points : Math.round(c.points / 3) })
  say('You', 'Commander', c.label, true)
  setTimeout(() => {
    const [who, ...rest] = c.reply.split(': ')
    say(who, '', rest.join(': '))
  }, 900)
}

function sendFreeform() {
  const message = draftMessage.value.trim()
  if (!message || phase.value !== 'live') return
  say('You', 'Commander', message, true)
  push({ type: 'action', src: 'COMMS', text: `Bridge message sent: ${message}` })
  draftMessage.value = ''
}

const result = ref<RunResult | null>(null)
function finish() {
  if (phase.value !== 'live' || !plan) return
  clearInterval(timer)
  phase.value = 'finished'
  push({ type: 'log', src: 'SOC', text: `Incident ${plan.id} closed at T+${fmtTime(elapsed.value)}` })
  result.value = completeRun(plan, decisions.value, comms.value, Math.round(elapsed.value))
}

function onKey(e: KeyboardEvent) {
  if (phase.value === 'start' && e.key === 'Enter') return engage()
  if (phase.value !== 'live' || !selected.value) return
  const n = Number(e.key)
  if (n >= 1 && n <= selected.value.actions.length) choose(selected.value.actions[n - 1])
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener('keydown', onKey) })

const kindIcon: Record<string, string> = { sms: 'sms', email: 'mail', ticket: 'ticket', edr: 'edr' }
const stamp = (t: number) => `T+${fmtTime(t)}`
</script>

<template>
  <div v-if="plan" class="sim" :class="[`sim--${phase}`, { 'sim--flagged': flag }]">
    <!-- ============ TOP BAR ============ -->
    <header class="sim__top">
      <NuxtLink to="/incidents" class="sim__exit" title="Abort"><CyberIcon name="back" :size="16" /></NuxtLink>
      <div class="sim__op">
        <div class="eyebrow eyebrow--magenta">{{ plan.id }} · {{ plan.difficulty }}</div>
        <div class="sim__op-name">OP: {{ plan.codename }}</div>
      </div>
      <div class="sim__progress">
        <div class="eyebrow">Containment {{ decisions.length }}/{{ plan.schedule.length }}</div>
        <div class="sim__progress-track"><div :style="{ width: progress * 100 + '%' }" /></div>
      </div>
      <div class="spacer" />
      <div class="sim__vectors">
        <span v-for="v in plan.vectors" :key="v" class="sim__vchip" :class="{ 'is-hit': arrived.some(a => a.inject.vector === v) }" :style="{ '--c': `var(${vectorById(v).color})` }">
          <CyberIcon :name="vectorById(v).icon" :size="13" /> {{ vectorById(v).code }}
        </span>
      </div>
      <div class="sim__live mono" :class="{ 'is-on': phase === 'live' }"><span /> {{ phase === 'live' ? 'LIVE' : phase === 'finished' ? 'CLOSED' : 'STANDBY' }}</div>
    </header>

    <!-- ============ HARMFUL FLAG BANNER ============ -->
    <Transition name="flag">
      <div v-if="flag" class="sim__flag" role="alert">
        <CyberIcon name="alert" :size="22" />
        <div>
          <div class="sim__flag-title">HARMFUL ACTION FLAGGED</div>
          <div class="sim__flag-text">{{ flag.text }}</div>
        </div>
      </div>
    </Transition>

    <!-- ============ MAIN GRID ============ -->
    <main class="sim__grid">
      <!-- LEFT: live alert + log feed -->
      <CyberPanel title="Live feed" :eyebrow="`${feed.length} events`" accent="magenta" :padded="false" class="sim__feed">
        <template #actions><span class="sim__feed-dot" /></template>
        <div class="sim__feed-list">
          <TransitionGroup name="row">
            <LogRow
              v-for="(l, i) in feed" :key="l.id" :type="l.type" :src="l.src" :text="l.text"
              :time="fmtTime(l.t)" :severity="l.severity" :rating="l.rating" :fresh="i === 0"
            />
          </TransitionGroup>
          <div v-if="!feed.length" class="sim__empty mono">// awaiting telemetry…</div>
        </div>
      </CyberPanel>

      <!-- CENTER: inbox / ticket queue -->
      <CyberPanel :padded="false" accent="cyan" class="sim__inbox">
        <div class="sim__inbox-wrap">
          <nav class="sim__queue">
            <div class="sim__queue-head eyebrow">Queue · {{ pending }} open</div>
            <button
              v-for="a in arrived" :key="a.inject.id" class="sim__qitem"
              :class="[{ 'is-sel': selectedId === a.inject.id, 'is-done': decisionFor(a.inject.id) }, `sev-${a.inject.severity}`]"
              @click="selectedId = a.inject.id"
            >
              <CyberIcon :name="kindIcon[a.inject.item.kind]" :size="16" />
              <div class="sim__qitem-main">
                <div class="sim__qitem-from">{{ a.inject.item.from }}</div>
                <div class="sim__qitem-subj">{{ a.inject.item.subject ?? a.inject.item.body }}</div>
              </div>
              <span v-if="decisionFor(a.inject.id)" class="sim__qitem-done" :style="{ color: `var(--c-${decisionFor(a.inject.id)!.rating})` }"><CyberIcon :name="decisionFor(a.inject.id)!.rating === 'harmful' ? 'x' : 'check'" :size="14" :stroke="2.5" /></span>
              <span v-else class="sim__qitem-new" />
            </button>
            <div v-if="!arrived.length" class="sim__empty mono">// queue empty</div>
          </nav>

          <article v-if="selected" class="sim__detail" :key="selected.inject.id">
            <header class="sim__detail-head">
              <span class="sim__detail-vec" :style="{ '--c': `var(${vectorById(selected.inject.vector).color})` }">
                <CyberIcon :name="vectorById(selected.inject.vector).icon" :size="14" /> {{ vectorById(selected.inject.vector).name }}
              </span>
              <span class="sim__sev mono" :class="`sev-${selected.inject.severity}`">{{ selected.inject.severity.toUpperCase() }}</span>
              <div class="spacer" />
              <span class="mono mute sim__detail-t">RECEIVED {{ stamp(selected.at) }}</span>
            </header>
            <h2 class="sim__detail-title">{{ selected.inject.title }}</h2>

            <!-- SMS: phone mock -->
            <div v-if="selected.inject.item.kind === 'sms'" class="sim__phone">
              <div class="sim__phone-bar mono"><span>{{ selected.inject.item.to }}</span><span>5G ▮▮▮</span></div>
              <div class="sim__phone-from">{{ selected.inject.item.from }}</div>
              <div class="sim__bubble">{{ selected.inject.item.body }}</div>
              <div class="sim__phone-time mono">Text Message · now</div>
            </div>

            <!-- EMAIL -->
            <div v-else-if="selected.inject.item.kind === 'email'" class="sim__email">
              <div class="sim__email-row"><span class="mute">From</span> <b>{{ selected.inject.item.from }}</b></div>
              <div class="sim__email-row"><span class="mute">To</span> {{ selected.inject.item.to }}</div>
              <div class="sim__email-row"><span class="mute">Subj</span> {{ selected.inject.item.subject }}</div>
              <pre class="sim__email-body">{{ selected.inject.item.body }}</pre>
            </div>

            <!-- TICKET / EDR -->
            <div v-else class="sim__ticket">
              <div class="sim__ticket-head mono"><CyberIcon :name="kindIcon[selected.inject.item.kind]" :size="14" /> {{ selected.inject.item.from }} — {{ selected.inject.item.subject }}</div>
              <p class="sim__ticket-body">{{ selected.inject.item.body }}</p>
            </div>

            <dl v-if="selected.inject.item.meta" class="sim__meta">
              <template v-for="(v, k) in selected.inject.item.meta" :key="k">
                <dt>{{ k }}</dt><dd>{{ v }}</dd>
              </template>
            </dl>

            <div v-if="decisionFor(selected.inject.id)" class="sim__flags">
              <div class="eyebrow eyebrow--cyan">Red flags you should have spotted</div>
              <ul><li v-for="f in selected.inject.item.redFlags" :key="f">{{ f }}</li></ul>
            </div>
          </article>
          <div v-else class="sim__detail sim__detail--empty">
            <CyberIcon name="radar" :size="48" :stroke="1" />
            <div class="mono">{{ phase === 'live' ? 'Monitoring… next inject incoming' : 'No active incident' }}</div>
          </div>
        </div>
      </CyberPanel>

      <!-- RIGHT: timer + score + actions -->
      <aside class="sim__right">
        <CyberPanel accent="cyan" class="sim__hud">
          <div class="sim__hud-row">
            <CyberTimer :seconds="remaining" :total="plan.duration" />
            <div class="sim__score">
              <div class="eyebrow">Score</div>
              <div class="sim__score-val">{{ score }}</div>
              <StatusPill :status="lastRating ?? 'pending'" :label="lastRating ? undefined : 'NO CALLS'" />
              <div class="sim__harm mono" :class="{ 'is-bad': harmfulCount }"><CyberIcon name="alert" :size="12" /> {{ harmfulCount }} harmful</div>
            </div>
          </div>
        </CyberPanel>

        <CyberPanel title="Response" :eyebrow="selected ? 'Write an order · guidebook available' : 'Standby'" accent="magenta" class="sim__actions">
          <div v-if="selected" class="sim__action-list">
            <form class="sim__response-form" @submit.prevent="submitResponse">
              <label class="eyebrow" for="containment-order">Your containment order</label>
              <textarea
                id="containment-order"
                v-model="responseDraft"
                class="sim__response-input"
                rows="3"
                maxlength="320"
                placeholder="Describe what you do and why..."
                :disabled="phase !== 'live' || !!decisionFor(selected.inject.id)"
              />
              <CyberButton variant="primary" size="sm" block icon="bolt" type="submit" :disabled="phase !== 'live' || !!decisionFor(selected.inject.id) || !responseDraft.trim()">Submit order</CyberButton>
              <div class="sim__response-hint mono">Write what you would do. Search the guidebook for verified guidance.</div>
            </form>
            <button class="sim__guidebook-toggle" type="button" :aria-expanded="showGuidebook" @click="showGuidebook = !showGuidebook">
              <CyberIcon name="list" :size="15" />
              <span>{{ showGuidebook ? 'Close guidebook' : 'Open response guidebook' }}</span>
              <span class="sim__guidebook-count mono">{{ selected.actions.length }} playbooks</span>
              <CyberIcon :name="showGuidebook ? 'back' : 'arrow'" :size="14" />
            </button>
            <Transition name="guidebook">
              <div v-if="showGuidebook" class="sim__guidebook">
                <div class="sim__guidebook-head">
                  <div>
                    <div class="eyebrow eyebrow--magenta">Field guide · response doctrine</div>
                    <div class="sim__guidebook-title">Search the operator handbook</div>
                  </div>
                  <span class="mono mute">{{ guideResults.length }} entries</span>
                </div>
                <input v-model="guideSearch" class="sim__guidebook-search" type="search" placeholder="Search containment, evidence, MFA..." aria-label="Search response guidebook">
                <div class="sim__guidebook-results">
                  <article v-for="entry in guideResults" :key="entry.id" class="sim__guide-entry">
                    <div class="sim__guide-entry-head">
                      <span class="sim__guide-entry-vector">{{ vectorById(entry.vector).code }}</span>
                      <span class="sim__guide-entry-title">{{ entry.title }}</span>
                    </div>
                    <p class="sim__guide-entry-tip">{{ entry.tip }}</p>
                    <div class="sim__guide-entry-flags">
                      <span v-for="indicator in entry.indicators" :key="indicator">{{ indicator }}</span>
                    </div>
                  </article>
                  <div v-if="!guideResults.length" class="sim__empty mono">// no verified guidance found</div>
                </div>
              </div>
            </Transition>
            <div v-if="decisionFor(selected.inject.id)" class="sim__feedback" :class="`is-${decisionFor(selected.inject.id)!.rating}`">
              {{ selected.actions.find(a => a.id === decisionFor(selected!.inject.id)!.actionId)?.feedback }}
              <span v-if="decisionFor(selected.inject.id)!.speedBonus" class="sim__bonus mono">+10 SPEED</span>
            </div>
          </div>
          <div v-else class="sim__empty mono">// no item selected</div>
        </CyberPanel>
      </aside>

      <!-- BOTTOM: comms -->
      <CyberPanel title="Comms" eyebrow="Bridge channel" accent="none" class="sim__comms">
        <div class="sim__comms-wrap">
          <div class="sim__chat">
            <div v-for="m in chat.slice(-5)" :key="m.id" class="sim__msg" :class="{ 'is-me': m.me }">
              <span class="sim__msg-who">{{ m.who }}<span v-if="m.role" class="mute"> · {{ m.role }}</span></span>
              <span class="sim__msg-text">{{ m.text }}</span>
              <span class="sim__msg-t mono mute">{{ fmtTime(m.t) }}</span>
            </div>
            <div v-if="!chat.length" class="sim__empty mono">// channel quiet</div>
          </div>
          <div class="sim__comms-btns">
            <CyberButton
              v-for="c in COMMS_ACTIONS" :key="c.id" size="sm"
              :variant="comms.some(x => x.id === c.id) ? 'ghost' : 'secondary'"
              :icon="comms.some(x => x.id === c.id) ? 'check' : 'radio'"
              :disabled="phase !== 'live' || comms.some(x => x.id === c.id)" @click="sendComms(c)"
            >{{ c.label }}</CyberButton>
          </div>
          <form class="sim__composer" @submit.prevent="sendFreeform">
            <label class="eyebrow" for="bridge-message">Bridge message</label>
            <div class="sim__composer-row">
              <input
                id="bridge-message"
                v-model="draftMessage"
                class="sim__composer-input"
                type="text"
                maxlength="240"
                placeholder="Send an update to the bridge..."
                :disabled="phase !== 'live'"
              >
              <button class="sim__send" type="submit" :disabled="phase !== 'live' || !draftMessage.trim()" title="Send bridge message">
                <CyberIcon name="arrow" :size="15" />
              </button>
            </div>
          </form>
        </div>
      </CyberPanel>
    </main>

    <!-- ============ START STATE ============ -->
    <div v-if="phase === 'start' || phase === 'countdown'" class="sim__overlay">
      <div v-if="phase === 'start'" class="sim__modal">
        <div class="eyebrow eyebrow--magenta">Ready state</div>
        <h1 class="sim__modal-title">OP: {{ plan.codename }}</h1>
        <p class="dim">{{ plan.schedule.length }} injects across {{ plan.vectors.length }} vectors · {{ fmtTime(plan.duration) }} on the clock.<br>Study the signals. Search verified intel. Issue containment orders.</p>
        <CyberButton variant="primary" size="lg" icon="play" @click="engage">Engage <kbd class="sim__kbd">↵</kbd></CyberButton>
      </div>
      <div v-else class="sim__count glitch" :data-text="countdown">{{ countdown }}</div>
    </div>

    <!-- ============ FINISHED STATE ============ -->
    <div v-if="phase === 'finished' && result" class="sim__overlay">
      <div class="sim__modal sim__modal--done">
        <div class="eyebrow eyebrow--cyan">Incident closed · T+{{ fmtTime(result.elapsed) }}</div>
        <div class="sim__final-grade" :class="`g-${result.grade}`">{{ result.grade }}</div>
        <div class="sim__final-row">
          <StatCard label="Score" :value="result.score" :caption="`of ${result.maxScore}`" accent="cyan" />
          <StatCard label="Accuracy" :value="result.accuracy" unit="%" accent="green" />
          <StatCard label="XP" :value="`+${result.xpEarned}`" accent="magenta" />
        </div>
        <div v-if="result.missed.length" class="sim__missed mono">! {{ result.missed.length }} inject(s) left uncontained when the clock ran out</div>
        <div v-if="result.newBadges.length" class="sim__missed mono neon-magenta">★ {{ result.newBadges.length }} new badge(s) unlocked</div>
        <CyberButton variant="primary" size="lg" icon-right="arrow" to="/results">Debrief</CyberButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sim { height: 100vh; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.sim--flagged::after { content: ''; position: fixed; inset: 0; pointer-events: none; box-shadow: inset 0 0 0 3px var(--c-harmful), inset 0 0 120px rgba(255, 59, 92, .35); animation: blink .5s steps(2) 4; z-index: 30; }

/* top bar */
.sim__top { flex-shrink: 0; height: 64px; display: flex; align-items: center; gap: var(--s-6); padding: 0 var(--s-5); border-bottom: 1px solid var(--c-line); background: rgba(4, 5, 10, .9); }
.sim__exit { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--c-line-strong); color: var(--c-text-dim); }
.sim__exit:hover { color: var(--c-harmful); border-color: var(--c-harmful); }
.sim__op-name { font-family: var(--f-display); font-weight: 700; letter-spacing: .1em; }
.sim__progress { width: 200px; display: flex; flex-direction: column; gap: 4px; }
.sim__progress-track { height: 6px; background: var(--c-bg-3); transform: skewX(-20deg); }
.sim__progress-track div { height: 100%; background: var(--c-ideal); box-shadow: 0 0 8px var(--c-ideal); transition: width .5s var(--ease); }
.sim__vectors { display: flex; gap: var(--s-2); }
.sim__vchip { display: inline-flex; align-items: center; gap: 4px; font-family: var(--f-mono); font-size: 10px; padding: 3px 6px; color: var(--c-text-mute); border: 1px solid var(--c-line); }
.sim__vchip.is-hit { color: var(--c); border-color: var(--c); box-shadow: 0 0 8px color-mix(in srgb, var(--c) 40%, transparent); }
.sim__live { display: flex; align-items: center; gap: 6px; font-size: var(--fs-xs); letter-spacing: .2em; color: var(--c-text-mute); }
.sim__live span { width: 8px; height: 8px; background: currentColor; }
.sim__live.is-on { color: var(--c-harmful); }
.sim__live.is-on span { animation: blink 1s steps(2) infinite; box-shadow: 0 0 8px var(--c-harmful); }

/* flag banner */
.sim__flag { position: absolute; top: 76px; left: 50%; transform: translateX(-50%); z-index: 40; display: flex; gap: var(--s-3); align-items: center; padding: var(--s-3) var(--s-6); background: var(--c-harmful); color: #fff; clip-path: var(--clip-chamfer-sm); box-shadow: var(--glow-red); max-width: 640px; }
.sim__flag-title { font-family: var(--f-display); font-weight: 900; letter-spacing: .14em; font-size: var(--fs-sm); }
.sim__flag-text { font-size: var(--fs-sm); }
.flag-enter-active, .flag-leave-active { transition: all .3s var(--ease); }
.flag-enter-from, .flag-leave-to { opacity: 0; transform: translate(-50%, -20px); }

/* grid */
.sim__grid { flex: 1; min-height: 0; display: grid; gap: var(--s-3); padding: var(--s-3);
  grid-template-columns: 340px 1fr 360px; grid-template-rows: 1fr 190px;
  grid-template-areas: 'feed inbox right' 'feed comms right'; }
.sim__feed { grid-area: feed; }
.sim__inbox { grid-area: inbox; }
.sim__right { grid-area: right; display: flex; flex-direction: column; gap: var(--s-3); min-height: 0; }
.sim__comms { grid-area: comms; }
.sim__feed :deep(.cyber-panel__body), .sim__inbox :deep(.cyber-panel__body) { overflow: hidden; display: flex; flex-direction: column; }
.sim__feed-list { flex: 1; overflow-y: auto; padding: var(--s-3) 0 var(--s-3) var(--s-3); }
.sim__feed-dot { width: 8px; height: 8px; background: var(--c-magenta); box-shadow: 0 0 8px var(--c-magenta); animation: blink 1.2s steps(2) infinite; }
.sim__empty { color: var(--c-text-mute); font-size: var(--fs-xs); padding: var(--s-4); }
.row-enter-from { opacity: 0; transform: translateY(-8px); }
.row-enter-active { transition: all .3s var(--ease); }

/* inbox */
.sim__inbox-wrap { flex: 1; min-height: 0; display: grid; grid-template-columns: 240px 1fr; }
.sim__queue { border-right: 1px solid var(--c-line); overflow-y: auto; display: flex; flex-direction: column; }
.sim__queue-head { padding: var(--s-4) var(--s-4) var(--s-2); }
.sim__qitem { display: grid; grid-template-columns: 16px 1fr auto; gap: var(--s-2); align-items: start; padding: var(--s-3) var(--s-4); background: none; border: 0; border-left: 2px solid transparent; border-bottom: 1px solid var(--c-line); color: var(--c-text-dim); text-align: left; cursor: pointer; font-family: var(--f-ui); animation: slide-in .3s var(--ease); }
.sim__qitem:hover { background: var(--c-bg-2); }
.sim__qitem.is-sel { background: var(--c-bg-3); border-left-color: var(--c-cyan); color: var(--c-text); }
.sim__qitem.is-done { opacity: .55; }
.sim__qitem-main { min-width: 0; }
.sim__qitem-from { font-weight: 700; font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sim__qitem-subj { font-size: 11px; color: var(--c-text-mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sim__qitem-new { width: 8px; height: 8px; margin-top: 6px; background: var(--c-magenta); box-shadow: 0 0 8px var(--c-magenta); animation: blink 1s steps(2) infinite; }
.sim__qitem.sev-crit .sim__qitem-new { background: var(--c-harmful); box-shadow: 0 0 8px var(--c-harmful); }
.sim__detail { padding: var(--s-5) var(--s-6); overflow-y: auto; display: flex; flex-direction: column; gap: var(--s-4); animation: slide-in .3s var(--ease); }
.sim__detail--empty { align-items: center; justify-content: center; color: var(--c-text-mute); gap: var(--s-3); font-size: var(--fs-xs); }
.sim__detail--empty :deep(svg) { animation: spin 6s linear infinite; color: var(--c-line-strong); }
@keyframes spin { to { transform: rotate(360deg); } }
.sim__detail-head { display: flex; align-items: center; gap: var(--s-3); }
.sim__detail-vec { display: inline-flex; align-items: center; gap: 6px; font-family: var(--f-mono); font-size: 11px; color: var(--c); padding: 2px 8px; border: 1px solid var(--c); text-transform: uppercase; letter-spacing: .1em; }
.sim__sev { font-size: 10px; font-weight: 700; padding: 2px 6px; color: var(--c-text-invert); background: var(--c-ok); }
.sim__sev.sev-crit, .sim__sev.sev-high { background: var(--c-harmful); color: #fff; }
.sim__sev.sev-low { background: var(--c-cyan); }
.sim__detail-t { font-size: 10px; letter-spacing: .1em; }
.sim__detail-title { font-size: var(--fs-xl); }

.sim__phone { align-self: flex-start; width: 320px; padding: var(--s-4); background: #0b0b10; border: 2px solid #26263a; border-radius: 28px; box-shadow: 0 0 0 6px #111119, 0 20px 50px rgba(0, 0, 0, .6); }
.sim__phone-bar { display: flex; justify-content: space-between; font-size: 10px; color: var(--c-text-mute); padding: 0 var(--s-2) var(--s-3); }
.sim__phone-from { text-align: center; font-size: var(--fs-sm); font-weight: 700; color: var(--c-text); margin-bottom: var(--s-3); }
.sim__bubble { background: #26262e; color: #f0f0f5; padding: var(--s-3) var(--s-4); border-radius: 18px 18px 18px 4px; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.4; word-break: break-word; }
.sim__phone-time { font-size: 10px; color: var(--c-text-mute); margin-top: var(--s-2); padding-left: var(--s-2); }

.sim__email { border: 1px solid var(--c-line-strong); background: var(--c-bg-2); }
.sim__email-row { padding: var(--s-2) var(--s-4); border-bottom: 1px solid var(--c-line); font-size: var(--fs-sm); display: flex; gap: var(--s-3); }
.sim__email-row .mute { width: 40px; font-family: var(--f-mono); font-size: 11px; }
.sim__email-body { margin: 0; padding: var(--s-4); font-family: var(--f-ui); font-size: var(--fs-sm); color: var(--c-text); white-space: pre-wrap; }
.sim__ticket { border: 1px solid var(--c-line-strong); background: var(--c-bg-2); }
.sim__ticket-head { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-2) var(--s-4); font-size: 11px; color: var(--c-cyan); border-bottom: 1px solid var(--c-line); background: rgba(0, 240, 255, .05); }
.sim__ticket-body { padding: var(--s-4); font-size: var(--fs-sm); }
.sim__meta { display: grid; grid-template-columns: max-content 1fr; gap: 4px var(--s-4); margin: 0; font-family: var(--f-mono); font-size: 12px; }
.sim__meta dt { color: var(--c-text-mute); }
.sim__meta dd { margin: 0; color: var(--c-text); }
.sim__flags { padding: var(--s-3) var(--s-4); border: 1px dashed var(--c-cyan); background: rgba(0, 240, 255, .04); animation: slide-in .3s; }
.sim__flags ul { margin: var(--s-2) 0 0; padding-left: var(--s-5); font-size: var(--fs-sm); color: var(--c-text-dim); }

/* right */
.sim__hud-row { display: flex; align-items: center; gap: var(--s-5); }
.sim__score { display: flex; flex-direction: column; gap: var(--s-2); align-items: flex-start; }
.sim__score-val { font-family: var(--f-display); font-size: 40px; font-weight: 900; line-height: 1; color: var(--c-cyan); text-shadow: var(--text-glow-cyan); font-variant-numeric: tabular-nums; }
.sim__harm { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--c-text-mute); letter-spacing: .1em; text-transform: uppercase; }
.sim__harm.is-bad { color: var(--c-harmful); }
.sim__actions { flex: 1; min-height: 0; }
.sim__actions :deep(.cyber-panel__body) { overflow-y: auto; }
.sim__action-list { display: flex; flex-direction: column; gap: var(--s-2); }
.sim__response-form { display: flex; flex-direction: column; gap: var(--s-2); padding-bottom: var(--s-3); margin-bottom: var(--s-2); border-bottom: 1px solid var(--c-line); }
.sim__response-input { width: 100%; resize: vertical; min-height: 72px; padding: var(--s-3); color: var(--c-text); background: rgba(4, 5, 10, .7); border: 1px solid var(--c-line-strong); font: var(--fs-sm) var(--f-ui); line-height: 1.4; }
.sim__response-input::placeholder { color: var(--c-text-mute); }
.sim__response-input:focus { border-color: var(--c-magenta); box-shadow: 0 0 14px rgba(255, 43, 214, .12); outline: none; }
.sim__response-hint { color: var(--c-text-mute); font-size: 9px; line-height: 1.4; }
.sim__guidebook-toggle { display: flex; align-items: center; gap: var(--s-2); min-height: 38px; padding: 0 var(--s-3); color: var(--c-cyan); background: rgba(0, 240, 255, .05); border: 1px solid var(--c-line-strong); font: 700 var(--fs-xs) var(--f-ui); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
.sim__guidebook-toggle:hover { border-color: var(--c-cyan); background: rgba(0, 240, 255, .1); }
.sim__guidebook-count { margin-left: auto; color: var(--c-text-mute); font-size: 9px; font-weight: 400; letter-spacing: .04em; text-transform: none; }
.sim__guidebook { display: flex; flex-direction: column; gap: var(--s-2); padding: var(--s-3); background: rgba(4, 5, 10, .45); border: 1px solid var(--c-line); border-top: 0; }
.sim__guidebook-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--s-2); padding-bottom: var(--s-2); border-bottom: 1px solid var(--c-line); }
.sim__guidebook-title { margin-top: 2px; color: var(--c-text); font-size: var(--fs-sm); font-weight: 700; }
.sim__guidebook-search { width: 100%; height: 34px; padding: 0 var(--s-3); color: var(--c-text); background: var(--c-bg-2); border: 1px solid var(--c-line-strong); font: var(--fs-xs) var(--f-mono); }
.sim__guidebook-search:focus { border-color: var(--c-magenta); outline: none; box-shadow: 0 0 12px rgba(255, 43, 214, .12); }
.sim__guidebook-results { display: flex; flex-direction: column; gap: var(--s-2); max-height: 340px; overflow-y: auto; }
.sim__guide-entry { padding: var(--s-3); background: rgba(15, 20, 36, .72); border-left: 2px solid var(--c-magenta); }
.sim__guide-entry-head { display: flex; align-items: baseline; gap: var(--s-2); }
.sim__guide-entry-vector { color: var(--c-magenta); font: 700 10px var(--f-mono); letter-spacing: .12em; }
.sim__guide-entry-title { color: var(--c-text); font-size: var(--fs-xs); font-weight: 700; }
.sim__guide-entry-tip { margin-top: var(--s-2); color: var(--c-ideal); font-size: var(--fs-xs); line-height: 1.45; }
.sim__guide-entry-flags { display: flex; flex-direction: column; gap: 2px; margin-top: var(--s-2); color: var(--c-text-dim); font-size: 10px; }
.sim__guide-entry-flags span::before { content: '•'; margin-right: 5px; color: var(--c-yellow); }
.guidebook-enter-active, .guidebook-leave-active { transition: all .2s var(--ease); transform-origin: top; }
.guidebook-enter-from, .guidebook-leave-to { opacity: 0; transform: scaleY(.95); }
.sim__feedback { --c: var(--c-ideal); margin-top: var(--s-2); padding: var(--s-3); font-size: var(--fs-sm); border-left: 3px solid var(--c); background: color-mix(in srgb, var(--c) 8%, transparent); animation: slide-in .3s; }
.sim__feedback.is-ok { --c: var(--c-ok); }
.sim__feedback.is-harmful { --c: var(--c-harmful); }
.sim__bonus { display: inline-block; margin-left: var(--s-2); font-size: 10px; color: var(--c-yellow); }

/* comms */
.sim__comms :deep(.cyber-panel__body) { padding-top: var(--s-3); overflow: hidden; }
.sim__comms-wrap { height: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto 300px; gap: var(--s-4); }
.sim__chat { overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.sim__msg { display: grid; grid-template-columns: 160px 1fr auto; gap: var(--s-3); font-size: var(--fs-sm); animation: slide-in .3s; }
.sim__msg-who { font-weight: 700; color: var(--c-magenta); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sim__msg.is-me .sim__msg-who { color: var(--c-cyan); }
.sim__msg-text { color: var(--c-text-dim); }
.sim__msg-t { font-size: 10px; }
.sim__comms-btns { display: flex; flex-direction: column; gap: var(--s-2); justify-content: center; }
.sim__composer { display: flex; flex-direction: column; justify-content: center; gap: var(--s-2); min-width: 0; }
.sim__composer-row { display: flex; gap: var(--s-2); }
.sim__composer-input { min-width: 0; width: 100%; height: 38px; padding: 0 var(--s-3); color: var(--c-text); background: var(--c-bg-2); border: 1px solid var(--c-line-strong); font: var(--fs-sm) var(--f-ui); }
.sim__composer-input::placeholder { color: var(--c-text-mute); }
.sim__composer-input:focus { border-color: var(--c-cyan); box-shadow: 0 0 12px rgba(0, 240, 255, .12); outline: none; }
.sim__send { flex: 0 0 38px; display: grid; place-items: center; color: var(--c-cyan); background: rgba(0, 240, 255, .08); border: 1px solid var(--c-cyan); cursor: pointer; }
.sim__send:hover:not(:disabled) { background: rgba(0, 240, 255, .2); box-shadow: var(--glow-cyan); }
.sim__send:disabled { color: var(--c-text-mute); border-color: var(--c-line); cursor: not-allowed; }

/* overlays */
.sim__overlay { position: absolute; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(4, 5, 10, .78); backdrop-filter: blur(4px); }
.sim__modal { display: flex; flex-direction: column; align-items: center; gap: var(--s-4); text-align: center; padding: var(--s-10) var(--s-12); background: var(--c-bg-1); border: 1px solid var(--c-cyan); box-shadow: var(--glow-cyan); clip-path: var(--clip-chamfer); max-width: 640px; }
.sim__modal-title { font-size: var(--fs-3xl); color: var(--c-magenta); text-shadow: var(--text-glow-magenta); }
.sim__modal kbd { font-family: var(--f-mono); font-size: 11px; padding: 1px 6px; border: 1px solid var(--c-line-strong); color: var(--c-cyan); }
.sim__kbd { margin-left: var(--s-2); border: 1px solid currentColor; padding: 0 5px; font-size: 11px; }
.sim__count { font-family: var(--f-display); font-size: 180px; font-weight: 900; color: var(--c-cyan); text-shadow: var(--text-glow-cyan); }
.sim__final-grade { font-family: var(--f-display); font-size: 120px; font-weight: 900; line-height: 1; }
.sim__final-row { display: grid; grid-template-columns: repeat(3, 160px); gap: var(--s-3); }
.sim__missed { font-size: var(--fs-xs); color: var(--c-ok); }
.g-S { color: var(--c-magenta); text-shadow: 0 0 30px var(--c-magenta); }
.g-A { color: var(--c-ideal); text-shadow: 0 0 30px var(--c-ideal); }
.g-B { color: var(--c-cyan); text-shadow: 0 0 30px var(--c-cyan); }
.g-C { color: var(--c-ok); text-shadow: 0 0 30px var(--c-ok); }
.g-D { color: var(--c-harmful); text-shadow: 0 0 30px var(--c-harmful); }

@media (max-width: 1180px) {
  .sim__comms-wrap { grid-template-columns: minmax(0, 1fr) auto 240px; }
}

@media (max-width: 900px) {
  .sim__comms-wrap { grid-template-columns: 1fr; gap: var(--s-3); }
  .sim__comms-btns { display: grid; grid-template-columns: repeat(2, 1fr); }
  .sim__composer { justify-content: stretch; }
}
</style>
