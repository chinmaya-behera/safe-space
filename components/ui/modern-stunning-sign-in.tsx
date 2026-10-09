"use client";

import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, HeartHandshake, LoaderCircle, ShieldCheck } from 'lucide-react';
import { AuthTerms } from '@/components/ui/auth-terms';
import { AuthError, type AuthConfig, type AuthMode, type Consents, type LoginInput, type RegistrationInput } from '@/lib/auth-client';

interface SignInProps {
  config: AuthConfig | null;
  connecting: boolean;
  connectionError: string;
  notice: string;
  initialMode?: AuthMode;
  onAuthenticate(mode: AuthMode, input: LoginInput | RegistrationInput): Promise<void>;
  onRetry(): void;
}

export function SignIn1({ config, connecting, connectionError, notice, initialMode = 'login', onAuthenticate, onRetry }: SignInProps) {
  const id = useId();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consents, setConsents] = useState<Consents>({ peerSupport: false, emergency: false, ageAndTerms: false });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const signup = mode === 'register';
  const disabled = pending || connecting;

  function switchMode() {
    setMode(signup ? 'login' : 'register');
    setPassword(''); setConfirmation(''); setShowPassword(false); setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !config) return;
    let problem = '';
    if (!email.trim() || !password) problem = 'Please enter both email and password.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) problem = 'Please enter a valid email address.';
    else if (signup && name.trim().length < 2) problem = 'Please enter your name or nickname.';
    else if (signup && password.length < config.passwordMinLength) problem = `Your password needs at least ${config.passwordMinLength} characters.`;
    else if (signup && password !== confirmation) problem = 'Your passwords need to match.';
    else if (signup && !Object.values(consents).every(Boolean)) problem = 'Please accept all three statements to create your account.';
    if (problem) { setError(problem); return; }
    setError(''); setPending(true);
    try {
      const input: LoginInput | RegistrationInput = signup ? {
        name: name.trim(), email: email.trim(), password, consents, termsVersion: config.termsVersion,
      } : { email: email.trim(), password };
      await onAuthenticate(mode, input);
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : 'Could not reach the server. Please check your connection and try again.');
    } finally { setPending(false); }
  }

  return (
    <div className="ss-auth-page relative flex min-h-svh w-full flex-col items-center justify-center px-5 py-10 text-white">
      <section aria-labelledby={`${id}-title`} className="ss-auth-card relative w-full max-w-sm rounded-3xl p-8 sm:p-9">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="ss-auth-logo mb-5 flex h-12 w-12 items-center justify-center rounded-full">
            <HeartHandshake size={25} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <h1 id={`${id}-title`} className="m-0 text-2xl font-semibold tracking-tight">Safe Space</h1>
          <p className="mb-0 mt-2 text-sm text-[#a1a1aa]">{signup ? 'A space to make your own.' : 'A little space, just for you.'}</p>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-3" aria-busy={disabled}>
          {signup ? (
            <div>
              <label htmlFor={`${id}-name`} className="sr-only">Your name or nickname</label>
              <input id={`${id}-name`} className="ss-auth-input w-full" placeholder="Your name or nickname"
                autoComplete="nickname" maxLength={40} value={name} disabled={disabled} required
                onChange={(event) => { setName(event.target.value); setError(''); }} />
            </div>
          ) : null}
          <div>
            <label htmlFor={`${id}-email`} className="sr-only">Email</label>
            <input id={`${id}-email`} className="ss-auth-input w-full" placeholder="Email" type="email"
              autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
              maxLength={254} value={email} disabled={disabled} required aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => { setEmail(event.target.value); setError(''); }} />
          </div>
          <div className="relative">
            <label htmlFor={`${id}-password`} className="sr-only">Password</label>
            <input id={`${id}-password`} className="ss-auth-input ss-auth-password w-full" placeholder="Password"
              type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'}
              maxLength={config?.passwordMaxLength ?? 128} value={password} disabled={disabled} required
              aria-describedby={signup ? `${id}-password-hint` : error ? `${id}-error` : undefined}
              onChange={(event) => { setPassword(event.target.value); setError(''); }} />
            <button type="button" className="ss-auth-eye absolute inset-y-0 right-0 flex w-12 items-center justify-center"
              onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword} disabled={disabled}>
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
          {signup ? (
            <>
              <div>
                <label htmlFor={`${id}-confirm`} className="sr-only">Confirm password</label>
                <input id={`${id}-confirm`} className="ss-auth-input w-full" placeholder="Confirm password"
                  type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength={config?.passwordMaxLength ?? 128}
                  value={confirmation} disabled={disabled} required onChange={(event) => { setConfirmation(event.target.value); setError(''); }} />
                <p id={`${id}-password-hint`} className="mb-0 mt-2 text-xs leading-relaxed text-[#8c8c96]">Use at least {config?.passwordMinLength ?? 12} characters. A long, unique passphrase works well.</p>
              </div>
              <div className="mt-1"><AuthTerms value={consents} onChange={setConsents} disabled={disabled} /></div>
            </>
          ) : null}

          {error || connectionError ? <p id={`${id}-error`} role="alert" className="m-0 text-left text-sm leading-relaxed text-red-300">{error || connectionError}</p> : null}
          {notice && !error ? <p role="status" className="m-0 text-center text-xs text-[#c4c4cc]">{notice}</p> : null}
          <div className="my-2 h-px w-full bg-white/10" />
          <button type="submit" className="ss-auth-submit flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium"
            disabled={disabled || !config}>
            {disabled ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
            {connecting ? 'Connecting…' : pending ? signup ? 'Creating your account…' : 'Signing in…' : signup ? 'Create account' : 'Sign in'}
            {!disabled ? <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" /> : null}
          </button>
          {connectionError ? <button type="button" onClick={onRetry} className="ss-auth-link text-center text-sm">Try connection again</button> : null}
        </form>

        <p className="mb-0 mt-5 text-center text-xs leading-relaxed text-[#8c8c96]">
          {signup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="ss-auth-link" onClick={switchMode} disabled={disabled}>
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <div className="mt-7 flex items-center justify-center gap-1.5 text-[11px] text-[#777780]">
          <ShieldCheck size={13} aria-hidden="true" />
          <span>Your journal stays on this device.</span>
        </div>
      </section>

      <div className="mt-8 text-center">
        <p className="m-0 text-sm text-[#9999a3]">You don't have to figure it all out today.</p>
        <p className="mb-0 mt-2 text-xs text-[#666670]">One small step is enough.</p>
      </div>
      <p className="mb-0 mt-7 text-center text-[11px] leading-relaxed text-[#777780]">Need support right now?{' '}
        <a href="tel:112" className="ss-auth-link">112</a> · <a href="tel:14416" className="ss-auth-link">Tele-MANAS 14416</a>
      </p>
    </div>
  );
}

export default SignIn1;
