/** Blocks every page until the session is fully verified (password + passkey). */
const PUBLIC = new Set(['/login', '/verify', '/passkey/register'])

export default defineNuxtRouteMiddleware((to) => {
  // DEV ONLY: skip auth while pages are being built. Never active in production builds.
  if (import.meta.dev && String(useRuntimeConfig().public.devBypassAuth) === '1') return
  const auth = useAuth()
  if (PUBLIC.has(to.path)) {
    if (to.path !== '/login' && auth.stage.value === 'anon') return navigateTo('/login')
    return
  }
  if (auth.stage.value !== 'verified') return navigateTo('/login')
})
