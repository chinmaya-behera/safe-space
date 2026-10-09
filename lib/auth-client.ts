export interface Account {
  id: string;
  name: string;
  email: string;
  termsVersion: string;
  createdAt: number;
}

export interface AuthConfig {
  termsVersion: string;
  passwordMinLength: number;
  passwordMaxLength: number;
}

export interface Consents {
  peerSupport: boolean;
  emergency: boolean;
  ageAndTerms: boolean;
}

export type AuthMode = 'login' | 'register';
export interface LoginInput { email: string; password: string }
export interface RegistrationInput extends LoginInput {
  name: string;
  termsVersion: string;
  consents: Consents;
}
export interface AccountResponse { user: Account }

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function authRequest<T>(endpoint: string, body?: LoginInput | RegistrationInput | Record<string, never>): Promise<T> {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin', cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Safe-Space': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new AuthError(data.error || 'Please try again.', response.status);
  return data as T;
}

declare global {
  interface Window {
    safeSpaceUI: {
      setAccount(user: Account | null): void;
      showStatus(message: string): void;
      navigate(view: 'help' | 'cope' | 'jour'): void;
      openCoping(id: string): void;
    };
  }
}
