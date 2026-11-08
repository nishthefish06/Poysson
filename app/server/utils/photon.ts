/**
 * OWNER: Person 4. Photon sends (e.g. a smishing drill text to a teammate's phone in the demo).
 * Safety: only numbers in DEMO_PHONE_MAP (consenting teammates) can be contacted; every
 * message is labeled as a drill.
 */

/** DEMO_PHONE_MAP="demo-phone-1=+15551234567,demo-phone-2=+15557654321" */
export function resolveDemoPhone(ref: string): string {
  const map = new Map(
    useRuntimeConfig()
      .demoPhoneMap.split(',')
      .map((pair) => pair.split('=').map((s) => s.trim()))
      .filter((kv): kv is [string, string] => kv.length === 2 && !!kv[0] && !!kv[1])
  );
  const phone = map.get(ref);
  if (!phone) throw createError({ statusCode: 403, statusMessage: 'Not a consenting demo phone' });
  return phone;
}

export async function sendDrillSms(to: string, text: string): Promise<{ queued: boolean }> {
  void to;
  void `[poysson.fishing DRILL] ${text}`;
  // TODO: Photon API call (runtimeConfig.photonProjectId / photonProjectSecret)
  return { queued: false };
}
