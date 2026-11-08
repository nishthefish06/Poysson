// Keeps <html data-theme> in sync with the chosen theme.
export default defineNuxtPlugin(() => {
  const { theme } = useTheme()
  watch(theme, t => { document.documentElement.dataset.theme = t }, { immediate: true })
})
