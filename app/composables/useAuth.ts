/**
 * OWNER: Person 1. Keep this interface stable; swap the internals
 * (Spacetime native auth vs SimpleWebAuthn route) without touching pages.
 */
export type AuthStage = 'anon' | 'password_ok' | 'verified'

export const useAuth = () => {
  const stage = useState<AuthStage>('auth-stage', () => 'anon')
  const employeeId = useState<string | null>('auth-employee', () => null)

  async function signIn(_email: string, _password: string) {
    // TODO: call Spacetime sign_in reducer
    stage.value = 'password_ok'
  }
  async function startSecondFactor() {
    // TODO: fetch WebAuthn options from /api/passkey/*
  }
  async function verifySecondFactor() {
    // TODO: verify assertion -> mark_verified
    stage.value = 'verified'
  }
  function signOut() {
    stage.value = 'anon'
    employeeId.value = null
  }

  return { stage, employeeId, signIn, startSecondFactor, verifySecondFactor, signOut }
}