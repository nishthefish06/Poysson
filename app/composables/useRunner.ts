// Wraps reducer calls: exposes the server's error message (reducers reject with it) and a busy flag.
export function useRunner() {
  const error = ref('');
  const busy = ref(false);
  async function run(fn: () => Promise<unknown>): Promise<boolean> {
    error.value = '';
    busy.value = true;
    try {
      await fn();
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      busy.value = false;
    }
  }
  return { error, busy, run };
}
