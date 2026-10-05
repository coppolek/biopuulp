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
  HardDrive,
  Copy,
  ExternalLink,
  Flame,
  Zap,
  HelpCircle,
  FileArchive
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FullDbStatus {
  activeEngine: 'oracle' | 'mysql';
  isCurrentConnected: boolean;
  oracle: {
    isConnected: boolean;
    lastError: string | null;
    banner: string | null;
    config: {
      user: string;
      host: string;
      port: number;
      serviceName: string;
      connectString: string;
      hasPassword: boolean;
      useWallet: boolean;
      hasWalletFiles: boolean;
      availableServices: string[];
    };
  };
  mysql: {
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
  };
}

export default function AdminDatabaseManager({ onRefreshAllData }: { onRefreshAllData?: () => void }) {
  const [fullStatus, setFullStatus] = useState<FullDbStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEngineTab, setSelectedEngineTab] = useState<'oracle' | 'mysql'>('oracle');

  // --- Oracle States ---
  // Default values matching user's Autonomous Database screenshot: GSHVTNZLD55J0J8L in eu-turin-1
  const [oracleUser, setOracleUser] = useState('ADMIN');
  const [oraclePassword, setOraclePassword] = useState('');
  const [showOraclePassword, setShowOraclePassword] = useState(false);
  const [oracleHost, setOracleHost] = useState('adb.eu-turin-1.oraclecloud.com');
  const [oraclePort, setOraclePort] = useState('1522');
  const [oracleService, setOracleService] = useState('gshvtnzld55j0j8l_tp.adb.oraclecloud.com');
  const [oracleConnectString, setOracleConnectString] = useState('');
  const [oracleMode, setOracleMode] = useState<'tls' | 'wallet'>('tls');
  
  // Wallet upload states
  const [walletFile, setWalletFile] = useState<File | null>(null);
  const [walletPassword, setWalletPassword] = useState('');
  const [isUploadingWallet, setIsUploadingWallet] = useState(false);

  // Oracle test and save
  const [testingOracle, setTestingOracle] = useState(false);
  const [oracleTestResult, setOracleTestResult] = useState<{ success: boolean; message: string; version?: string; latencyMs?: number } | null>(null);
  const [savingOracle, setSavingOracle] = useState(false);
  const [syncingToOracle, setSyncingToOracle] = useState(false);

  const handleConnectStringChange = (val: string) => {
    setOracleConnectString(val);
    const hostMatch = val.match(/host\s*=\s*([a-zA-Z0-9.-]+)/i);
    if (hostMatch) setOracleHost(hostMatch[1]);
    const portMatch = val.match(/port\s*=\s*(\d+)/i);
    if (portMatch) setOraclePort(portMatch[1]);
    const svcMatch = val.match(/service_name\s*=\s*([a-zA-Z0-9._-]+)/i);
    if (svcMatch) setOracleService(svcMatch[1]);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleConnectStringChange(text);
        toast.success('Stringa di connessione incollata ed elaborata!');
      }
    } catch (e) {
      toast.error('Impossibile accedere agli appunti. Incolla manualmente nella casella di testo.');
    }
  };

  // --- MySQL States ---
  const [mysqlHost, setMysqlHost] = useState('');
  const [mysqlPort, setMysqlPort] = useState('3306');
  const [mysqlUser, setMysqlUser] = useState('');
  const [mysqlPassword, setMysqlPassword] = useState('');
  const [showMysqlPassword, setShowMysqlPassword] = useState(false);
  const [mysqlDatabase, setMysqlDatabase] = useState('');
  const [mysqlSsl, setMysqlSsl] = useState(true);
  const [testingMysql, setTestingMysql] = useState(false);
  const [mysqlTestResult, setMysqlTestResult] = useState<{ success: boolean; message: string; version?: string; latencyMs?: number } | null>(null);
  const [savingMysql, setSavingMysql] = useState(false);

  // --- Backup & Import States ---
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/db/status');
      if (res.ok) {
        const data: FullDbStatus = await res.json();
        setFullStatus(data);
        if (data.activeEngine) {
          setSelectedEngineTab(data.activeEngine);
        }

        // Prepopulate Oracle
        if (data.oracle?.config) {
          if (data.oracle.config.user) setOracleUser(data.oracle.config.user);
          if (data.oracle.config.host) setOracleHost(data.oracle.config.host);
          if (data.oracle.config.port) setOraclePort(String(data.oracle.config.port));
          if (data.oracle.config.serviceName) setOracleService(data.oracle.config.serviceName);
          if (data.oracle.config.connectString) setOracleConnectString(data.oracle.config.connectString);
        }

        // Prepopulate MySQL
        if (data.mysql?.config) {
          setMysqlHost(data.mysql.config.host || '');
          setMysqlPort(String(data.mysql.config.port || 3306));
          setMysqlUser(data.mysql.config.user || '');
          setMysqlDatabase(data.mysql.config.database || '');
          setMysqlSsl(data.mysql.config.ssl !== false);
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

  // Switch active engine
  const handleSwitchEngine = async (engine: 'oracle' | 'mysql') => {
    try {
      toast.loading(`Impostazione motore attivo: ${engine === 'oracle' ? 'Oracle' : 'MySQL'}...`, { id: 'engine-switch' });
      const res = await fetch('/api/admin/db/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Motore database attivo impostato su: ${engine.toUpperCase()}`, { id: 'engine-switch' });
        setSelectedEngineTab(engine);
        fetchStatus();
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Errore durante il cambio motore', { id: 'engine-switch' });
    }
  };

  // --- Oracle Actions ---
  const handleTestOracle = async () => {
    if (!oraclePassword) {
      toast.error('Inserisci la password del database Oracle prima di verificare');
      return;
    }
    setTestingOracle(true);
    setOracleTestResult(null);
    try {
      const res = await fetch('/api/admin/db/oracle/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: oracleUser.trim(),
          password: oraclePassword,
          host: oracleHost.trim(),
          port: Number(oraclePort) || 1522,
          serviceName: oracleService.trim(),
          connectString: oracleConnectString.trim() || undefined,
          useWallet: oracleMode === 'wallet',
          walletPassword: walletPassword || undefined
        })
      });
      const data = await res.json();
      setOracleTestResult(data);
      if (data.success) {
        toast.success(`Connessione Oracle riuscita! (${data.latencyMs}ms)`);
      } else {
        toast.error(data.message || 'Test Oracle fallito');
      }
    } catch (err: any) {
      setOracleTestResult({ success: false, message: err?.message || 'Errore di connessione' });
      toast.error('Errore durante il test Oracle');
    } finally {
      setTestingOracle(false);
    }
  };

  const handleSaveOracle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oracleUser.trim() || !oraclePassword) {
      toast.error('Inserisci utente e password del database Oracle');
      return;
    }

    setSavingOracle(true);
    try {
      // 1. Save config
      const res = await fetch('/api/admin/db/oracle/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: oracleUser.trim(),
          password: oraclePassword,
          host: oracleHost.trim(),
          port: Number(oraclePort) || 1522,
          serviceName: oracleService.trim(),
          connectString: oracleConnectString.trim() || undefined,
          useWallet: oracleMode === 'wallet',
          walletPassword: walletPassword || undefined
        })
      });
      const data = await res.json();

      // 2. Set Oracle as active engine
      await fetch('/api/admin/db/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'oracle' })
      });

      if (data.success) {
        toast.success('Oracle Autonomous Database collegato e attivo!');
      } else {
        toast.error('Configurazione salvata, ma la connessione Oracle è in standby');
      }
      fetchStatus();
      if (onRefreshAllData) onRefreshAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Errore salvataggio Oracle');
    } finally {
      setSavingOracle(false);
    }
  };

  const handleUploadWallet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Seleziona un file zip del wallet Oracle valido (es. Wallet_GSHVTNZLD55J0J8L.zip)');
      return;
    }

    setIsUploadingWallet(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        const res = await fetch('/api/admin/db/oracle/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipBase64: base64,
            walletPassword: walletPassword || undefined
          })
        });
        const result = await res.json();
        if (result.success) {
          toast.success(`Wallet Oracle estratto! (${result.files?.length || 0} file caricati)`);
          setOracleMode('wallet');
          if (result.services && result.services.length > 0) {
            setOracleService(result.services[0]);
          }
          fetchStatus();
        } else {
          toast.error(result.error || 'Errore estrazione wallet');
        }
      } catch (err: any) {
        toast.error('Impossibile caricare il wallet: ' + err.message);
      } finally {
        setIsUploadingWallet(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSyncToOracle = async () => {
    const confirmSync = confirm(
      "Vuoi sincronizzare tutti i dati correnti (bio pagine, short links, iscritti newsletter, banner) dentro il tuo Oracle Autonomous Database?"
    );
    if (!confirmSync) return;

    setSyncingToOracle(true);
    try {
      const res = await fetch('/api/admin/db/oracle/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Sincronizzazione completata! (${data.syncedCounts.pages} pagine, ${data.syncedCounts.shortLinks} link copiate su Oracle)`
        );
        fetchStatus();
      } else {
        toast.error(data.message || 'Errore durante la sincronizzazione');
      }
    } catch (err: any) {
      toast.error('Errore durante la sincronizzazione su Oracle');
    } finally {
      setSyncingToOracle(false);
    }
  };

  // --- MySQL Actions ---
  const handleTestMysql = async () => {
    setTestingMysql(true);
    setMysqlTestResult(null);
    try {
      const res = await fetch('/api/admin/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: mysqlHost,
          port: Number(mysqlPort) || 3306,
          user: mysqlUser,
          password: mysqlPassword || undefined,
          database: mysqlDatabase,
          ssl: mysqlSsl
        })
      });
      const data = await res.json();
      setMysqlTestResult(data);
      if (data.success) {
        toast.success(`Connessione MySQL riuscita! (${data.latencyMs}ms)`);
      } else {
        toast.error(data.message || 'Test MySQL fallito');
      }
    } catch (err: any) {
      setMysqlTestResult({ success: false, message: err?.message || 'Errore' });
      toast.error('Errore durante il test MySQL');
    } finally {
      setTestingMysql(false);
    }
  };

  const handleSaveMysql = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMysql(true);
    try {
      const res = await fetch('/api/admin/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: mysqlHost.trim(),
          port: Number(mysqlPort) || 3306,
          user: mysqlUser.trim(),
          password: mysqlPassword !== '' ? mysqlPassword : undefined,
          database: mysqlDatabase.trim(),
          ssl: mysqlSsl
        })
      });
      await fetch('/api/admin/db/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'mysql' })
      });
      toast.success('Configurazione MySQL salvata e impostata come attiva!');
      fetchStatus();
      if (onRefreshAllData) onRefreshAllData();
    } catch (err: any) {
      toast.error('Errore salvataggio MySQL');
    } finally {
      setSavingMysql(false);
    }
  };

  // --- Backup & Import ---
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
        toast.error('File JSON non valido');
        setImportFile(null);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    if (importMode === 'replace') {
      const confirmReplace = confirm(
        'ATTENZIONE: La modalità "Sostituzione Totale" cancellerà tutti i dati correnti del database.\n\nSei sicuro di voler proseguire?'
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

      if (!res.ok) throw new Error('Errore durante l\'importazione');

      const result = await res.json();
      toast.success(
        `Importazione completata con successo! (${result.counts?.pages || 0} pagine, ${result.counts?.shortLinks || 0} link)`
      );
      setImportFile(null);
      setImportPreview(null);
      fetchStatus();
      if (onRefreshAllData) onRefreshAllData();
    } catch (err: any) {
      toast.error(err?.message || 'Errore importazione');
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

  const isOracleActive = fullStatus?.activeEngine === 'oracle';
  const isConnected = fullStatus?.isCurrentConnected;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Database Status Header */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
              isOracleActive ? 'bg-gradient-to-tr from-red-600 to-orange-600' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
            }`}>
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight">
                  {isOracleActive ? 'Oracle Autonomous AI Database' : 'MySQL Database'}
                </h2>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Attivo & Connesso
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> In Connessione / Standby
                  </span>
                )}
                <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-white/10 text-white/90">
                  {fullStatus?.activeEngine.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl">
                {isOracleActive 
                  ? 'Connesso all\'istanza Always Free di Oracle Cloud Infrastructure (OCI). Firebase è disattivato.'
                  : 'Database MySQL attivo. Puoi passare ad Oracle Cloud con un clic qui sotto.'}
              </p>
              {isOracleActive && fullStatus?.oracle.banner && (
                <div className="text-[11px] text-gray-400 font-mono mt-2 truncate max-w-xl">
                  {fullStatus.oracle.banner}
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
            <div className="text-2xl font-black">{fullStatus?.mysql.counts.pages ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Pagine Bio</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{fullStatus?.mysql.counts.shortLinks ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Short Links</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{fullStatus?.mysql.counts.subscribers ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Iscritti Newsletter</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="text-2xl font-black">{fullStatus?.mysql.counts.banners ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Banner Ad</div>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
            <div className="text-2xl font-black">{fullStatus?.mysql.counts.users ?? 0}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Utenti</div>
          </div>
        </div>
      </div>

      {/* 2. Engine Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedEngineTab('oracle')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              selectedEngineTab === 'oracle'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Flame className="w-4 h-4 text-white" />
            <span>Oracle Autonomous Database</span>
            {fullStatus?.activeEngine === 'oracle' && (
              <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">Attivo</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectedEngineTab('mysql')}
            className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              selectedEngineTab === 'mysql'
                ? 'bg-black text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>MySQL / MariaDB</span>
            {fullStatus?.activeEngine === 'mysql' && (
              <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">Attivo</span>
            )}
          </button>
        </div>

        {fullStatus?.activeEngine !== selectedEngineTab && (
          <button
            type="button"
            onClick={() => handleSwitchEngine(selectedEngineTab)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" /> Imposta {selectedEngineTab === 'oracle' ? 'Oracle' : 'MySQL'} come Predefinito
          </button>
        )}
      </div>

      {/* 3. Oracle Database Settings Section */}
      {selectedEngineTab === 'oracle' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-red-100 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  Collegamento Oracle Autonomous Database
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-red-100 text-red-800 rounded-md">GSHVTNZLD55J0J8L (eu-turin-1)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configura l'accesso alla tua istanza Always Free ospitata su Oracle Cloud Infrastructure (Torino).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestOracle}
                disabled={testingOracle}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 border border-red-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingOracle ? 'animate-spin' : ''}`} />
                <span>{testingOracle ? 'Verifica...' : 'Test Connessione'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncToOracle}
                disabled={syncingToOracle}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                title="Copia tutte le bio pagine, link e iscritti attuali su Oracle"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{syncingToOracle ? 'Copia in corso...' : 'Copia Dati su Oracle'}</span>
              </button>
            </div>
          </div>

          {/* Guided Help Box based on the user's screenshot */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2 text-amber-950">
            <div className="font-bold flex items-center gap-1.5 text-amber-900 uppercase tracking-wide text-[11px]">
              <HelpCircle className="w-4 h-4 text-amber-600" /> Come ottenere le credenziali dalla tua schermata OCI:
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700 text-[11px] leading-relaxed">
              <li>
                Nella schermata di Oracle Cloud visibile nel tuo screenshot, clicca sul pulsante in alto a destra <strong>"Connessione al database"</strong>.
              </li>
              <li>
                <strong>Metodo Rapido TLS (Senza Wallet):</strong> Seleziona il tipo di autenticazione <em>"TLS"</em> e copia la stringa di connessione (oppure usa i parametri già precompilati qui sotto inserendo la tua password).
              </li>
              <li>
                <strong>Metodo Wallet (mTLS):</strong> Clicca su <em>"Scarica wallet"</em> per ottenere il file <code>Wallet_GSHVTNZLD55J0J8L.zip</code> e trascinalo nel box sottostante.
              </li>
              <li>
                L'utente predefinito è <strong>ADMIN</strong> e la password è quella scelta al momento della creazione dell'Autonomous Database su OCI.
              </li>
            </ol>
          </div>

          {/* Test Result Banner */}
          {oracleTestResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fadeIn ${
              oracleTestResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              {oracleTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">{oracleTestResult.message}</div>
                {oracleTestResult.version && (
                  <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                    {oracleTestResult.version} • Latenza: {oracleTestResult.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connection Mode Selection */}
          <div className="flex items-center gap-3 pt-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Modalità:</span>
            <button
              type="button"
              onClick={() => setOracleMode('tls')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                oracleMode === 'tls' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Connessione Diretta TLS / TNS
            </button>
            <button
              type="button"
              onClick={() => setOracleMode('wallet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                oracleMode === 'wallet' 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Carica Wallet Zip (mTLS)
            </button>
          </div>

          {/* Wallet Upload Area if Wallet Mode Selected */}
          {oracleMode === 'wallet' && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
              <label className="border-2 border-dashed border-gray-300 hover:border-black rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white text-center">
                <input 
                  type="file" 
                  accept=".zip,application/zip" 
                  onChange={handleUploadWallet} 
                  className="hidden" 
                  disabled={isUploadingWallet}
                />
                <FileArchive className="w-8 h-8 text-red-500 mb-1" />
                <span className="font-bold text-xs uppercase tracking-wider text-gray-800">
                  {fullStatus?.oracle.config.hasWalletFiles ? 'Wallet OCI installato nel server (clicca per sostituire)' : 'Carica Wallet_GSHVTNZLD55J0J8L.zip'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Scaricato da "Connessione al database" di OCI</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                    Password Wallet (opzionale, se impostata al download)
                  </label>
                  <input
                    type="password"
                    value={walletPassword}
                    onChange={e => setWalletPassword(e.target.value)}
                    placeholder="Password del file zip del wallet"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                {fullStatus?.oracle.config.availableServices && fullStatus.oracle.config.availableServices.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                      Servizio Rilevato nel Wallet
                    </label>
                    <select
                      value={oracleService}
                      onChange={e => setOracleService(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none"
                    >
                      {fullStatus.oracle.config.availableServices.map(svc => (
                        <option key={svc} value={svc}>{svc}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Oracle Form */}
          <form onSubmit={handleSaveOracle} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Utente Database Oracle
                </label>
                <input
                  type="text"
                  value={oracleUser}
                  onChange={e => setOracleUser(e.target.value)}
                  placeholder="ADMIN"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Password Database (scelta alla creazione su OCI)
                </label>
                <div className="relative">
                  <input
                    type={showOraclePassword ? 'text' : 'password'}
                    value={oraclePassword}
                    onChange={e => setOraclePassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    required={!fullStatus?.oracle.config.hasPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOraclePassword(!showOraclePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showOraclePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Host / Endpoint Oracle Autonomous DB
                </label>
                <input
                  type="text"
                  value={oracleHost}
                  onChange={e => setOracleHost(e.target.value)}
                  placeholder="adb.eu-turin-1.oraclecloud.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Porta TCPS
                </label>
                <input
                  type="number"
                  value={oraclePort}
                  onChange={e => setOraclePort(e.target.value)}
                  placeholder="1522"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-red-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                Nome Servizio Oracle (Service Name)
              </label>
              <input
                type="text"
                value={oracleService}
                onChange={e => setOracleService(e.target.value)}
                placeholder="gshvtnzld55j0j8l_tp.adb.oraclecloud.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-red-600"
                required
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Profili disponibili: <code>_tp</code> (Transaction Processing, consigliato), <code>_high</code>, <code>_medium</code>, <code>_low</code>.
              </span>
            </div>

            <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-800">
                  Stringa di Connessione Completa TNS (da "Connessione al database" su OCI)
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1 bg-white border border-gray-200 hover:border-black rounded-lg text-[10px] font-bold text-gray-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <Copy className="w-3 h-3" /> Incolla dagli Appunti
                </button>
              </div>
              <textarea
                value={oracleConnectString}
                onChange={e => handleConnectStringChange(e.target.value)}
                placeholder="(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.eu-turin-1.oraclecloud.com))(connect_data=(service_name=...))...)"
                rows={3}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Incolla qui la stringa copiata da Oracle Cloud: i campi Host, Porta e Servizio verranno estratti e compilati automaticamente!
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Connessione crittografata TCPS / mTLS con SSL Server DN match.
              </div>

              <button
                type="submit"
                disabled={savingOracle}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {savingOracle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Connessione ad Oracle...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salva & Connetti ad Oracle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. MySQL Settings Section */}
      {selectedEngineTab === 'mysql' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-800 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-gray-900">
                  Gestione Database MySQL
                </h3>
                <p className="text-xs text-gray-500">
                  Parametri per server MySQL / MariaDB (Aiven, RDS o locale).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestMysql}
                disabled={testingMysql}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingMysql ? 'animate-spin' : ''}`} />
                <span>{testingMysql ? 'Verifica...' : 'Test Connessione'}</span>
              </button>
            </div>
          </div>

          {mysqlTestResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fadeIn ${
              mysqlTestResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              {mysqlTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">{mysqlTestResult.message}</div>
                {mysqlTestResult.version && (
                  <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                    Versione: {mysqlTestResult.version} • Latenza: {mysqlTestResult.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveMysql} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Host MySQL
                </label>
                <input
                  type="text"
                  value={mysqlHost}
                  onChange={e => setHost(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Porta
                </label>
                <input
                  type="number"
                  value={mysqlPort}
                  onChange={e => setMysqlPort(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Utente
                </label>
                <input
                  type="text"
                  value={mysqlUser}
                  onChange={e => setMysqlUser(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showMysqlPassword ? 'text' : 'password'}
                    value={mysqlPassword}
                    onChange={e => setMysqlPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMysqlPassword(!showMysqlPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showMysqlPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-700 mb-1">
                  Nome Database
                </label>
                <input
                  type="text"
                  value={mysqlDatabase}
                  onChange={e => setMysqlDatabase(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingMysql}
                className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Salva & Riconnetti a MySQL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Backup & Restore Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Backup Card */}
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
                  <div className="font-bold text-sm text-gray-900">Dump SQL (MySQL/Oracle)</div>
                  <div className="text-[11px] text-gray-500 mt-1">Script DDL e DML pronto per phpMyAdmin o SQL Developer.</div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 group-hover:translate-x-1 transition-transform">
                  Scarica .sql <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>I file di backup sono sicuri e compatibili con qualsiasi motore database.</span>
          </div>
        </div>

        {/* Import & Restore Card */}
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
    </div>
  );
}
