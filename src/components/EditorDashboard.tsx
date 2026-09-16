import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BioPage, BioLink, BioModule, PageAnalytics } from '../types';
import PublicBioPage from './PublicBioPage';
import { CheckCircle2, Loader2, Globe, Settings, Eye, Layout, Link as LinkIcon, DollarSign, PenTool, Share2, Users, ChevronLeft, GripVertical, Plus, BarChart3, Mail, Download , ShoppingCart, Youtube, Bold, Italic, Type, Quote, Link2, Palette, Image as ImageIcon, Smile, Folder, Briefcase } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'links' | 'appearance' | 'microblog' | 'settings' | 'analytics' | 'audience' | 'layout' | 'seo' | 'careerjet'>('analytics');
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
          <NavItem icon={<PenTool />} label="Micro-Blog" active={activeTab === 'microblog'} onClick={() => setActiveTab('microblog')} />
          <NavItem icon={<Briefcase />} label="Annunci Lavoro" active={activeTab === 'careerjet'} onClick={() => setActiveTab('careerjet')} />
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
          <button 
            onClick={() => {
              const newLink = { id: Date.now().toString(), title: '', url: '', link_type: 'folder' as const, clicks: 0, children: [] };
              setPage({ ...page, links: [...page.links, newLink] });
            }}
            className="w-full py-4 border border-gray-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 text-black hover:border-black transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-black/10 group-hover:text-black flex items-center justify-center transition-colors">
              <Folder className="w-4 h-4" />
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest text-center">Cartella</span>
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
            {activeTab === 'microblog' && <MicroblogEditor page={page} setPage={setPage} />}
            {activeTab === 'settings' && <SettingsEditor page={page} setPage={setPage} />}
            {activeTab === 'careerjet' && <CareerjetEditor page={page} setPage={setPage} />}
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
      <div className={`${active ? 'text-white' : 'text-gray-400'}`}>{React.cloneElement(icon as any, { className: 'w-4 h-4' })}</div>
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
  
  if (link.link_type === 'folder') {
    return (
      <div ref={setNodeRef} style={style} className="p-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col group bg-gray-50/50">
        <div className="flex items-start justify-between">
          <div 
            {...attributes} 
            {...listeners}
            className="mt-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mr-3"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={link.title}
                onChange={e => {
                  const newLinks = page.links.map(l => l.id === link.id ? { ...l, title: e.target.value } : l);
                  setPage({ ...page, links: newLinks });
                }}
                className="w-full text-sm font-bold outline-none bg-transparent placeholder-gray-400"
                placeholder="Nome Cartella"
              />
            </div>
            
            <div className="mt-4 space-y-2">
              {(link.children || []).map((child, idx) => (
                <div key={child.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                  <div className="flex flex-col gap-2 flex-1">
                    <input 
                      type="text" 
                      value={child.title}
                      onChange={e => {
                        const newChildren = [...(link.children || [])];
                        newChildren[idx] = { ...newChildren[idx], title: e.target.value };
                        const newLinks = page.links.map(l => l.id === link.id ? { ...l, children: newChildren } : l);
                        setPage({ ...page, links: newLinks });
                      }}
                      className="w-full text-xs font-bold outline-none bg-transparent placeholder-gray-400"
                      placeholder="Titolo Link"
                    />
                    <input 
                      type="text" 
                      value={child.url}
                      onChange={e => {
                        const newChildren = [...(link.children || [])];
                        newChildren[idx] = { ...newChildren[idx], url: e.target.value };
                        const newLinks = page.links.map(l => l.id === link.id ? { ...l, children: newChildren } : l);
                        setPage({ ...page, links: newLinks });
                      }}
                      className="w-full text-[10px] text-gray-400 outline-none bg-transparent placeholder-gray-400"
                      placeholder="URL"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      disabled={idx === 0}
                      onClick={() => {
                        const newChildren = [...(link.children || [])];
                        const temp = newChildren[idx - 1];
                        newChildren[idx - 1] = newChildren[idx];
                        newChildren[idx] = temp;
                        const newLinks = page.links.map(l => l.id === link.id ? { ...l, children: newChildren } : l);
                        setPage({ ...page, links: newLinks });
                      }}
                      className="text-gray-400 hover:text-black disabled:opacity-30"
                    >↑</button>
                    <button 
                      disabled={idx === (link.children?.length || 0) - 1}
                      onClick={() => {
                        const newChildren = [...(link.children || [])];
                        const temp = newChildren[idx + 1];
                        newChildren[idx + 1] = newChildren[idx];
                        newChildren[idx] = temp;
                        const newLinks = page.links.map(l => l.id === link.id ? { ...l, children: newChildren } : l);
                        setPage({ ...page, links: newLinks });
                      }}
                      className="text-gray-400 hover:text-black disabled:opacity-30"
                    >↓</button>
                    <button 
                      onClick={() => {
                        const newChildren = (link.children || []).filter(c => c.id !== child.id);
                        const newLinks = page.links.map(l => l.id === link.id ? { ...l, children: newChildren } : l);
                        setPage({ ...page, links: newLinks });
                      }}
                      className="text-red-400 hover:text-red-600"
                    >×</button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => {
                  const newChild = { id: Date.now().toString(), title: '', url: '', link_type: 'standard' as const, clicks: 0 };
                  const newLinks = page.links.map(l => l.id === link.id ? { ...l, children: [...(l.children || []), newChild] } : l);
                  setPage({ ...page, links: newLinks });
                }}
                className="w-full py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-black hover:border-black transition-colors"
              >
                + Aggiungi Link alla cartella
              </button>
            </div>
          </div>
          <button 
            onClick={() => {
              const newLinks = page.links.filter(l => l.id !== link.id);
              setPage({ ...page, links: newLinks });
            }}
            className="flex items-center justify-center p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-4"
          >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
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
              {link.link_type === 'youtube' && <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded">YouTube</span>}
              {link.link_type === 'spotify' && <span className="text-[9px] font-black uppercase tracking-widest text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded">Spotify</span>}
              {link.link_type === 'amazon' && <span className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] bg-[#FF9900]/10 px-2 py-0.5 rounded">Amazon</span>}
            </div>
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
            {link.link_type === 'amazon' && (
              <input
                type="text"
                value={link.price || ''}
                onChange={e => {
                  const newLinks = page.links.map(l => l.id === link.id ? { ...l, price: e.target.value } : l);
                  setPage({ ...page, links: newLinks });
                }}
                className="w-full text-xs font-bold outline-none bg-gray-50 p-2 rounded-lg text-black placeholder-gray-400 mt-2"
                placeholder="Prezzo (es. €19.99)"
              />
            )}
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <button 
            onClick={() => {
              const newLink = { id: Date.now().toString(), title: '', url: '', link_type: 'standard' as const, clicks: 0 };
              setPage({ ...page, links: [...page.links, newLink] });
            }}
            className="w-full py-4 border border-gray-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 text-black hover:border-black transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest text-center">Link Standard</span>
          </button>
          
          <button 
            onClick={() => {
              const newLink = { id: Date.now().toString(), title: '', url: '', link_type: 'youtube' as const, clicks: 0 };
              setPage({ ...page, links: [...page.links, newLink] });
            }}
            className="w-full py-4 border border-gray-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 text-black hover:border-[#FF0000] transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#FF0000]/10 group-hover:text-[#FF0000] flex items-center justify-center transition-colors">
              <Youtube className="w-4 h-4" />
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest text-center">Video YouTube</span>
          </button>

          <button 
            onClick={() => {
              const newLink = { id: Date.now().toString(), title: '', url: '', link_type: 'spotify' as const, clicks: 0 };
              setPage({ ...page, links: [...page.links, newLink] });
            }}
            className="w-full py-4 border border-gray-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 text-black hover:border-[#1DB954] transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#1DB954]/10 group-hover:text-[#1DB954] flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15.001 10.62 18.6 12.84c.361.181.54.84.361 1.2zM19.08 9.72c-3.96-2.34-10.44-2.52-14.16-1.38-.6.18-1.2-.12-1.38-.66-.18-.6.12-1.2.66-1.38 4.32-1.26 11.4-1.02 15.84 1.62.54.3.72.96.42 1.5-.24.6-.9.78-1.38.3z"/></svg>
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest text-center">Spotify</span>
          </button>

          <button 
            onClick={() => {
              const newLink = { id: Date.now().toString(), title: '', url: '', link_type: 'amazon' as const, clicks: 0, price: '' };
              setPage({ ...page, links: [...page.links, newLink] });
            }}
            className="w-full py-4 border border-gray-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-2 text-black hover:border-[#FF9900] transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#FF9900]/10 group-hover:text-[#FF9900] flex items-center justify-center transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest text-center">Amazon</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearanceEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const updateTheme = (updates: Partial<BioPage['theme']>) => {
    setPage({ ...page, theme: { ...page.theme, ...updates } });
  };

  const THEMES = [
    { id: 'light', name: 'Chiaro', bg: '#ffffff', text: '#000000', btn: '#f3f4f6', btnText: '#000000', font: 'sans-serif', bgStyle: 'solid', btnRadius: 'lg' as const },
    { id: 'dark', name: 'Scuro', bg: '#000000', text: '#ffffff', btn: '#1f2937', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'solid', btnRadius: 'lg' as const },
    { id: 'minimal', name: 'Minimal', bg: '#f9fafb', text: '#111827', btn: '#000000', btnText: '#ffffff', font: 'monospace', bgStyle: 'dots', btnRadius: 'none' as const },
    { id: 'sunset', name: 'Tramonto', bg: '#ffecd2', text: '#4a2f1d', btn: '#fcb69f', btnText: '#4a2f1d', font: 'serif', bgStyle: 'gradient-animated', btnRadius: 'full' as const },
    { id: 'ocean', name: 'Oceano', bg: '#0f2027', text: '#ffffff', btn: '#203a43', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'gradient-animated', btnRadius: 'md' as const },
    { id: 'neon', name: 'Neon Cyber', bg: '#000000', text: '#00ff00', btn: '#111111', btnText: '#00ff00', font: 'monospace', bgStyle: 'grid', btnRadius: 'none' as const },
    { id: 'pastel', name: 'Pastello', bg: '#fdfbfb', text: '#4b5563', btn: '#ebedee', btnText: '#4b5563', font: 'sans-serif', bgStyle: 'solid', btnRadius: 'full' as const },
    { id: 'lavender', name: 'Lavanda', bg: '#e0c3fc', text: '#4a306d', btn: '#8ec5fc', btnText: '#4a306d', font: 'serif', bgStyle: 'gradient-animated', btnRadius: 'lg' as const },
    { id: 'forest', name: 'Foresta', bg: '#134e5e', text: '#e0f2f1', btn: '#71b280', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'solid', btnRadius: 'md' as const },
    { id: 'cherry', name: 'Ciliegia', bg: '#ff0844', text: '#ffffff', btn: '#ffb199', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'gradient-animated', btnRadius: 'full' as const },
    { id: 'retro', name: 'Retro 80s', bg: '#2c3e50', text: '#f1c40f', btn: '#e74c3c', btnText: '#ffffff', font: 'monospace', bgStyle: 'noise', btnRadius: 'sm' as const },
    { id: 'glass', name: 'Vetro', bg: '#e2e2e2', text: '#1a1a1a', btn: '#ffffff', btnText: '#1a1a1a', font: 'sans-serif', bgStyle: 'mesh', btnRadius: 'lg' as const },
    { id: 'midnight', name: 'Mezzanotte', bg: '#1a2980', text: '#ffffff', btn: '#26d0ce', btnText: '#1a2980', font: 'sans-serif', bgStyle: 'stars', btnRadius: 'full' as const },
    { id: 'coffee', name: 'Caffè', bg: '#3e2723', text: '#d7ccc8', btn: '#5d4037', btnText: '#d7ccc8', font: 'serif', bgStyle: 'noise', btnRadius: 'none' as const },
    { id: 'mint', name: 'Menta Fresca', bg: '#00b09b', text: '#ffffff', btn: '#96c93d', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'gradient-animated', btnRadius: 'full' as const },
    { id: 'blueprint', name: 'Progetto', bg: '#1e3c72', text: '#ffffff', btn: '#2a5298', btnText: '#ffffff', font: 'monospace', bgStyle: 'grid', btnRadius: 'sm' as const },
    { id: 'peach', name: 'Pesca', bg: '#ed4264', text: '#ffffff', btn: '#ffedbc', btnText: '#ed4264', font: 'sans-serif', bgStyle: 'gradient-animated', btnRadius: 'lg' as const },
    { id: 'mono', name: 'Monocromatico', bg: '#111111', text: '#eeeeee', btn: '#333333', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'minimal-lines', btnRadius: 'none' as const },
    { id: 'candy', name: 'Caramella', bg: '#d38312', text: '#ffffff', btn: '#a83279', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'gradient-animated', btnRadius: 'full' as const },
    { id: 'corporate', name: 'Aziendale', bg: '#ffffff', text: '#333333', btn: '#005bea', btnText: '#ffffff', font: 'sans-serif', bgStyle: 'solid', btnRadius: 'sm' as const }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-gray-50 p-6 rounded-2xl space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-gray-200 pb-4">Temi Predefiniti (20+)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => updateTheme({ 
                backgroundColor: t.bg, 
                textColor: t.text, 
                buttonColor: t.btn, 
                buttonTextColor: t.btnText, 
                fontFamily: t.font, 
                backgroundStyle: t.bgStyle as any, 
                buttonRadius: t.btnRadius 
              })}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                page.theme.backgroundColor === t.bg && page.theme.buttonColor === t.btn && page.theme.textColor === t.text
                  ? 'border-black bg-gray-100 shadow-md ring-2 ring-black ring-offset-2'
                  : 'border-gray-200 hover:border-black bg-white'
              }`}
            >
              <div 
                className="w-full h-12 rounded-lg border border-black/10 relative overflow-hidden flex items-center justify-center shadow-inner"
                style={{ background: t.bg }}
              >
                <div 
                  className="w-8 h-4 rounded-full shadow-sm"
                  style={{ background: t.btn }}
                />
                {page.theme.backgroundColor === t.bg && page.theme.buttonColor === t.btn && page.theme.textColor === t.text && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
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
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-gray-200 pb-4">Stile Font</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'sans-serif', label: 'Sans' },
            { id: 'serif', label: 'Serif' },
            { id: 'monospace', label: 'Mono' }
          ].map(font => (
            <button
              key={font.id}
              onClick={() => updateTheme({ fontFamily: font.id })}
              className={`py-3 border-2 transition-all rounded-xl ${
                page.theme.fontFamily === font.id || (font.id === 'sans-serif' && !page.theme.fontFamily)
                  ? 'border-black bg-white shadow-sm' 
                  : 'border-gray-200 hover:border-black'
              }`}
            >
              <span className="font-bold text-xs uppercase tracking-widest block" style={{ fontFamily: font.id }}>
                {font.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-gray-200 pb-4">Sfondo Animato / Grafica</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'solid', label: 'Tinta Unita' },
            { id: 'gradient-animated', label: 'Gradiente Animato' },
            { id: 'mesh', label: 'Mesh' },
            { id: 'dots', label: 'Pois' },
            { id: 'grid', label: 'Griglia' },
            { id: 'noise', label: 'Rumore' },
            { id: 'stars', label: 'Stelle Animate' },
            { id: 'minimal-lines', label: 'Linee Minimali' }
          ].map(bg => (
            <button
              key={bg.id}
              onClick={() => updateTheme({ backgroundStyle: bg.id as any })}
              className={`py-3 px-2 border-2 transition-all rounded-xl ${
                (page.theme.backgroundStyle || 'solid') === bg.id
                  ? 'border-black bg-white shadow-sm' 
                  : 'border-gray-200 hover:border-black'
              }`}
            >
              <span className="font-bold text-[10px] uppercase tracking-widest block text-center">
                {bg.label}
              </span>
            </button>
          ))}
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

import { Video, Code, Trash2 } from 'lucide-react';

function MicroblogEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [showSeo, setShowSeo] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const insertFormat = (format: string) => {
    const textarea = document.getElementById('microblog-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    let newText = text;
    if (format === 'bold') newText = before + '**' + (selected || 'grassetto') + '**' + after;
    if (format === 'italic') newText = before + '_' + (selected || 'corsivo') + '_' + after;
    if (format === 'quote') newText = before + '\n> ' + (selected || 'citazione') + after;
    if (format === 'link') newText = before + '[' + (selected || 'testo') + '](url)' + after;
    if (format === 'h1') newText = before + '\n# ' + (selected || 'Titolo') + after;
    
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  const handlePost = () => {
    if (!title || !content) return;
    const newModule: any = {
      type: 'microblog',
      id: editingId || Date.now().toString(),
      title,
      content,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      embedCode: embedCode || undefined,
      seo: {
        title: seoTitle || undefined,
        description: seoDescription || undefined
      },
      date: new Date().toISOString(),
      tags: bgColor ? [bgColor] : []
    };
    
    if (editingId) {
      setPage({ ...page, modules: page.modules.map(m => m.id === editingId ? newModule : m) });
    } else {
      setPage({ ...page, modules: [newModule, ...(page.modules || [])] });
    }
    
    setTitle('');
    setContent('');
    setImageUrl('');
    setVideoUrl('');
    setEmbedCode('');
    setSeoTitle('');
    setSeoDescription('');
    setShowSeo(false);
    setShowCode(false);
    setEditingId(null);
    setBgColor('');
    toast.success(editingId ? 'Post modificato!' : 'Post aggiunto alla pagina!');
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setTitle(m.title || '');
    setContent(m.content || '');
    setImageUrl(m.imageUrl || '');
    setVideoUrl(m.videoUrl || '');
    setEmbedCode(m.embedCode || '');
    setSeoTitle(m.seo?.title || '');
    setSeoDescription(m.seo?.description || '');
    setBgColor(m.tags?.[0] || '');
    setShowSeo(!!(m.seo?.title || m.seo?.description));
    setShowCode(!!m.embedCode);
    
    // Scroll to form
    const form = document.getElementById('microblog-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    setPage({ ...page, modules: page.modules.filter(m => m.id !== id) });
    toast.success('Post eliminato');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Micro-Blog & Contenuti</h2>
        <p className="text-gray-500 text-sm">Condividi mini-saggi, pensieri o embed di video TikTok per non sovraccaricare il pubblico.</p>
      </div>

      <div id="microblog-form" className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
        <input 
          type="text" 
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo della Storia..." 
          className="w-full bg-transparent border-b border-gray-200 py-2 font-bold mb-4 focus:outline-none focus:border-black" 
        />
        <div className="flex items-center gap-1 mb-2 border-b border-gray-100 pb-2 overflow-x-auto">
          <button type="button" onClick={() => insertFormat('bold')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Grassetto"><Bold className="w-4 h-4" /></button>
          <button type="button" onClick={() => insertFormat('italic')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Corsivo"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button type="button" onClick={() => insertFormat('h1')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Titolo"><Type className="w-4 h-4" /></button>
          <button type="button" onClick={() => insertFormat('quote')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Citazione"><Quote className="w-4 h-4" /></button>
          <button type="button" onClick={() => insertFormat('link')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Link"><Link2 className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <div className="flex items-center gap-1 relative group">
            <button type="button" className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1" title="Colore Sfondo">
              <Palette className="w-4 h-4" />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white shadow-lg border border-gray-200 rounded-lg p-2 gap-1 z-10">
              {['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e5e7eb', '#1a1a1a'].map(c => (
                <button type="button" key={c} onClick={() => setBgColor(c === 'transparent' ? '' : c)} className="w-6 h-6 rounded-full border border-gray-300" style={{ background: c }}></button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setContent(c => c + ' 😊')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Emoji"><Smile className="w-4 h-4" /></button>
        </div>
        <textarea 
          id="microblog-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Scrivi qui la tua storia..." 
          className="w-full bg-transparent border-none text-sm text-gray-800 resize-none h-32 focus:outline-none"
          style={{ backgroundColor: bgColor || 'transparent', padding: bgColor ? '12px' : '0', borderRadius: '8px', color: bgColor === '#1a1a1a' ? 'white' : 'inherit' }}
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
        {videoUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-48">
            <video src={videoUrl} controls className="w-full h-full object-contain" />
            <button 
              onClick={() => setVideoUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        
        {showCode && (
          <div className="mb-4 space-y-3 bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Embed Code (HTML/JS)</h4>
            <textarea 
              value={embedCode}
              onChange={e => setEmbedCode(e.target.value)}
              placeholder="Incolla qui il codice iframe, script o HTML..." 
              className="w-full bg-transparent border border-gray-200 p-2 text-sm resize-none h-24 focus:outline-none focus:border-black font-mono rounded"
            ></textarea>
          </div>
        )}
        
        {showSeo && (
          <div className="mb-4 space-y-3 bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Impostazioni SEO</h4>
            <input 
              type="text" 
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              placeholder="SEO Title (opzionale)" 
              className="w-full bg-transparent border-b border-gray-200 py-1 text-sm focus:outline-none focus:border-black" 
            />
            <textarea 
              value={seoDescription}
              onChange={e => setSeoDescription(e.target.value)}
              placeholder="SEO Description (opzionale)" 
              className="w-full bg-transparent border-none text-sm resize-none h-16 focus:outline-none"
            ></textarea>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 pt-2 border-t border-gray-200 gap-4">
          <div className="flex items-center gap-4">
            <label className="text-[10px] flex flex-col items-center gap-1 font-bold text-gray-400 hover:text-black uppercase tracking-wider cursor-pointer transition-colors">
              <ImageIcon className="w-4 h-4" />
              <span>Foto</span>
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
            <label className="text-[10px] flex flex-col items-center gap-1 font-bold text-gray-400 hover:text-black uppercase tracking-wider cursor-pointer transition-colors">
              <Video className="w-4 h-4" />
              <span>Video</span>
              <input 
                type="file" 
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setVideoUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            <button 
              onClick={() => setShowSeo(!showSeo)}
              className={`text-[10px] flex flex-col items-center gap-1 font-bold uppercase tracking-wider transition-colors ${showSeo ? 'text-black' : 'text-gray-400 hover:text-black'}`}
            >
              <Globe className="w-4 h-4" />
              <span>SEO</span>
            </button>
            <button 
              onClick={() => setShowCode(!showCode)}
              className={`text-[10px] flex flex-col items-center gap-1 font-bold uppercase tracking-wider transition-colors ${showCode || embedCode ? 'text-black' : 'text-gray-400 hover:text-black'}`}
            >
              <Code className="w-4 h-4" />
              <span>Codice</span>
            </button>
          </div>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <span className="text-[10px] font-mono text-gray-400">{content.length} / 500</span>
            <button 
              onClick={handlePost}
              className="px-6 py-2 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:opacity-90 w-full sm:w-auto"
            >{editingId ? 'Salva Modifiche' : 'Pubblica'}</button>
            {editingId && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setTitle('');
                  setContent('');
                  setImageUrl('');
                  setVideoUrl('');
                  setEmbedCode('');
                  setSeoTitle('');
                  setSeoDescription('');
                  setShowSeo(false);
                  setShowCode(false);
                  setBgColor('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg uppercase tracking-widest hover:bg-gray-300 w-full sm:w-auto mt-2 sm:mt-0"
              >Annulla</button>
            )}
          </div>
        </div>
      </div>
      {page.modules && page.modules.filter(m => m.type === 'microblog').length > 0 && (
        <div className="mt-12 space-y-4">
          <h3 className="font-bold uppercase tracking-widest text-xs text-gray-500 mb-4">Post Pubblicati</h3>
          {page.modules.filter(m => m.type === 'microblog').map((m: any) => (
            <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between group">
              <div>
                <h4 className="font-black italic text-lg">{m.title}</h4>
                <p className="text-gray-500 text-xs truncate max-w-sm mt-1">{m.content.substring(0, 100)}...</p>
                <div className="text-[10px] text-gray-400 mt-2 font-mono">{new Date(m.date).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(m)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"
                  title="Modifica"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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

function CareerjetEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const careerjetModule = page.modules.find(m => m.type === 'careerjet');
  const hasCareerjet = !!careerjetModule;

  const toggleCareerjet = () => {
    if (hasCareerjet) {
      setPage({ ...page, modules: page.modules.filter(m => m.type !== 'careerjet') });
    } else {
      setPage({
        ...page,
        modules: [...page.modules, {
          id: Date.now().toString(),
          type: 'careerjet' as const,
          title: 'Annunci di Lavoro',
          keywords: 'sviluppatore',
          location: 'Milano',
          maxResults: 5
        }]
      });
    }
  };

  const updateCareerjet = (updates: any) => {
    setPage({
      ...page,
      modules: page.modules.map(m => m.type === 'careerjet' ? { ...m, ...updates } : m)
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Lavoro (Careerjet)</h2>
        <p className="text-gray-500">Importa annunci di lavoro aggiornati dinamicamente da Careerjet tramite API.</p>
      </div>

      <div className="p-6 bg-white border border-gray-200 rounded-2xl flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold">Annunci di Lavoro</h3>
            <p className="text-sm text-gray-500">Mostra gli ultimi annunci basati su ruolo e posizione.</p>
          </div>
        </div>
        <button 
          onClick={toggleCareerjet}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${hasCareerjet ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-black text-white hover:opacity-90'}`}
        >
          {hasCareerjet ? 'Rimuovi Modulo' : 'Aggiungi Modulo'}
        </button>
      </div>

      {hasCareerjet && careerjetModule && careerjetModule.type === 'careerjet' && (
        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold border-b border-gray-100 pb-2 mb-4">Configurazione API Careerjet</h3>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Titolo Sezione</label>
            <input 
              type="text" 
              value={careerjetModule.title || ''}
              onChange={(e) => updateCareerjet({ title: e.target.value })}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Keywords (Es. Sviluppatore)</label>
              <input 
                type="text" 
                value={careerjetModule.keywords || ''}
                onChange={(e) => updateCareerjet({ keywords: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors"
                placeholder="es. Sviluppatore React"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Luogo (Es. Milano)</label>
              <input 
                type="text" 
                value={careerjetModule.location || ''}
                onChange={(e) => updateCareerjet({ location: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors"
                placeholder="es. Milano o Remote"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">ID Affiliato Careerjet (Opzionale)</label>
            <input 
              type="text" 
              value={careerjetModule.affid || ''}
              onChange={(e) => updateCareerjet({ affid: e.target.value })}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors mb-4"
              placeholder="es. 22222222222222222222222222222222"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Chiave API Careerjet (Opzionale, v4)</label>
            <input 
              type="text" 
              value={careerjetModule.apiKey || ''}
              onChange={(e) => updateCareerjet({ apiKey: e.target.value })}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors mb-4"
              placeholder="Inserisci la tua API Key se possiedi un account dev"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2">Numero Risultati (Max 10)</label>
            <input 
              type="number" 
              min="1"
              max="10"
              value={careerjetModule.maxResults || 5}
              onChange={(e) => updateCareerjet({ maxResults: parseInt(e.target.value) || 5 })}
              className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-center space-x-3 mb-4">
              <input 
                type="checkbox"
                checked={careerjetModule.showWidget || false}
                onChange={(e) => updateCareerjet({ showWidget: e.target.checked })}
                className="w-4 h-4 text-black focus:ring-black border-gray-300 rounded"
              />
              <span className="text-sm font-medium">Mostra barra di ricerca (Widget)</span>
            </label>

            {careerjetModule.showWidget && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2">URL del Widget (data-url)</label>
                <input 
                  type="text" 
                  value={careerjetModule.widgetUrl || ''}
                  onChange={(e) => updateCareerjet({ widgetUrl: e.target.value })}
                  className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-black transition-colors"
                  placeholder="es. https://widget.careerjet.net/search-box/..."
                />
                <p className="text-xs text-gray-500 mt-2">Copia l'URL presente nell'attributo data-url del codice fornito da Careerjet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
