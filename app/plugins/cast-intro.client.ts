// Plays the "let's go phishing" cast animation on the way into the dashboard:
// right after signing in, and on the first dashboard visit of a browser session.
const AUTH_PAGES = new Set(['/login', '/verify', '/passkey', '/enroll'])
const SEEN = 'poysson:cast-seen'

export default defineNuxtPlugin(() => {
  const show = useState<boolean>('castIntro', () => false)
  const router = useRouter()
  router.afterEach((to, from) => {
    if (to.path !== '/dashboard') return
    let seen = false
    try { seen = sessionStorage.getItem(SEEN) === '1' } catch { /* storage blocked */ }
    if (AUTH_PAGES.has(from.path) || !seen) {
      show.value = true
      try { sessionStorage.setItem(SEEN, '1') } catch { /* storage blocked */ }
    }
  })
})
