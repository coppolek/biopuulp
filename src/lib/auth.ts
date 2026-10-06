export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

type AuthCallback = (user: User | null) => void;

class CustomAuth {
  currentUser: User | null = null;
  listeners: AuthCallback[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem('puulp_auth_user');
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch (e) {}

    // Multi-tab synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'puulp_auth_user') {
          try {
            this.currentUser = e.newValue ? JSON.parse(e.newValue) : null;
            this.notify();
          } catch (err) {}
        }
      });
    }
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (err) {
        console.warn('Auth callback error:', err);
      }
    });
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    try {
      localStorage.removeItem('puulp_auth_user');
    } catch (e) {}
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.notify();
  }
}

export const auth = new CustomAuth();

export function onAuthStateChanged(authInstance: CustomAuth, callback: AuthCallback) {
  authInstance.listeners.push(callback);
  // initial invoke
  setTimeout(() => callback(authInstance.currentUser), 0);
  return () => {
    authInstance.listeners = authInstance.listeners.filter(cb => cb !== callback);
  };
}

export async function signInWithEmailAndPassword(authInstance: CustomAuth, email: string, password: string): Promise<{ user: User }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Credenziali non valide');
  }
  authInstance.currentUser = data.user;
  try {
    localStorage.setItem('puulp_auth_user', JSON.stringify(data.user));
  } catch (e) {}
  authInstance.notify();
  return { user: data.user };
}

export async function createUserWithEmailAndPassword(authInstance: CustomAuth, email: string, password: string): Promise<{ user: User }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Errore durante la registrazione');
  }
  authInstance.currentUser = data.user;
  try {
    localStorage.setItem('puulp_auth_user', JSON.stringify(data.user));
  } catch (e) {}
  authInstance.notify();
  return { user: data.user };
}

export async function signOut(authInstance: CustomAuth = auth): Promise<void> {
  return authInstance.signOut();
}

export async function sendPasswordResetEmail(authInstance: CustomAuth, email: string, newPassword?: string): Promise<{ success: boolean; message: string; updated?: boolean }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, newPassword })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Errore durante la richiesta di reset password');
  }
  return data;
}

export class GoogleAuthProvider {}

export async function signInWithPopup(authInstance: CustomAuth, provider?: any): Promise<{ user: User }> {
  const defaultEmail = 'coppolek@gmail.com';
  return await signInWithEmailAndPassword(authInstance, defaultEmail, 'sso_google_account');
}
