import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { CheckCircle2, Sparkles, Zap, Infinity, ChevronDown } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-5">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        type="button"
        className="flex w-full items-center justify-between text-left font-bold text-lg hover:text-gray-300 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div 
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <p className="overflow-hidden text-gray-400 text-sm leading-relaxed pr-8">
          {answer}
        </p>
      </div>
    </div>
  );
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false); // Default to register as requested
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
    <div className="flex min-h-screen bg-white">
      {/* Left Side: Landing Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] text-white p-12 flex-col justify-between relative overflow-y-auto">
        <div className="relative z-10">
          <h1 className="text-4xl font-black italic tracking-tighter mb-12">
            PUULP
          </h1>
          
          <div className="mt-20 max-w-lg">
            <h2 className="text-5xl font-black tracking-tighter leading-[1.1] mb-6">
              Il tuo Bio Site.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Completamente gratuito.</span><br/>
              Per sempre.
            </h2>
            <p className="text-xl text-gray-400 mb-12 font-medium">
              Crea un hub illimitato per tutti i tuoi contenuti, link e prodotti. Nessun abbonamento, nessun limite nascosto.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Infinity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Pagine illimitate</h3>
                  <p className="text-gray-400 text-sm">Crea tutte le pagine che vuoi per i tuoi progetti.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Tutte le funzioni premium</h3>
                  <p className="text-gray-400 text-sm">Layout personalizzati, micro-blogging e statistiche incluse.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">100% Gratuito</h3>
                  <p className="text-gray-400 text-sm">Nessuna carta di credito richiesta. Mai.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-24 max-w-lg">
            <h3 className="text-2xl font-black tracking-tight mb-8">Domande Frequenti</h3>
            <div>
              <FAQItem 
                question="Quali sono i vantaggi di BioLink Pro?" 
                answer="BioLink Pro (PUULP) ti permette di avere un'unica pagina elegante per tutti i tuoi contenuti: link, testi, social. È lo strumento definitivo per i creator che vogliono una presenza online professionale e minimalista." 
              />
              <FAQItem 
                question="È davvero gratis al 100%?" 
                answer="Sì. Non ci sono costi nascosti, abbonamenti premium o limiti ai blocchi che puoi inserire. Puoi creare un Bio Site completo e illimitato gratuitamente." 
              />
              <FAQItem 
                question="Posso personalizzare il design?" 
                answer="Assolutamente. Offriamo temi eleganti e minimalisti, font moderni e layout flessibili per far risaltare il tuo brand mantenendo un'estetica pulita." 
              />
              <FAQItem 
                question="Serve saper programmare?" 
                answer="No, il nostro editor visuale è pensato per essere estremamente intuitivo. Trascina i blocchi, scrivi i tuoi testi e pubblica in tempo reale, direttamente dal tuo smartphone o computer." 
              />
            </div>
          </div>
        </div>
        
        <div className="relative z-10 mt-20">
          <div className="flex -space-x-3 mb-4">
            {[...Array(4)].map((_, i) => (
              <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-10 h-10 rounded-full border-2 border-[#1A1A1A]" />
            ))}
          </div>
          <p className="text-sm text-gray-400 font-medium">Unisciti a migliaia di creator che già usano PUULP.</p>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-gray-500 opacity-10 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12 text-center">
             <h1 className="text-4xl font-black italic tracking-tighter mb-4 text-[#1A1A1A]">PUULP</h1>
             <p className="font-bold text-lg">Il tuo Bio Site gratuito, senza limiti.</p>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl border-2 border-gray-100 shadow-xl relative">
            <div className="absolute -top-4 -right-4 bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest rotate-3 flex items-center gap-1 shadow-lg">
              <Sparkles className="w-3 h-3" />
              100% FREE
            </div>

            <h2 className="text-3xl font-black tracking-tighter mb-2 text-[#1A1A1A]">
              {isLogin ? 'Bentornato' : 'Inizia ora'}
            </h2>
            <p className="text-gray-500 mb-8 font-medium">
              {isLogin ? 'Accedi per gestire i tuoi link.' : 'Crea il tuo account gratuito in pochi secondi.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-gray-700">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white transition-all text-sm font-medium"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-gray-700">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white transition-all text-sm font-medium"
                  placeholder="••••••••"
                  required={isLogin ? password.length === 0 : true}
                />
              </div>
              
              {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
              {message && <p className="text-green-600 text-sm font-bold bg-green-50 p-3 rounded-xl">{message}</p>}
              
              <button 
                type="submit"
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/10 mt-2"
              >
                {isLogin ? 'Accedi' : 'Crea account gratuito'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center space-x-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Oppure</span>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full mt-6 py-4 border-2 border-gray-200 bg-white text-black rounded-2xl font-bold text-sm hover:border-black hover:bg-gray-50 transition-all flex justify-center items-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLogin ? 'Accedi con Google' : 'Registrati con Google'}
            </button>

            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col space-y-4 text-center">
              {isLogin && (
                <button 
                  onClick={handleResetPassword}
                  type="button"
                  className="text-sm font-bold text-gray-400 hover:text-black transition-colors"
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
                className="text-sm font-bold text-gray-500 hover:text-black transition-colors"
              >
                {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
                <span className="text-black underline underline-offset-4">{isLogin ? 'Registrati gratis' : 'Accedi'}</span>
              </button>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-400 mt-8">
            Registrandoti accetti i nostri Termini di Servizio e la Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
