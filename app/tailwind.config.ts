import type { Config } from 'tailwindcss';

/** OWNER: UI person. Cyberpunk design tokens: tweak the values, keep the names. */
export default {
  theme: {
    extend: {
      colors: {
        bg: '#07070d',
        panel: '#11111c',
        line: '#24243a',
        neon: { cyan: '#00f0ff', pink: '#ff2bd6', lime: '#b6ff3b' },
        verdict: { ideal: '#22e58b', ok: '#7dd3fc', neutral: '#a3a3a3', harmful: '#ff4d6d' },
      },
      fontFamily: { mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
    },
  },
} satisfies Partial<Config>;
