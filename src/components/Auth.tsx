import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Credenziali non valide. Assicurati che la password sia corretta.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError("L'email fornita è già in uso. Prova ad accedere o resetta la password.");
      } else {
        setError(err.message);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Inserisci la tua email per reimpostare la password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Ti abbiamo inviato un\'email per reimpostare la password!');
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl border-2 border-black shadow-lg">
        <h2 className="text-3xl font-black italic tracking-tighter mb-6 text-center">
          PUULP
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all"
              required={isLogin ? password.length === 0 : true} // if login, might not need if they just want to reset
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          {message && <p className="text-green-600 text-xs font-bold">{message}</p>}
          <button 
            type="submit"
            className="w-full py-4 border-2 border-black bg-black text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-transparent hover:text-black transition-all"
          >
            {isLogin ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Oppure</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="w-full mt-4 py-4 border-2 border-gray-200 bg-white text-black rounded-full font-black uppercase tracking-widest text-xs hover:border-black transition-all flex justify-center items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Accedi con Google
        </button>

        <div className="mt-6 flex flex-col space-y-3 text-center">
          {isLogin && (
            <button 
              onClick={handleResetPassword}
              type="button"
              className="text-xs font-bold text-gray-500 hover:text-black"
            >
              Password dimenticata?
            </button>
          )}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            type="button"
            className="text-xs font-bold text-gray-500 hover:text-black"
          >
            {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </div>
    </div>
  );
}
