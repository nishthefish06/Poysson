import type { RunResult } from '~/composables/useGame'

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'neon'
export interface BadgeDef {
  id: string
  name: string
  desc: string
  icon: string
  tier: BadgeTier
  /** awarded at the end of a run when this returns true */
  earned?: (run: RunResult) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first-blood', name: 'First Contact', desc: 'Complete your first incident.', icon: 'bolt', tier: 'bronze', earned: () => true },
  { id: 'clean-sweep', name: 'Clean Sweep', desc: 'Finish an incident with zero harmful actions.', icon: 'shield', tier: 'silver', earned: r => r.decisions.length > 0 && r.decisions.every(d => d.rating !== 'harmful') },
  { id: 'flawless', name: 'Flawless Op', desc: 'Every response ideal.', icon: 'star', tier: 'gold', earned: r => r.decisions.length >= 3 && r.decisions.every(d => d.rating === 'ideal') },
  { id: 'quickdraw', name: 'Quickdraw', desc: 'Average response under 10 seconds.', icon: 'clock', tier: 'silver', earned: r => r.decisions.length > 0 && r.decisions.reduce((a, d) => a + (d.at - d.arrivedAt), 0) / r.decisions.length < 10 },
  { id: 'full-spectrum', name: 'Full Spectrum', desc: 'Clear a run with all five vectors armed.', icon: 'radar', tier: 'gold', earned: r => r.vectors.length === 5 && r.missed.length === 0 },
  { id: 'netrunner', name: 'Netrunner', desc: 'Score A or better on Netrunner difficulty.', icon: 'chip', tier: 'neon', earned: r => r.difficulty === 'netrunner' && ['S', 'A'].includes(r.grade) },
  { id: 'comms-officer', name: 'Comms Officer', desc: 'Use every comms broadcast in a single run.', icon: 'radio', tier: 'bronze', earned: r => r.comms.length >= 3 },
  { id: 'streak-7', name: 'On The Grid', desc: 'Keep a 7-day training streak.', icon: 'flame', tier: 'silver' },
  { id: 'chain-anchor', name: 'On-Chain', desc: 'Have a report anchored to Solana.', icon: 'chain', tier: 'bronze' },
]

export const badgeById = (id: string) => BADGES.find(b => b.id === id)
