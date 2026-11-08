// Session state, written by <SessionGate> (which owns the subscriptions) and read anywhere.
export interface SessionAccount {
  id: bigint;
  email: string;
  displayName: string;
  role: string; // 'employee' | 'admin'
  phone: string;
  totpEnabled: boolean;
  isDemo: boolean;
}

export type LoginStage = 'totp' | 'enroll' | null;

export const useSession = () => {
  const account = useState<SessionAccount | null>('session-account', () => null);
  const loginStage = useState<LoginStage>('session-login-stage', () => null);
  const loginEmail = useState<string>('session-login-email', () => '');
  const ready = useState<boolean>('session-ready', () => false);
  const isAdmin = computed(() => account.value?.role === 'admin');
  return { account, loginStage, loginEmail, ready, isAdmin };
};
