// The token is this browser's SpacetimeDB identity; keeping it keeps the login session across reloads.
const key = (url: string, db: string) => `stdb-token:${url}:${db}`;

export function readToken(url: string, db: string): string | undefined {
  try {
    return localStorage.getItem(key(url, db)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveToken(url: string, db: string, token: string) {
  try {
    localStorage.setItem(key(url, db), token);
  } catch {
    // private mode: the session just won't survive a reload
  }
}

export function forgetToken(url: string, db: string) {
  try {
    localStorage.removeItem(key(url, db));
  } catch {
    // ignore
  }
}

export function fmtTimestamp(ts: { microsSinceUnixEpoch: bigint } | undefined | null): string {
  return ts ? new Date(Number(ts.microsSinceUnixEpoch / 1000n)).toLocaleString() : '';
}
