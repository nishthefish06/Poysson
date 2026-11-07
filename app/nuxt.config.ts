// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-11-01',
  devtools: { enabled: true },
  ssr: false, // SPA: Spacetime client runs in the browser
    modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  runtimeConfig: {
    // server-only secrets (read from NUXT_* or mapped below)
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    nvidiaApiKey: process.env.NVIDIA_API_KEY ?? '',
    nvidiaBaseUrl: process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
    nemotronModel: process.env.NEMOTRON_MODEL ?? '',
    photonApiKey: process.env.PHOTON_API_KEY ?? '',
    drillAllowedNumbers: process.env.DRILL_ALLOWED_NUMBERS ?? '',
    spacetimeServiceToken: process.env.SPACETIME_SERVICE_TOKEN ?? '',
    webauthnRpId: process.env.WEBAUTHN_RP_ID ?? 'localhost',
    webauthnOrigin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
    public: {
      // safe for the browser
      spacetimeHost: process.env.SPACETIME_HOST ?? '',
      spacetimeDbName: process.env.SPACETIME_DB_NAME ?? '',
      devBypassAuth: '', // set NUXT_PUBLIC_DEV_BYPASS_AUTH=1 in .env
    },
  },
})
