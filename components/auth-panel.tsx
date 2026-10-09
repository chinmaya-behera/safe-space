import { useCallback, useEffect, useRef, useState } from 'react';
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in';
import { AuthError, authRequest, type Account, type AccountResponse, type AuthConfig, type AuthMode, type LoginInput, type RegistrationInput } from '@/lib/auth-client';

const showLoginPage = ['/login', '/signup'].includes(window.location.pathname);
const initialMode = window.location.pathname === '/signup' ? 'register' : 'login';

export function AuthPanel() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const [notice, setNotice] = useState('');
  const currentUser = useRef<Account | null>(null);
  const checking = useRef(false);
  const signingOut = useRef(false);
  const mounted = useRef(true);

  const connect = useCallback(async () => {
    setConnecting(true); setConnectionError('');
    try {
      const configPromise = authRequest<AuthConfig>('config');
      const userPromise = showLoginPage ? Promise.resolve(null) : authRequest<AccountResponse>('me').catch((error: unknown) => {
        if (error instanceof AuthError && error.status === 401) return null;
        throw error;
      });
      const [settings, session] = await Promise.all([configPromise, userPromise]);
      if (!mounted.current) return;
      setConfig(settings); setUser(session?.user ?? null);
    } catch {
      if (!mounted.current) return;
      setConfig(null); setConnectionError('Could not reach Safe Space. Check your connection and try again.');
    } finally { if (mounted.current) setConnecting(false); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void connect();
    return () => { mounted.current = false; };
  }, [connect]);

  useEffect(() => {
    currentUser.current = user;
    window.safeSpaceUI.setAccount(user);
    document.title = user ? 'Safe Space' : 'Safe Space · Sign in';
  }, [user]);

  useEffect(() => {
    const signout = document.getElementById('so') as HTMLButtonElement;
    async function logout() {
      if (signingOut.current) return;
      signingOut.current = true; signout.disabled = true;
      try {
        await authRequest('logout', {});
        if (mounted.current) { setUser(null); setNotice('You are signed out.'); }
      } catch { window.safeSpaceUI.showStatus('Could not sign out. Check your connection and try again.'); }
      finally { signingOut.current = false; signout.disabled = false; }
    }
    async function refresh() {
      const account = currentUser.current;
      if (!account || checking.current || signingOut.current) return;
      checking.current = true;
      try {
        const result = await authRequest<AccountResponse>('me');
        if (mounted.current && currentUser.current === account && result.user.id !== account.id) setUser(result.user);
      } catch (error) {
        if (mounted.current && error instanceof AuthError && error.status === 401 && currentUser.current === account) {
          setUser(null); setNotice('Your session ended. Please sign in again.');
        }
      } finally { checking.current = false; }
    }
    signout.addEventListener('click', logout);
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      signout.removeEventListener('click', logout);
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, []);

  async function authenticate(mode: AuthMode, input: LoginInput | RegistrationInput) {
    const result = await authRequest<AccountResponse>(mode, input);
    if (mounted.current) {
      if (showLoginPage) window.history.replaceState(null, '', '/');
      setNotice(''); setUser(result.user);
    }
  }

  if (user) return null;
  return <SignIn1 config={config} connecting={connecting} connectionError={connectionError}
    notice={notice} initialMode={initialMode} onAuthenticate={authenticate} onRetry={() => { void connect(); }} />;
}
