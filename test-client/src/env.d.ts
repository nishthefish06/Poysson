/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NUXT_PUBLIC_SPACETIME_URL?: string;
  readonly NUXT_PUBLIC_SPACETIME_DB?: string;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
