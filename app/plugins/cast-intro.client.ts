// Plays the landing intro (Poisson: the fishing cast; High Stakes: the deal) once per browser
// session, the first time you land on the sign-in page. Never after signing in.
// Skipped entirely for prefers-reduced-motion.
const SEEN = 'poysson:intro-seen'

export default defineNuxtPlugin(() => {
  const show = useState<boolean>('castIntro', () => false)
  const router = useRouter()
  router.afterEach((to) => {
    if (to.path !== '/login' || show.value) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let seen = false
    try { seen = sessionStorage.getItem(SEEN) === '1' } catch { /* storage blocked */ }
    if (seen) return
    show.value = true
    try { sessionStorage.setItem(SEEN, '1') } catch { /* storage blocked */ }
  })
})
