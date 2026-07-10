import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster, toast } from 'react-hot-toast';
import { Copy, Files } from 'lucide-react';
import PublicBioPage from './components/PublicBioPage';
import EditorDashboard from './components/EditorDashboard';
import Auth from './components/Auth';
import PublicView from './components/PublicView';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserPages, createNewPage, savePage, getAllPages, deletePage, getAllBanners, saveBanner, deleteBanner } from './lib/db';
import { BioPage, AppBanner } from './types';

export default function App() {
  return (
    <HelmetProvider>
      <Toaster position="bottom-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppDashboard />} />
          <Route path="/:slug" element={<PublicView />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}

function AppDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'editor' | 'admin'>('dashboard');
  const [pages, setPages] = useState<BioPage[]>([]);
  const [currentPage, setCurrentPage] = useState<BioPage | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userPages = await getUserPages(user.uid);
        setPages(userPages);
      } else {
        setPages([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePage = async (slug: string) => {
    if (!user || !slug) return;
    const newPage = await createNewPage(user.uid, slug);
    setPages([...pages, newPage]);
  };

  const handleEditPage = (page: BioPage) => {
    setCurrentPage(page);
    setView('editor');
  };

  
  const handleDuplicatePage = async (page: BioPage, newSlug: string) => {
    if (!user || !newSlug) return;
    const newPage: BioPage & { userId: string } = {
      ...page,
      id: `page_${Date.now()}`,
      slug: newSlug,
      customDomain: '',
      userId: user.uid,
      createdAt: new Date().toISOString(),
      views: 0
    };
    await savePage(newPage);
    setPages([...pages, newPage]);
  };

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSavePage = (updatedPage: BioPage) => {
    if (!user) return;
    setCurrentPage(updatedPage);
    setPages(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p));
    setSaveStatus('saving');
        
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      savePage({ ...updatedPage, userId: user.uid })
        .then(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch(err => {
          console.error("Save error:", err);
          setSaveStatus('idle');
        });
    }, 1000);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Caricamento...</div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1A1A1A] font-sans underline-offset-4">
      {view === 'admin' ? (
        <AdminView onBack={() => setView('dashboard')} />
      ) : view === 'dashboard' ? (
        <DashboardView 
          pages={pages}
          onEdit={handleEditPage} 
          onCreate={handleCreatePage}
          onSignOut={() => auth.signOut()}
          onDuplicate={handleDuplicatePage}
          isAdmin={user.email === 'coppolek@gmail.com'}
          onAdminClick={() => setView('admin')}
        />
      ) : (
        currentPage && (
          <EditorDashboard 
            page={currentPage} 
            setPage={handleSavePage}
            onBack={() => setView('dashboard')}
            saveStatus={saveStatus}
          />
        )
      )}
    </div>
  );
}

function DashboardView({ pages, onEdit, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick }: { pages: BioPage[], onEdit: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<BioPage | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState('');

  
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSlug.trim()) {
      onCreate(newSlug.trim());
      setIsModalOpen(false);
      setNewSlug('');
    }
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateSlug.trim() && duplicateTarget) {
      onDuplicate(duplicateTarget, duplicateSlug.trim());
      setDuplicateTarget(null);
      setDuplicateSlug('');
    }
  };

  const copyUrl = (e: React.MouseEvent, page: BioPage) => {
    e.stopPropagation();
    const url = page.customDomain ? `https://${page.customDomain}` : `${window.location.origin}/${page.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiato!', {
      style: {
        borderRadius: '12px',
        background: '#1A1A1A',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white p-4 md:p-8 max-w-6xl mx-auto w-full">
      
      {duplicateTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-black shadow-lg">
            <h2 className="text-2xl font-black italic tracking-tighter mb-4">Duplica Pagina</h2>
            <form onSubmit={handleDuplicateSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">Slug della nuova pagina</label>
                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden focus-within:border-black transition-all">
                  <span className="px-4 py-3 text-gray-500 font-medium">puulp.it/</span>
                  <input 
                    type="text" 
                    value={duplicateSlug}
                    onChange={(e) => setDuplicateSlug(e.target.value)}
                    className="w-full py-3 pr-4 bg-transparent outline-none font-bold"
                    placeholder="nuovo_slug"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setDuplicateTarget(null)}
                  className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-all"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Duplica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-black shadow-lg">
            <h2 className="text-2xl font-black italic tracking-tighter mb-4">Nuova Pagina</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">Slug della pagina</label>
                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden focus-within:border-black transition-all">
                  <span className="px-4 py-3 text-gray-500 font-medium">puulp.it/</span>
                  <input 
                    type="text" 
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full py-3 pr-4 bg-transparent outline-none font-bold"
                    placeholder="mario_rossi"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-all"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Crea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-bold">B•</div>
          <span className="font-black text-xl tracking-tighter">PUULP</span>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button 
              onClick={onAdminClick}
              className="text-xs font-bold text-white bg-black px-4 py-2 rounded-lg hover:bg-gray-800 uppercase tracking-widest mr-4"
            >
              Admin
            </button>
          )}
          <button onClick={onSignOut} className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest">Esci</button>
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img src="https://i.pravatar.cc/300?img=68" alt="User" />
          </div>
        </div>
      </header>

      <main>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">I tuoi Bio Site</h1>
            <p className="text-gray-500 mt-2 font-medium">Gestisci le tue pagine e monitora le analytics.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90"
          >
            + Nuova Pagina
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
            <h3 className="text-xl font-bold mb-2">Nessuna pagina trovata</h3>
            <p className="text-gray-500 mb-6">Crea il tuo primo Bio Site per iniziare.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90"
            >
              + Crea Pagina
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(page => (
              <div key={page.id} className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm hover:shadow-lg transition-all group relative flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden">
                      <img src={page.profile.avatarUrl} alt="" />
                    </div>
                    <div>
                      <h3 className="font-black italic tracking-tighter text-xl">{page.slug}</h3>
                      <div className="flex items-center gap-2">
                        <a href={`/${page.slug}`} target="_blank" className="text-sm font-bold hover:underline">
                          {page.customDomain ? page.customDomain : `puulp.it/${page.slug}`}
                        </a>
                        <button 
                          onClick={(e) => copyUrl(e, page)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black rounded-md transition-colors"
                          title="Copia link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  
                  <div className="flex items-center gap-3">
                  </div>
                    <button 
                      onClick={() => { setDuplicateTarget(page); setDuplicateSlug(page.slug + '-copy'); }}
                      className="p-2 bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors"
                      title="Duplica Pagina"
                    >
                      <Files className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black text-white p-4 rounded-xl">
                    <div className="text-[10px] uppercase opacity-60 mb-1">Visite Totali</div>
                    <div className="text-2xl font-black tracking-tighter">{page.views.toLocaleString()}</div>
                  </div>
                  <div className="border-2 border-black p-4 rounded-xl">
                    <div className="text-[10px] uppercase opacity-60 mb-1">CTR</div>
                    <div className="text-2xl font-black tracking-tighter">12.4%</div>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => onEdit(page)}
                    className="w-full py-3 border-2 border-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-black hover:text-white transition-colors"
                  >
                    Gestisci Pagina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminView({ onBack }: { onBack: () => void }) {
  const [allPages, setAllPages] = useState<BioPage[]>([]);
  const [allBanners, setAllBanners] = useState<AppBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pages'|'banners'>('pages');

  // Form states for new banner
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [newBannerName, setNewBannerName] = useState('');
  const [newBannerType, setNewBannerType] = useState<'image' | 'code'>('image');
  const [newBannerCode, setNewBannerCode] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [newBannerLinkUrl, setNewBannerLinkUrl] = useState('');
  const [newBannerPosition, setNewBannerPosition] = useState<'top' | 'bottom'>('top');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pages, banners] = await Promise.all([
          getAllPages(),
          getAllBanners()
        ]);
        setAllPages(pages);
        setAllBanners(banners);
      } catch (err) {
        console.error("Failed to load admin data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDelete = async (pageId: string) => {
    if (confirm("Sei sicuro di voler eliminare questa pagina? Questa azione è irreversibile.")) {
      await deletePage(pageId);
      setAllPages(allPages.filter(p => p.id !== pageId));
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerName.trim()) return;

    const banner: AppBanner = {
      id: `banner_${Date.now()}`,
      name: newBannerName,
      type: newBannerType,
      position: newBannerPosition,
      active: true,
    };

    if (newBannerType === 'image') {
      banner.imageUrl = newBannerImageUrl;
      banner.linkUrl = newBannerLinkUrl;
    } else {
      banner.code = newBannerCode;
    }

    await saveBanner(banner);
    setAllBanners([...allBanners, banner]);
    setIsBannerModalOpen(false);
    
    // Reset form
    setNewBannerName('');
    setNewBannerCode('');
    setNewBannerImageUrl('');
    setNewBannerLinkUrl('');
  };

  const handleToggleBanner = async (banner: AppBanner) => {
    const updated = { ...banner, active: !banner.active };
    await saveBanner(updated);
    setAllBanners(allBanners.map(b => b.id === banner.id ? updated : b));
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (confirm("Sei sicuro di voler eliminare questo banner?")) {
      await deleteBanner(bannerId);
      setAllBanners(allBanners.filter(b => b.id !== bannerId));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white p-8 max-w-6xl mx-auto w-full">
      {isBannerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-black shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black italic tracking-tighter mb-4">Nuovo Banner</h2>
            <form onSubmit={handleCreateBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1">Nome (interno)</label>
                <input 
                  type="text" 
                  value={newBannerName}
                  onChange={e => setNewBannerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1">Posizione</label>
                <select 
                  value={newBannerPosition}
                  onChange={e => setNewBannerPosition(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                >
                  <option value="top">In alto</option>
                  <option value="bottom">In basso</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1">Tipo Banner</label>
                <select 
                  value={newBannerType}
                  onChange={e => setNewBannerType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                >
                  <option value="image">Immagine + Link</option>
                  <option value="code">Codice personalizzato / AdSense</option>
                </select>
              </div>
              
              {newBannerType === 'image' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1">URL Immagine</label>
                    <input 
                      type="url" 
                      value={newBannerImageUrl}
                      onChange={e => setNewBannerImageUrl(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1">URL Destinazione</label>
                    <input 
                      type="url" 
                      value={newBannerLinkUrl}
                      onChange={e => setNewBannerLinkUrl(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                      placeholder="https://..."
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1">Codice (HTML/JS)</label>
                  <textarea 
                    value={newBannerCode}
                    onChange={e => setNewBannerCode(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black font-mono text-xs"
                    rows={6}
                    placeholder="<script>...</script>"
                    required
                  ></textarea>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:opacity-90"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-bold">A•</div>
          <span className="font-black text-xl tracking-tighter text-red-600">ADMIN•CORE</span>
        </div>
      </header>

      <main>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-red-600">Pannello Amministratore</h1>
            <p className="text-gray-500 mt-2 font-medium">Gestisci le pagine e la monetizzazione globale (Banner).</p>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button 
            className={`px-4 py-2 font-bold uppercase tracking-widest text-sm border-b-2 ${activeTab === 'pages' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            onClick={() => setActiveTab('pages')}
          >
            Pagine ({allPages.length})
          </button>
          <button 
            className={`px-4 py-2 font-bold uppercase tracking-widest text-sm border-b-2 ${activeTab === 'banners' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            onClick={() => setActiveTab('banners')}
          >
            Banners ({allBanners.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Caricamento...</p>
          </div>
        ) : activeTab === 'pages' ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-black tracking-widest text-gray-500">
                <tr>
                  <th className="px-6 py-4">Pagina</th>
                  <th className="px-6 py-4">URL</th>
                  <th className="px-6 py-4">Visite</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium">
                {allPages.map(page => (
                  <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden">
                          <img src={page.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold">{page.profile.name}</div>
                          <div className="text-[10px] text-gray-400">{page.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a href={`/${page.slug}`} target="_blank" className="text-blue-600 hover:underline">/{page.slug}</a>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {page.views?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(page.id)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allPages.length === 0 && (
              <div className="text-center py-12 text-gray-500 font-medium">
                Nessuna pagina registrata
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setIsBannerModalOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90"
              >
                + Nuovo Banner
              </button>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-black tracking-widest text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Posizione</th>
                    <th className="px-6 py-4">Stato</th>
                    <th className="px-6 py-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium">
                  {allBanners.map(banner => (
                    <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold">{banner.name}</td>
                      <td className="px-6 py-4 uppercase text-[10px] tracking-widest">{banner.type}</td>
                      <td className="px-6 py-4 uppercase text-[10px] tracking-widest">{banner.position}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleToggleBanner(banner)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${banner.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {banner.active ? 'Attivo' : 'Inattivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allBanners.length === 0 && (
                <div className="text-center py-12 text-gray-500 font-medium">
                  Nessun banner configurato
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
