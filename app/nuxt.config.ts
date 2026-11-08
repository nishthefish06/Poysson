// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-11-01',
  devtools: { enabled: true },
  // SPA: the SpacetimeDB websocket only runs in the browser.
  ssr: false,
  // SpacetimeDB's local server already uses :3000
  devServer: { port: 3001 },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  runtimeConfig: {
    // Server-only: AI + Photon run on the Nuxt server, never in the browser.
    // Read from the names in .env.example; in production NUXT_<NAME> env vars override.
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    nvidiaApiKey: process.env.NVIDIA_API_KEY ?? '',
    nvidiaBaseUrl: process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
    nemotronModel: process.env.NEMOTRON_MODEL ?? '',
    photonProjectId: process.env.PHOTON_PROJECT_ID ?? '',
    photonProjectSecret: process.env.PHOTON_PROJECT_SECRET ?? '',
    demoPhoneMap: process.env.DEMO_PHONE_MAP ?? '',
    public: {
      // NUXT_PUBLIC_SPACETIME_URL / NUXT_PUBLIC_SPACETIME_DB from .env
      spacetimeUrl: 'ws://127.0.0.1:3000',
      spacetimeDb: 'hackutd2026',
      // NUXT_PUBLIC_DEV_BYPASS_AUTH=1: browse pages without logging in (dev server only)
      devBypassAuth: '',
    },
  },
});
