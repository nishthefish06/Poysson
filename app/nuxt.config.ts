// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-11-01',
  devtools: { enabled: true },
  // SPA: the SpacetimeDB websocket only runs in the browser.
  ssr: false,
  // SpacetimeDB's local server already uses :3000
  devServer: { port: 3001 },
  // Bundle the Solana SDK into the server build. Left external, Nitro copies only the hoisted
  // @noble/hashes v2 (from the SpacetimeDB module), but @solana/web3.js needs its nested v1.
  nitro: {
    externals: {
      inline: [
        '@solana/web3.js',
        '@solana/spl-token',
        '@solana/spl-token-metadata',
        '@noble/hashes',
        '@noble/curves',
        'jayson',
      ],
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  // Pages use <CyberInput>, not <UiCyberInput>: register components by file name only.
  components: [{ path: '~/components', pathPrefix: false }],
  app: {
    head: {
      title: 'Poysson',
      link: [
        // .ico for Windows (pinned sites, taskbar, older Edge); PNG for everything else
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          // The faces tokens.css names (--f-display, --f-ui, --f-mono).
          href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap',
        },
      ],
    },
  },
  css: ['~/assets/css/main.css', '~/assets/css/tokens.css', '~/assets/css/base.css'],
  typescript: { strict: true },
  runtimeConfig: {
    // Server-only: AI + Photon run on the Nuxt server, never in the browser.
    // Read from the names in .env.example; in production NUXT_<NAME> env vars override.
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    // alias that always points at the newest Flash model; set GEMINI_MODEL to pin one
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-flash-latest',
    geminiBaseUrl: process.env.GEMINI_BASE_URL ?? '', // only for tests / proxies
    geminiEmbedModel: process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001',
    nvidiaApiKey: process.env.NVIDIA_API_KEY ?? '',
    nvidiaBaseUrl: process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
    nemotronModel: process.env.NEMOTRON_MODEL ?? '',
    nemotronThinking: process.env.NEMOTRON_THINKING ?? '0',
    photonProjectId: process.env.PHOTON_PROJECT_ID ?? '',
    photonProjectSecret: process.env.PHOTON_PROJECT_SECRET ?? '',
    demoPhoneMap: process.env.DEMO_PHONE_MAP ?? '',
    // The server's own SpacetimeDB connection (arena-sync.ts), registered as the agent service.
    spacetimeInternalUrl: process.env.SPACETIME_INTERNAL_URL ?? 'ws://127.0.0.1:3000',
    serviceSecret: process.env.SERVICE_SECRET ?? '',
    // Solana devnet wallet that signs audit-log memo transactions (server-only, never public)
    solanaRpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
    solanaSecretKey: process.env.SOLANA_SECRET_KEY ?? '',
    // public site URL for badge metadata JSON (e.g. https://poysson.app); empty = name/symbol only
    solanaMetadataBaseUrl: process.env.SOLANA_METADATA_BASE_URL ?? '',
    public: {
      // NUXT_PUBLIC_SPACETIME_URL / NUXT_PUBLIC_SPACETIME_DB from .env
      spacetimeUrl: 'ws://127.0.0.1:3000',
      spacetimeDb: 'hackutd2026',
      // NUXT_PUBLIC_DEV_BYPASS_AUTH=1: browse pages without logging in (dev server only)
      devBypassAuth: '',
    },
  },
});
