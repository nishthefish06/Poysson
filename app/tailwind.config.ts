import type { Config } from 'tailwindcss';

/** OWNER: UI person. Cyberpunk design tokens: tweak the values, keep the names. */
export default {
  theme: {
    extend: {
      colors: {
        // Matched to the fishing theme in assets/css/tokens.css (paper cards, ink text, sea blue, magenta).
        bg: '#fff9ee',
        panel: '#fff3dc',
        line: '#c9cfdd',
        neon: { cyan: '#0a8ad6', pink: '#e20074', lime: '#11a150' },
        verdict: { ideal: '#11a150', ok: '#d97800', neutral: '#7a8bab', harmful: '#e0243f' },
      },
      fontFamily: { mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
    },
  },
} satisfies Partial<Config>;
