import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Read the repo-root .env and reuse the Nuxt variable names from .env.example.
  envDir: '..',
  envPrefix: ['VITE_', 'NUXT_PUBLIC_'],
  server: { port: 5173 },
});
