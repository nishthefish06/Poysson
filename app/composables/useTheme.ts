/*
 * Visual theme. 'stakes' (High Stakes: dark, cards and kinetic pink) is the default;
 * 'poisson' is the bright cartoon fishing trip. Stored per browser and stamped on
 * <html data-theme="…"> so tokens.css / theme-stakes.css can restyle everything.
 */
import { COPY } from '~/data/copy'

export type ThemeId = 'stakes' | 'poisson'
export const THEMES: { id: ThemeId; label: string; desc: string }[] = [
  { id: 'stakes', label: 'High Stakes', desc: 'Dark table, charged cards, green and gold on brown leather.' },
  { id: 'poisson', label: 'Poisson', desc: 'Bright cartoon sea, hand-drawn boxes, magenta fish.' },
]
const KEY = 'poysson:theme2'

export function useTheme() {
  const theme = useState<ThemeId>('theme', () => {
    if (import.meta.client) {
      try {
        const saved = localStorage.getItem(KEY)
        if (saved === 'stakes' || saved === 'poisson') return saved
      } catch { /* storage blocked */ }
    }
    return 'stakes'
  })
  function setTheme(t: ThemeId) {
    theme.value = t
    try { localStorage.setItem(KEY, t) } catch { /* storage blocked */ }
  }
  const isStakes = computed(() => theme.value === 'stakes')
  return { theme, setTheme, isStakes }
}

/** The current theme's wording. */
export function useCopy() {
  const { theme } = useTheme()
  return computed(() => COPY[theme.value])
}
