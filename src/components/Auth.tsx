import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from '../lib/auth';
import { 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Infinity, 
  ChevronDown, 
  Loader2, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  AlertCircle,
  KeyRound,
  X
} from 'lucide-react';

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
  const [isLogin, setIsLogin] = useState(true); // Default to login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        if (password.length < 6) {
          setError('La password deve contenere almeno 6 caratteri.');
          setIsLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      const msg = err.message || 'Errore durante l\'autenticazione';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      setError('Inserisci la tua email per reimpostare la password.');
      return;
    }
    if (resetNewPassword && resetNewPassword.length < 6) {
      setError('La nuova password deve contenere almeno 6 caratteri.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await sendPasswordResetEmail(auth, targetEmail, resetNewPassword || undefined);
      if (res.updated && resetNewPassword) {
        // Automatically log in with the new password
        await signInWithEmailAndPassword(auth, targetEmail, resetNewPassword);
        setShowResetModal(false);
      } else {
        setMessage(res.message || `Password aggiornata per ${targetEmail}.`);
        setShowResetModal(false);
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'aggiornamento della password.');
    } finally {
      setIsLoading(false);
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

            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isLogin ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-black'
                }`}
              >
                Accedi
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  !isLogin ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-black'
                }`}
              >
                Crea Account
              </button>
            </div>

            <h2 className="text-3xl font-black tracking-tighter mb-2 text-[#1A1A1A]">
              {isLogin ? 'Bentornato' : 'Inizia ora'}
            </h2>
            <p className="text-gray-500 mb-6 font-medium text-sm">
              {isLogin ? 'Inserisci le tue credenziali per accedere al tuo Bio Site.' : 'Crea il tuo account gratuito in pochi secondi.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-700">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white transition-all text-sm font-medium"
                  placeholder="nome@dominio.com"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-700">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => { setResetEmail(email); setShowResetModal(true); }}
                      className="text-[11px] font-bold text-gray-400 hover:text-black transition-colors"
                    >
                      Password dimenticata?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white transition-all text-sm font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors p-1 cursor-pointer"
                    title={showPassword ? "Nascondi password" : "Mostra password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isLogin && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full">
                      <div className={`h-full flex-1 rounded-full ${strength >= 1 ? (strength === 1 ? 'bg-red-500' : strength === 2 ? 'bg-yellow-500' : 'bg-emerald-500') : 'bg-gray-200'}`} />
                      <div className={`h-full flex-1 rounded-full ${strength >= 2 ? (strength === 2 ? 'bg-yellow-500' : 'bg-emerald-500') : 'bg-gray-200'}`} />
                      <div className={`h-full flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{password.length < 6 ? 'Minimo 6 caratteri richiesti' : 'Lunghezza valida'}</span>
                      <span className="font-bold">{strength <= 1 ? 'Debole' : strength === 2 ? 'Media' : 'Forte'}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200/80 space-y-2">
                  <p className="text-red-700 text-xs font-bold leading-relaxed">{error}</p>
                  {error.toLowerCase().includes('già registrata') && !isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                      className="text-[11px] font-black uppercase tracking-wider text-black bg-white border border-gray-300 hover:border-black px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      → Clicca qui per Accedere con questa email
                    </button>
                  )}
                  {error.toLowerCase().includes('nessun account') && isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                      className="text-[11px] font-black uppercase tracking-wider text-black bg-white border border-gray-300 hover:border-black px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      → Clicca qui per Registrarti gratuitamente
                    </button>
                  )}
                  {error.toLowerCase().includes('password errata') && (
                    <button
                      type="button"
                      onClick={() => { setResetEmail(email); setShowResetModal(true); }}
                      className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      🔑 Reimposta la tua password adesso
                    </button>
                  )}
                </div>
              )}
              {message && <p className="text-green-700 text-xs font-bold bg-green-50 p-3.5 rounded-2xl border border-green-200">{message}</p>}
              
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg shadow-black/10 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isLoading ? 'Elaborazione in corso...' : (isLogin ? 'Accedi al tuo Account' : 'Crea account gratuito')}</span>
              </button>
            </form>


            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col space-y-4 text-center">
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

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-gray-700" />
                </div>
                <h3 className="font-black text-lg tracking-tight">Reimposta Password</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-5">
              Inserisci l'indirizzo email e la nuova password desiderata per aggiornare subito le tue credenziali ed effettuare l'accesso.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-700">Email</label>
                <input 
                  type="email" 
                  value={resetEmail || email}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white text-sm font-medium"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-700">Nuova Password</label>
                <div className="relative">
                  <input 
                    type={showResetNewPassword ? "text" : "password"} 
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-black focus:bg-white text-sm font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors p-1 cursor-pointer"
                  >
                    {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Aggiorna ed Entra</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
