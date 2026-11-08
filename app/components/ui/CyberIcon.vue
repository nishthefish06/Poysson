<script setup lang="ts">
/** Inline stroke icon set (24x24, currentColor). Usage: <CyberIcon name="shield" :size="18" /> */
const props = withDefaults(defineProps<{ name: string; size?: number; stroke?: number }>(), { size: 18, stroke: 1.75 })

const PATHS: Record<string, string> = {
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  terminal: 'M4 5h16v14H4zM7 9l3 3-3 3M12 15h5',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  sms: 'M4 4h16v12H8l-4 4V4zM8 9h8M8 12h5',
  ticket: 'M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4V7zM14 7v10',
  edr: 'M3 4h18v12H3zM8 20h8M12 16v4M7 10l2 2 4-4 4 4',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 018 0v4',
  key: 'M14 10a4 4 0 11-1.2-2.8L21 15v3h-3v-2h-2v-2h-2.2',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  chain: 'M4 7h13l3 3H7zM4 14h13l3 3H7z', // solana-ish
  play: 'M7 4l13 8-13 8V4z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z',
  trophy: 'M8 4h8v5a4 4 0 01-8 0V4zM8 6H4v2a3 3 0 004 3M16 6h4v2a3 3 0 01-4 3M12 13v4M8 21h8M9 17h6v4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  phone: 'M5 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  bug: 'M8 8a4 4 0 018 0v8a4 4 0 01-8 0V8zM4 12h4M16 12h4M5 6l3 2M19 6l-3 2M5 19l3-2M19 19l-3-2M12 8v12',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  radar: 'M12 3l8.5 6.2-3.3 10H6.8L3.5 9.2 12 3zM12 8l4 3-1.5 4.5h-5L8 11l4-3z',
  chip: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  radio: 'M12 14a2 2 0 100-4 2 2 0 000 4zM8 8a6 6 0 000 8M16 8a6 6 0 010 8M5 5a10 10 0 000 14M19 5a10 10 0 010 14',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  crosshair: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 2v5M12 17v5M2 12h5M17 12h5',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  fingerprint: 'M12 11v4c0 2-1 4-2 5M8 12a4 4 0 018 0v2c0 3-.6 5-1.5 7M5 13v-1a7 7 0 0114 0v3M17 20c.5-1 .8-2.5 1-4',
  rewind: 'M11 19L2 12l9-7v14zM22 19l-9-7 9-7v14z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7h.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  shuffle: 'M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
  sidebar: 'M3 4h18v16H3zM9 4v16M5 8h2M5 11h2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1',
  chevron: 'M6 9l6 6 6-6',
  fish: 'M6 12c2.5-3.6 6-5.5 9.5-5.5S20.5 9 22 12c-1.5 3-3.6 5.5-6.5 5.5S8.5 15.6 6 12zM6 12L2 8v8l4-4zM17.5 10.5h.01',
  hook: 'M14 4.5a2 2 0 11-4 0 2 2 0 014 0zM12 6.5v8.5a4 4 0 01-8 0v-3l3 3',
  anchor: 'M12 7a2 2 0 100-4 2 2 0 000 4zM12 7v14M8 10h8M4 13a8 8 0 0016 0M4 13l-1.5 1.5M20 13l1.5 1.5',
  wave: 'M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
}
const d = computed(() => PATHS[props.name] ?? PATHS.info)
</script>

<template>
  <svg
    class="cyber-icon"
    :width="size" :height="size" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" :stroke-width="stroke"
    stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>

<style scoped>
.cyber-icon { flex-shrink: 0; display: inline-block; vertical-align: middle; }
</style>
