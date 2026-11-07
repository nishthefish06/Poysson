import { ref } from 'vue';

// 127.0.0.1, not localhost: `spacetime start` listens on IPv4 only, and localhost may resolve to ::1.
export const SPACETIME_URL: string = import.meta.env.NUXT_PUBLIC_SPACETIME_URL ?? 'ws://127.0.0.1:3000';
export const SPACETIME_DB: string = import.meta.env.NUXT_PUBLIC_SPACETIME_DB ?? 'hackutd2026';

// The token is the browser's SpacetimeDB identity; keeping it keeps the login session.
export const TOKEN_KEY = `stdb-token:${SPACETIME_URL}:${SPACETIME_DB}`;

export const APP_LABEL = 'HackUTD Training';

export function readToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode: the session just won't survive a reload
  }
}

// Drop the stored identity and reload: behaves like a brand-new browser.
export function resetIdentity() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  location.reload();
}

export function fmt(ts: { microsSinceUnixEpoch: bigint } | undefined): string {
  return ts ? new Date(Number(ts.microsSinceUnixEpoch / 1000n)).toLocaleString() : '';
}

// Wraps reducer calls so each panel can show the server's error message or a success note.
export function useRunner() {
  const error = ref('');
  const ok = ref('');
  async function run(label: string, fn: () => Promise<unknown>) {
    error.value = '';
    ok.value = '';
    try {
      await fn();
      ok.value = label;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
  }
  return { error, ok, run };
}
