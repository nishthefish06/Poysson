
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T

interface _GlobalComponents {
  GameReportDocument: typeof import("../../components/game/ReportDocument.vue")['default']
  GameSkillRadar: typeof import("../../components/game/SkillRadar.vue")['default']
  GameSolanaVerified: typeof import("../../components/game/SolanaVerified.vue")['default']
  UiActionButton: typeof import("../../components/ui/ActionButton.vue")['default']
  UiCyberBadge: typeof import("../../components/ui/CyberBadge.vue")['default']
  UiCyberButton: typeof import("../../components/ui/CyberButton.vue")['default']
  UiCyberIcon: typeof import("../../components/ui/CyberIcon.vue")['default']
  UiCyberInput: typeof import("../../components/ui/CyberInput.vue")['default']
  UiCyberPanel: typeof import("../../components/ui/CyberPanel.vue")['default']
  UiCyberTimer: typeof import("../../components/ui/CyberTimer.vue")['default']
  UiLogRow: typeof import("../../components/ui/LogRow.vue")['default']
  UiScenarioCard: typeof import("../../components/ui/ScenarioCard.vue")['default']
  UiStatCard: typeof import("../../components/ui/StatCard.vue")['default']
  UiStatusPill: typeof import("../../components/ui/StatusPill.vue")['default']
  UiTabBar: typeof import("../../components/ui/TabBar.vue")['default']
  UiXpBar: typeof import("../../components/ui/XpBar.vue")['default']
  NuxtWelcome: typeof import("../../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../../node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtImg: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  NuxtPage: typeof import("../../../node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyGameReportDocument: LazyComponent<typeof import("../../components/game/ReportDocument.vue")['default']>
  LazyGameSkillRadar: LazyComponent<typeof import("../../components/game/SkillRadar.vue")['default']>
  LazyGameSolanaVerified: LazyComponent<typeof import("../../components/game/SolanaVerified.vue")['default']>
  LazyUiActionButton: LazyComponent<typeof import("../../components/ui/ActionButton.vue")['default']>
  LazyUiCyberBadge: LazyComponent<typeof import("../../components/ui/CyberBadge.vue")['default']>
  LazyUiCyberButton: LazyComponent<typeof import("../../components/ui/CyberButton.vue")['default']>
  LazyUiCyberIcon: LazyComponent<typeof import("../../components/ui/CyberIcon.vue")['default']>
  LazyUiCyberInput: LazyComponent<typeof import("../../components/ui/CyberInput.vue")['default']>
  LazyUiCyberPanel: LazyComponent<typeof import("../../components/ui/CyberPanel.vue")['default']>
  LazyUiCyberTimer: LazyComponent<typeof import("../../components/ui/CyberTimer.vue")['default']>
  LazyUiLogRow: LazyComponent<typeof import("../../components/ui/LogRow.vue")['default']>
  LazyUiScenarioCard: LazyComponent<typeof import("../../components/ui/ScenarioCard.vue")['default']>
  LazyUiStatCard: LazyComponent<typeof import("../../components/ui/StatCard.vue")['default']>
  LazyUiStatusPill: LazyComponent<typeof import("../../components/ui/StatusPill.vue")['default']>
  LazyUiTabBar: LazyComponent<typeof import("../../components/ui/TabBar.vue")['default']>
  LazyUiXpBar: LazyComponent<typeof import("../../components/ui/XpBar.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyNuxtPage: LazyComponent<typeof import("../../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
