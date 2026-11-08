// Current round state (steps + log, never the truth flags).
export default defineEventHandler((event) => toArenaState(getRound(getRouterParam(event, 'id') ?? '')));
