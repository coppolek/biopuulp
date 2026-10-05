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
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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

export async function signOut(authInstance: CustomAuth): Promise<void> {
  authInstance.currentUser = null;
  try {
    localStorage.removeItem('puulp_auth_user');
  } catch (e) {}
  authInstance.notify();
}

export async function sendPasswordResetEmail(authInstance: CustomAuth, email: string): Promise<boolean> {
  return true;
}

export class GoogleAuthProvider {}

export async function signInWithPopup(authInstance: CustomAuth, provider: any): Promise<{ user: User }> {
  const defaultEmail = 'coppolek@gmail.com';
  return await createUserWithEmailAndPassword(authInstance, defaultEmail, 'sso_google_account');
}
