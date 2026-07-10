import React, { useState, useEffect } from 'react';
import { BioPage, BioLink, BioModule, PageAnalytics } from '../types';
import PublicBioPage from './PublicBioPage';
import { CheckCircle2, Loader2, Globe, Settings, Eye, Layout, Link as LinkIcon, DollarSign, PenTool, Share2, Users, ChevronLeft, GripVertical, Plus, BarChart3, Mail, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { getPageAnalytics, getPageSubscribers } from '../lib/db';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function EditorDashboard({ 
  page, 
  setPage, 
  onBack,
  saveStatus = 'idle'

}: { 
  page: BioPage, 
  setPage: (page: BioPage) => void,
  onBack: () => void,
  saveStatus?: 'idle' | 'saving' | 'saved'
}) {
  const [activeTab, setActiveTab] = useState<'links' | 'appearance' | 'monetization' | 'microblog' | 'settings' | 'analytics' | 'audience' | 'layout' | 'seo'>('analytics');
  const [showShare, setShowShare] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white text-[#1A1A1A] font-sans underline-offset-4">
      
      {/* Sidebar Navigation */}
      <div className="w-20 md:w-64 border-r border-gray-100 flex flex-col h-full z-10 flex-shrink-0 bg-gray-50/50">
        <div className="p-4 md:p-6 flex items-center gap-3 border-b border-gray-100">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg md:hidden">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center gap-2 text-gray-400 hover:text-gray-900 cursor-pointer transition-colors" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Torna alla Dashboard</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <NavItem icon={<BarChart3 />} label="Statistiche" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <NavItem icon={<Layout />} label="Layout Blocchi" active={activeTab === 'layout'} onClick={() => setActiveTab('layout')} />
          <NavItem icon={<Globe />} label="SEO & Social" active={activeTab === 'seo'} onClick={() => setActiveTab('seo')} />
          <NavItem icon={<LinkIcon />} label="Link & Navigazione" active={activeTab === 'links'} onClick={() => setActiveTab('links')} />
          <NavItem icon={<Layout />} label="Aspetto" active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
          <NavItem icon={<Mail />} label="Pubblico & Iscritti" active={activeTab === 'audience'} onClick={() => setActiveTab('audience')} />
          <NavItem icon={<DollarSign />} label="Monetizzazione" active={activeTab === 'monetization'} onClick={() => setActiveTab('monetization')} />
          <NavItem icon={<PenTool />} label="Micro-Blog" active={activeTab === 'microblog'} onClick={() => setActiveTab('microblog')} />
          <NavItem icon={<Settings />} label="Impostazioni" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => setShowShare(!showShare)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A1A1A] text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">Condividi</span>
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
      
        {/* Save Status Indicator */}
        <div className="absolute top-6 right-6 lg:right-[424px] xl:right-[524px] z-50 flex items-center gap-2 pointer-events-none">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest bg-white shadow-sm px-3 py-1.5 rounded-full border border-gray-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvataggio...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 uppercase tracking-widest bg-white shadow-sm px-3 py-1.5 rounded-full border border-green-200 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Salvato
            </span>
          )}
        </div>

        {/* Editor Controls */}
        <div className="flex-1 h-full overflow-y-auto bg-white border-r border-gray-50 custom-scrollbar">
          <div className="p-6 md:p-10 max-w-2xl mx-auto">
            {activeTab === 'analytics' && <AnalyticsEditor page={page} />}
            {activeTab === 'layout' && <LayoutEditor page={page} setPage={setPage} />}
            {activeTab === 'seo' && <SeoEditor page={page} setPage={setPage} />}
            {activeTab === 'links' && <LinksEditor page={page} setPage={setPage} />}
            {activeTab === 'appearance' && <AppearanceEditor page={page} setPage={setPage} />}
            {activeTab === 'audience' && <AudienceEditor page={page} setPage={setPage} />}
            {activeTab === 'monetization' && <MonetizationEditor page={page} setPage={setPage} />}
            {activeTab === 'microblog' && <MicroblogEditor page={page} setPage={setPage} />}
            {activeTab === 'settings' && <SettingsEditor page={page} setPage={setPage} />}
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="hidden lg:flex w-[400px] xl:w-[500px] bg-gray-50 items-center justify-center p-8 flex-shrink-0">
          <div className="w-[320px] h-[640px] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-[#1A1A1A] relative flex flex-col">
            <div className="absolute top-0 w-full h-6 flex justify-center items-center z-50">
              <div className="w-16 h-4 bg-[#1A1A1A] rounded-b-xl"></div>
            </div>
            <PublicBioPage page={page} isPreview={true} />
          </div>
        </div>

      </div>

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-2">Condividi la tua pagina</h3>
            <p className="text-gray-500 mb-6">Usa questo QR code per condividere rapidamente il tuo profilo offline.</p>
            
            <div className="flex justify-center p-8 bg-gray-50 rounded-2xl mb-6">
              <QRCode value={`https://puulp.it/${page.slug}`} size={200} />
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={`https://puulp.it/${page.slug}`}
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`https://puulp.it/${page.slug}`);
                  alert('Link copiato negli appunti!');
                }}
                className="px-6 py-3 bg-black text-white rounded-xl font-medium"
              >Copia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
        active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-gray-400'}`}>{React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}</div>
      <span className="hidden md:block text-left">{label}</span>
    </button>
  );
}

const SortableLayoutItem: React.FC<{ block: any, id?: string }> = ({ block, id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:border-black transition-all group bg-white">
      <div 
        {...attributes} 
        {...listeners}
        className="text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing mr-4"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-sm">{block.title || 'Senza Titolo'}</h4>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{block.type}</p>
      </div>
    </div>
  );
}

function LayoutEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const blocks = [
    ...page.links.map(l => ({ id: l.id, title: l.title, type: 'link' })),
    ...page.modules.map(m => ({ id: m.id, title: m.title, type: m.type }))
  ];
  
  const layoutOrder = page.layoutOrder || blocks.map(b => b.id);
  
  // Sort blocks based on layoutOrder
  const sortedBlocks = layoutOrder
    .map(id => blocks.find(b => b.id === id))
    .filter(Boolean) as any[];
    
  // Also include any new blocks that aren't in layoutOrder yet
  const missingBlocks = blocks.filter(b => !layoutOrder.includes(b.id));
  const finalBlocks = [...sortedBlocks, ...missingBlocks];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = finalBlocks.findIndex((b) => b.id === active.id);
      const newIndex = finalBlocks.findIndex((b) => b.id === over.id);
      
      const newLayoutOrder = arrayMove(finalBlocks.map(b => b.id), oldIndex, newIndex);
      
      setPage({
        ...page,
        layoutOrder: newLayoutOrder,
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Layout Blocchi</h2>
        <p className="text-gray-500 text-sm">Trascina gli elementi per riordinarli sulla tua pagina. L'ordine verrà rispettato nell'anteprima.</p>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          <SortableContext 
            items={finalBlocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {finalBlocks.map(block => (
              <SortableLayoutItem key={block.id} id={block.id} block={block} />
            ))}
          </SortableContext>
          {finalBlocks.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Nessun blocco da ordinare.</p>
          )}
        </div>
      </DndContext>
    </div>
  );
}

 // if not there, I will just use Settings for the icon or import Globe

function SeoEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const updateSeo = (updates: Partial<NonNullable<BioPage['seo']>>) => {
    setPage({ ...page, seo: { ...(page.seo || {}), ...updates } });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">SEO & Social</h2>
        <p className="text-gray-500 text-sm">Personalizza come appare la tua pagina quando viene condivisa su social, messaggi e motori di ricerca.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Titolo Pagina (Opzionale)</label>
          <input 
            type="text" 
            value={page.seo?.title || ''}
            onChange={e => updateSeo({ title: e.target.value })}
            placeholder={page.profile.name ? `${page.profile.name} - Link in Bio` : "Il tuo titolo"}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1">Sostituisce il titolo generato automaticamente dalla tua Bio.</p>
        </div>
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Descrizione (Opzionale)</label>
          <textarea 
            value={page.seo?.description || ''}
            onChange={e => updateSeo({ description: e.target.value })}
            placeholder={page.profile.bio || "Descrizione per i motori di ricerca..."}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors h-24 resize-none"
          ></textarea>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Immagine Open Graph (URL)</label>
          <input 
            type="url" 
            value={page.seo?.imageUrl || ''}
            onChange={e => updateSeo({ imageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black transition-colors"
          />
          <p className="text-[10px] text-gray-400 mt-1">L'immagine mostrata quando il link viene condiviso. (Di base viene usato il tuo Avatar)</p>
          
          {page.seo?.imageUrl && (
             <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden max-w-sm">
               <img src={page.seo.imageUrl} alt="Open Graph Preview" className="w-full h-auto object-cover aspect-[1.91/1]" onError={(e) => (e.currentTarget.style.display = 'none')} />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SortableLinkItem: React.FC<{ 
  link: BioLink, 
  page: BioPage, 
  setPage: (page: BioPage) => void,
  scrapingId: string | null,
  handleUrlBlur: (id: string, url: string) => void,
  id?: string,
  key?: string
}> = ({ link, page, setPage, scrapingId, handleUrlBlur }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 border border-gray-100 rounded-xl flex items-start justify-between hover:border-black transition-all group bg-white">
      <div 
        {...attributes} 
        {...listeners}
        className="mt-2 text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing mr-3"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex gap-4">
          <label className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-black transition-colors relative">
            {link.image ? (
              <img src={link.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-gray-400 uppercase">+ Img</span>
            )}
            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const newLinks = page.links.map(l => l.id === link.id ? { ...l, image: reader.result as string } : l);
                    setPage({ ...page, links: newLinks });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          <div className="flex-1 space-y-2">
            <input 
              type="text" 
              value={link.title}
              onChange={e => {
                const newLinks = page.links.map(l => l.id === link.id ? { ...l, title: e.target.value } : l);
                setPage({ ...page, links: newLinks });
              }}
              className="w-full text-sm font-bold outline-none bg-transparent placeholder-gray-400"
              placeholder="Titolo Link"
            />
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                value={link.url}
                onChange={e => {
                  const newLinks = page.links.map(l => l.id === link.id ? { ...l, url: e.target.value } : l);
                  setPage({ ...page, links: newLinks });
                }}
                className="w-full text-[10px] text-gray-400 outline-none bg-transparent placeholder-gray-400"
                placeholder="URL (es. https://tuosito.com)"
              />
              <button 
                onClick={() => handleUrlBlur(link.id, link.url)}
                disabled={scrapingId === link.id || !link.url}
                className="text-[9px] whitespace-nowrap font-bold uppercase tracking-widest bg-gray-100 px-2 py-1 rounded text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {scrapingId === link.id ? 'Attendi...' : 'Recupera Dati'}
              </button>
            </div>
            <textarea
              value={link.description || ''}
              onChange={e => {
                const newLinks = page.links.map(l => l.id === link.id ? { ...l, description: e.target.value } : l);
                setPage({ ...page, links: newLinks });
              }}
              className="w-full text-[10px] text-gray-500 outline-none bg-transparent placeholder-gray-300 resize-none h-12"
              placeholder="Breve descrizione..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
            {scrapingId === link.id && <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>}
            {link.clicks || 0} CLICK
          </span>
          {link.tags?.map(tag => (
            <span key={tag} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <button 
        onClick={() => {
          const newLinks = page.links.filter(l => l.id !== link.id);
          setPage({ ...page, links: newLinks });
        }}
        className="flex items-center justify-center p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}

function LinksEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = page.links.findIndex((link) => link.id === active.id);
      const newIndex = page.links.findIndex((link) => link.id === over.id);
      
      setPage({
        ...page,
        links: arrayMove(page.links, oldIndex, newIndex),
      });
    }
  };

  const handleUrlBlur = async (linkId: string, url: string) => {
    if (!url) return;
    try {
      new URL(url);
    } catch {
      return;
    }

    setScrapingId(linkId);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      if (res.ok) {
        const data = await res.json();
        const newLinks = page.links.map(l => {
          if (l.id === linkId) {
            return {
              ...l,
              title: l.title || data.title,
              description: l.description || data.description,
              image: l.image || data.image,
            };
          }
          return l;
        });
        setPage({ ...page, links: newLinks });
      } else {
        alert('Impossibile recuperare i dati automaticamente. Inserisci immagine, titolo e descrizione manualmente.');
      }
    } catch (err) {
      console.error('Failed to scrape metadata:', err);
      alert('Impossibile recuperare i dati automaticamente. Inserisci immagine, titolo e descrizione manualmente.');
    } finally {
      setScrapingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Build Your Story</h2>
        <p className="text-gray-500 text-sm">Aggiungi, modifica e riordina i tuoi link. Non c'è limite al numero di link che puoi aggiungere.</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest">Aggregatore Link</h3>
          <span className="text-[10px] text-gray-400">Trascina per ordinare</span>
        </div>
              <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4 mb-6">
            <SortableContext 
              items={page.links.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {page.links.map(link => (
                <SortableLinkItem 
                  key={link.id} 
                  id={link.id} 
                  link={link} 
                  page={page} 
                  setPage={setPage}
                  scrapingId={scrapingId}
                  handleUrlBlur={handleUrlBlur}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
        <button 
          onClick={() => {
            const newLink = {
              id: Date.now().toString(),
              title: '',
              url: '',
              isActive: true,
              clicks: 0
            };
            setPage({ ...page, links: [...page.links, newLink] });
          }}
          className="w-full py-4 border-2 border-black rounded-full flex items-center justify-center gap-2 text-gray-500 hover:bg-black hover:text-white transition-all font-black uppercase tracking-widest text-[10px]"
        >
          <Plus className="w-4 h-4" />
          <span>Aggiungi nuovo Link</span>
        </button>
      </div>
    </div>
  );
}

function AppearanceEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const updateTheme = (updates: Partial<BioPage['theme']>) => {
    setPage({ ...page, theme: { ...page.theme, ...updates } });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Aspetto e Design</h2>
        <p className="text-gray-500 text-sm">Personalizza i colori, i font e lo stile dei bottoni.</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-gray-200 pb-4">Colori Tema</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Sfondo</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">{page.theme.backgroundColor}</span>
              <input 
                type="color" 
                value={page.theme.backgroundColor}
                onChange={e => updateTheme({ backgroundColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-2 border-black bg-transparent p-0"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Testo Principale</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">{page.theme.textColor}</span>
              <input 
                type="color" 
                value={page.theme.textColor}
                onChange={e => updateTheme({ textColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-2 border-black bg-transparent p-0"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Bottoni</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">{page.theme.buttonColor}</span>
              <input 
                type="color" 
                value={page.theme.buttonColor}
                onChange={e => updateTheme({ buttonColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border-2 border-black bg-transparent p-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-gray-200 pb-4">Stile Bottoni</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['none', 'sm', 'md', 'full'] as const).map(radius => (
            <button
              key={radius}
              onClick={() => updateTheme({ buttonRadius: radius })}
              className={`py-3 border-2 transition-all ${
                page.theme.buttonRadius === radius ? 'border-black bg-white shadow-sm' : 'border-gray-200 hover:border-black'
              } ${
                radius === 'full' ? 'rounded-full' : radius === 'md' ? 'rounded-xl' : radius === 'sm' ? 'rounded-md' : 'rounded-none'
              }`}
            >
              <span className="font-bold text-xs uppercase tracking-widest block">ABC</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonetizationEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Monetizzazione (E-commerce)</h2>
        <p className="text-gray-500">Vendi prodotti, accetta mance e prenota appuntamenti direttamente dalla tua pagina.</p>
      </div>

      <div className="grid gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Tip Jar (Mance)</h3>
              <p className="text-sm text-gray-500">Permetti ai fan di supportarti economicamente.</p>
            </div>
          </div>
          <button 
            onClick={() => alert('Integrazione Stripe per Tip Jar in arrivo!')}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg"
          >Configura</button>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Prodotti Digitali</h3>
              <p className="text-sm text-gray-500">Vendi ebook, preset, file digitali.</p>
            </div>
          </div>
          <button 
            onClick={() => alert('Gestione prodotti digitali in arrivo!')}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg"
          >Aggiungi</button>
        </div>
      </div>
    </div>
  );
}

function MicroblogEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handlePost = () => {
    if (!title || !content) return;
    const newModule: BioModule = {
      type: 'microblog',
      id: Date.now().toString(),
      title,
      content,
      imageUrl: imageUrl || undefined,
      date: new Date().toISOString(),
      tags: []
    };
    setPage({ ...page, modules: [newModule, ...(page.modules || [])] });
    setTitle('');
    setContent('');
    setImageUrl('');
    alert('Post aggiunto alla pagina!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Micro-Blog & Contenuti</h2>
        <p className="text-gray-500 text-sm">Condividi mini-saggi, pensieri o embed di video TikTok per non sovraccaricare il pubblico.</p>
      </div>

      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <input 
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo della Storia..." 
          className="w-full bg-transparent border-b border-gray-200 py-2 font-bold mb-4 focus:outline-none focus:border-black" 
        />
        <textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Scrivi qui il tuo pensiero breve..." 
          className="w-full bg-transparent border-none text-sm text-gray-600 resize-none h-24 focus:outline-none"
        ></textarea>
        {imageUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-48">
            <img src={imageUrl} alt="Anteprima media" className="w-full h-full object-contain" />
            <button 
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
          <label className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-wider cursor-pointer">
            Aggiungi Foto
            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImageUrl(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-400">{content.length} / 500 char</span>
            <button 
              onClick={handlePost}
              className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:opacity-90"
            >Pubblica</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsEditor({ page }: { page: BioPage }) {
  const [data, setData] = useState<PageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPageAnalytics(page.id).then(analytics => {
      setData(analytics);
      setLoading(false);
    });
  }, [page.id]);

  if (loading) {
    return <div className="py-20 text-center font-medium text-gray-500">Caricamento statistiche...</div>;
  }

  if (!data || data.dailyStats.length === 0) {
    return <div className="py-20 text-center font-medium text-gray-500">Nessun dato disponibile</div>;
  }

  const chartData = data.dailyStats.map(stat => {
    const d = new Date(stat.date);
    return {
      name: `${d.getDate()}/${d.getMonth()+1}`,
      Visite: stat.views,
      Click: stat.clicks,
      CTR: stat.views > 0 ? parseFloat(((stat.clicks / stat.views) * 100).toFixed(1)) : 0
    };
  });

  const totalViews = data.dailyStats.reduce((sum, d) => sum + d.views, 0);
  const totalClicks = data.dailyStats.reduce((sum, d) => sum + d.clicks, 0);
  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Statistiche</h2>
        <p className="text-gray-500">Analizza le performance e il traffico del tuo Bio Site negli ultimi 7 giorni.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black text-white p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Visite (7gg)</div>
          <div className="text-4xl font-black tracking-tighter">{totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-white border-2 border-black p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">CTR Medio</div>
          <div className="text-4xl font-black tracking-tighter">{avgCtr}%</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold mb-6 text-sm">Visite e Click Giornalieri</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="Visite" fill="#1A1A1A" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Click" fill="#9CA3AF" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold mb-6 text-sm">Tasso di Click (CTR)</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${value}%`, 'CTR']}
              />
              <Bar dataKey="CTR" fill="#1A1A1A" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SettingsEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const updateProfile = (updates: Partial<BioPage['profile']>) => {
    setPage({ ...page, profile: { ...page.profile, ...updates } });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Profilo e SEO</h2>
        <p className="text-gray-500">Gestisci i tuoi dati personali, l'avatar e i metadati della pagina.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-200">
            <img src={page.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <label className="px-4 py-2 border border-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer">
            Carica Foto
            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    updateProfile({ avatarUrl: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome del Profilo</label>
            <input 
              type="text" 
              value={page.profile.name}
              onChange={e => updateProfile({ name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Descrizione</label>
            <textarea 
              value={page.profile.bio}
              onChange={e => updateProfile({ bio: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold tracking-tight mb-1">Dominio Personalizzato</h3>
          <p className="text-gray-500 text-sm mb-4">Usa un tuo dominio al posto di puulp.it/{page.slug}</p>
          <div className="flex gap-3 items-center">
            <input 
              type="text" 
              placeholder="es. link.tuosito.com"
              value={page.customDomain || ''}
              onChange={e => setPage({ ...page, customDomain: e.target.value })}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition-all font-mono text-sm"
            />
            <button onClick={() => alert('Dominio salvato. Configura i DNS per attivarlo.')} className="px-5 py-3 bg-black text-white font-bold rounded-xl text-sm uppercase tracking-widest hover:opacity-90 transition-opacity">
              Collega
            </button>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
            <strong>Istruzioni DNS:</strong> Per collegare questo dominio, crea un record <strong>CNAME</strong> nel pannello del tuo provider DNS che punti a <code className="bg-gray-200 px-1 py-0.5 rounded text-black">cname.puulp.it</code>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold tracking-tight mb-1">Lingua Pubblica</h3>
          <p className="text-gray-500 text-sm mb-4">Scegli la lingua per i testi predefiniti della tua pagina.</p>
          <div className="flex gap-3 items-center">
            <select
              value={page.language || 'it'}
              onChange={e => setPage({ ...page, language: e.target.value as 'it' | 'en' | 'es' })}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium text-sm"
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight mb-2 mt-8">Anteprima Condivisione (Social)</h2>
        <p className="text-gray-500 text-sm mb-4">Così apparirà il tuo link quando lo condividi su iMessage, X (Twitter), Facebook, ecc.</p>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Preview Card */}
          <div className="flex-1 max-w-sm rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[1.91/1] w-full bg-gray-100 border-b border-gray-200 relative overflow-hidden">
              {page.profile.avatarUrl ? (
                <img src={page.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{page.customDomain || 'puulp.it'}</div>
              <h3 className="font-bold text-gray-900 leading-tight mb-1 truncate">{page.profile.name} | PUULP</h3>
              <p className="text-sm text-gray-500 line-clamp-2 leading-snug">{page.profile.bio}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudienceEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hasNewsletterModule = page.modules.some(m => m.type === 'newsletter');

  useEffect(() => {
    getPageSubscribers(page.id).then(subs => {
      setSubscribers(subs.sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()));
      setLoading(false);
    });
  }, [page.id]);

  const toggleNewsletterModule = () => {
    if (hasNewsletterModule) {
      setPage({
        ...page,
        modules: page.modules.filter(m => m.type !== 'newsletter')
      });
    } else {
      setPage({
        ...page,
        modules: [...page.modules, { 
          id: Date.now().toString(),
          type: 'newsletter' as const, 
          title: 'Iscriviti alla Newsletter', 
          description: 'Ricevi aggiornamenti esclusivi direttamente nella tua casella di posta.',
          provider: 'puulp'
        }]
      });
    }
  };

  const exportCsv = () => {
    if (subscribers.length === 0) return;
    const header = "Email,Data Iscrizione\n";
    const csv = subscribers.map(s => `${s.email},${new Date(s.subscribedAt).toLocaleString()}`).join("\n");
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iscritti_${page.slug}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Pubblico e Iscritti</h2>
        <p className="text-gray-500">Gestisci la raccolta email e la tua lista di iscritti.</p>
      </div>

      <div className="p-6 bg-white border border-gray-200 rounded-2xl flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold">Raccolta Email (Newsletter)</h3>
            <p className="text-sm text-gray-500">Aggiungi un modulo per raccogliere le email dei visitatori.</p>
          </div>
        </div>
        <button 
          onClick={toggleNewsletterModule}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${hasNewsletterModule ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-black text-white hover:opacity-90'}`}
        >
          {hasNewsletterModule ? 'Rimuovi Modulo' : 'Aggiungi Modulo'}
        </button>
      </div>

      {hasNewsletterModule && (
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">Iscritti Totali</h3>
              <p className="text-3xl font-black tracking-tighter mt-1">{subscribers.length}</p>
            </div>
            <button 
              onClick={exportCsv}
              disabled={subscribers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Esporta CSV
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Data Iscrizione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : subscribers.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">Nessun iscritto ancora.</td></tr>
                ) : (
                  subscribers.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{sub.email}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(sub.subscribedAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
