import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Key, 
  ShieldCheck, 
  Clock, 
  FileText, 
  FileCode, 
  Check, 
  Eye, 
  EyeOff, 
  Save, 
  AlertTriangle,
  Layers,
  ArrowRight,
  HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DbStatus {
  isConnected: boolean;
  lastError: string | null;
  version: string | null;
  config: {
    host: string;
    port: number;
    user: string;
    database: string;
    ssl: boolean;
    hasPassword: boolean;
  };
  counts: {
    pages: number;
    shortLinks: number;
    subscribers: number;
    banners: number;
    users: number;
  };
}

export default function AdminDatabaseManager({ onRefreshAllData }: { onRefreshAllData?: () => void }) {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit connection states
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [database, setDatabase] = useState('');
  const [ssl, setSsl] = useState(true);

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string; latencyMs?: number } | null>(null);

  // Saving connection state
  const [saving, setSaving] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/db/status');
      if (res.ok) {
        const data: DbStatus = await res.json();
        setStatus(data);
        if (data.config) {
          setHost(data.config.host || '');
          setPort(String(data.config.port || 3306));
          setUser(data.config.user || '');
          setDatabase(data.config.database || '');
          setSsl(data.config.ssl !== false);
        }
      }
    } catch (e) {
      console.warn('Could not fetch DB status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number(port) || 3306,
          user,
          password: password || undefined,
          database,
          ssl
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success(`Connessione riuscita! (${data.latencyMs}ms)`);
      } else {
        toast.error(data.message || 'Test di connessione fallito');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Errore durante il test' });
      toast.error('Errore durante il test di connessione');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim() || !user.trim() || !database.trim()) {
      toast.error('Tutti i campi obbligatori devono essere compilati');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          port: Number(port) || 3306,
          user: user.trim(),
          password: password !== '' ? password : undefined,
          database: database.trim(),
          ssl
        })
      });
      const data = await res.json();
      if (data.status) {
        setStatus(data.status);
      }
      if (data.success) {
        toast.success('Configurazione salvata e connessione attiva!');
      } else {
        toast.error('Configurazione salvata, ma la connessione è in standby');
      }
      fetchStatus();
    } catch (err: any) {
      toast.error(err?.message || 'Errore salvataggio configurazione');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = (format: 'json' | 'sql') => {
    toast.loading(`Generazione backup ${format.toUpperCase()} in corso...`, { id: 'backup-toast' });
    const link = document.createElement('a');
    link.href = `/api/admin/db/backup?format=${format}`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      toast.success(`Backup ${format.toUpperCase()} scaricato!`, { id: 'backup-toast' });
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Seleziona un file di backup valido in formato .json');
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setImportPreview(parsed);
        toast.success('File di backup caricato con successo!');
      } catch (err) {
        toast.error('File JSON non valido o corrotto');
        setImportFile(null);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importPreview) {
      toast.error('Carica prima un file di backup JSON valido');
      return;
    }

    if (importMode === 'replace') {
      const confirmReplace = confirm(
        'ATTENZIONE: La modalità "Sostituzione Totale" cancellerà tutti i dati correnti del database e ripristinerà esclusivamente quelli del file di backup.\n\nSei sicuro di voler proseguire?'
      );
      if (!confirmReplace) return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: importPreview,
          mode: importMode
        })
      });

      if (!res.ok) {
        throw new Error('Errore durante l\'importazione');
      }

      const result = await res.json();
      toast.success(
        `Importazione completata con successo! (${result.counts?.pages || 0} pagine, ${result.counts?.shortLinks || 0} link)`
      );
      setImportFile(null);
      setImportPreview(null);
      fetchStatus();
      if (onRefreshAllData) onRefreshAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Impossibile completare l\'importazione');
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
        Caricamento stato database...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Overview Card */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight">Database MySQL</h2>
                {status?.isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Connesso & Attivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" /> In Connessione / Standby
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl">
                Tutti i dati dell'applicazione sono archiviati sul tuo database relazionale MySQL. Firebase è completamente scollegato.
              </p>
              {status?.version && (
                <div className="text-[11px] text-gray-400 font-mono mt-2">
                  Engine: <span className="text-white font-bold">MySQL {status.version}</span> • DB: <span className="text-white font-bold">{status.config.database}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchStatus}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Aggiorna Stato
            </button>
          </div>
        </div>

        {/* Database Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10 text-center">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{status?.counts.pages ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Pagine Bio</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{status?.counts.shortLinks ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Short Links</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{status?.counts.subscribers ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Iscritti Newsletter</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{status?.counts.banners ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Banner Ad</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
            <div className="text-2xl font-black">{status?.counts.users ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Utenti</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2. Database Backup & Export Card */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-gray-900">Backup del Database</h3>
                <p className="text-xs text-gray-500">Esporta e scarica in sicurezza l'intero archivio dati.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mt-4">
              I file di backup contengono tutte le bio pagine, layout, moduli personalizzati, short links, iscritti newsletter, banner e statistiche analytics.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              {/* JSON Backup Button */}
              <button
                type="button"
                onClick={() => handleDownloadBackup('json')}
                className="p-4 rounded-2xl border-2 border-gray-100 hover:border-black bg-gray-50/50 hover:bg-white text-left transition-all group cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Consigliato</span>
                  </div>
                  <div className="font-bold text-sm text-gray-900">Backup JSON Completo</div>
                  <div className="text-[11px] text-gray-500 mt-1">Compatibile con l'importazione automatica di BioLink Pro.</div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600 group-hover:translate-x-1 transition-transform">
                  Scarica .json <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* SQL Dump Button */}
              <button
                type="button"
                onClick={() => handleDownloadBackup('sql')}
                className="p-4 rounded-2xl border-2 border-gray-100 hover:border-black bg-gray-50/50 hover:bg-white text-left transition-all group cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <FileCode className="w-5 h-5 text-indigo-600" />
                    <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Dump SQL</span>
                  </div>
                  <div className="font-bold text-sm text-gray-900">Dump SQL (MySQL)</div>
                  <div className="text-[11px] text-gray-500 mt-1">Pronto per phpMyAdmin, MySQL Workbench o server esterni.</div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 group-hover:translate-x-1 transition-transform">
                  Scarica .sql <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>I file di backup sono crittografati e compatibili per migrazioni su qualsiasi server.</span>
          </div>
        </div>

        {/* 3. Database Import & Restore Card */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-gray-900">Importa & Ripristina</h3>
                <p className="text-xs text-gray-500">Ripristina un backup precedentemente salvato.</p>
              </div>
            </div>

            {/* File Upload Box */}
            <div className="mt-4">
              <label className="border-2 border-dashed border-gray-300 hover:border-black rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-white text-center">
                <input 
                  type="file" 
                  accept=".json,application/json" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  disabled={isImporting}
                />
                <HardDrive className="w-8 h-8 text-gray-400 mb-2" />
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800">
                  {importFile ? importFile.name : 'Seleziona o trascina file di backup (.json)'}
                </span>
                <span className="text-[11px] text-gray-400 mt-1">Dimensione massima: 50MB</span>
              </label>
            </div>

            {/* Import Preview if Loaded */}
            {importPreview && (
              <div className="mt-4 p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-purple-600" /> Backup Riconosciuto
                  </span>
                  <span className="text-[10px] text-purple-700 font-mono">
                    {importPreview.exportDate ? new Date(importPreview.exportDate).toLocaleDateString() : 'Valido'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-purple-100 font-bold text-purple-900">
                    <div>{importPreview.counts?.pages ?? (Array.isArray(importPreview.tables?.pages) ? importPreview.tables.pages.length : Object.keys(importPreview.pages || {}).length)}</div>
                    <div className="text-[9px] text-gray-400 font-medium uppercase">Pagine</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-purple-100 font-bold text-purple-900">
                    <div>{importPreview.counts?.shortLinks ?? (Array.isArray(importPreview.tables?.shortLinks) ? importPreview.tables.shortLinks.length : Object.keys(importPreview.shortLinks || {}).length)}</div>
                    <div className="text-[9px] text-gray-400 font-medium uppercase">Link</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-purple-100 font-bold text-purple-900">
                    <div>{importPreview.counts?.subscribers ?? (Array.isArray(importPreview.tables?.subscribers) ? importPreview.tables.subscribers.length : (importPreview.subscribers || []).length)}</div>
                    <div className="text-[9px] text-gray-400 font-medium uppercase">Iscritti</div>
                  </div>
                </div>

                {/* Import Mode Radio */}
                <div className="space-y-1.5 pt-2 border-t border-purple-100 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="merge" 
                      checked={importMode === 'merge'} 
                      onChange={() => setImportMode('merge')}
                      className="accent-purple-600"
                    />
                    <span><strong>Unisci & Aggiorna:</strong> Aggiunge i dati senza cancellare i record correnti.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-red-600">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="replace" 
                      checked={importMode === 'replace'} 
                      onChange={() => setImportMode('replace')}
                      className="accent-red-600"
                    />
                    <span><strong>Sostituzione Totale:</strong> Sostituisce completamente tutti i dati correnti.</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={!importPreview || isImporting}
            className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
              importPreview && !isImporting
                ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Ripristino in corso...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Ripristina Database
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Database Connection Settings Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-800 flex items-center justify-center font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-gray-900">
                Gestione Collegamento Database (MySQL)
              </h3>
              <p className="text-xs text-gray-500">
                Visualizza, testa o modifica i parametri di connessione al tuo host MySQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Verifica in corso...' : 'Test Connessione'}</span>
            </button>
          </div>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fadeIn ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{testResult.message}</div>
              {testResult.version && (
                <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                  Versione Server: {testResult.version} • Latenza: {testResult.latencyMs}ms
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSaveConnection} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1.5">
                Host / Endpoint MySQL
              </label>
              <input
                type="text"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="es. mysql-2033062c-paycoppolek-5765.l.aivencloud.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1.5">
                Porta
              </label>
              <input
                type="number"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="14625 o 3306"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1.5">
                Utente Database
              </label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="avnadmin o root"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1.5">
                Nome Database
              </label>
              <input
                type="text"
                value={database}
                onChange={e => setDatabase(e.target.value)}
                placeholder="defaultdb"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ssl}
                onChange={e => setSsl(e.target.checked)}
                className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black accent-black cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Richiedi Connessione Crittografata SSL (TLS)
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salva Configurazione & Riconnetti
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
