/** World times are ms relative to the round start (negative = before the round). */
export function arenaTime(t: number): string {
  if (t < 0) {
    const min = Math.round(-t / 60_000);
    if (min < 60) return `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} h ago`;
    return `${Math.round(h / 24)} d ago`;
  }
  const s = Math.floor(t / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} into the round`;
}
