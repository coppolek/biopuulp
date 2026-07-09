import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BioPage, BioLink, SocialLink, BioModule, AppBanner } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, Twitter, Youtube, Linkedin, Github, Facebook, Search, 
  ExternalLink, Coffee, Calendar, Download, Newspaper, SearchX, Mail, CheckCircle2
} from 'lucide-react';
import { subscribeToNewsletter, getAllBanners } from '../lib/db';

const translations = {
  it: {
    newsletterTitle: 'Iscriviti alla Newsletter',
    newsletterPlaceholder: 'La tua email...',
    newsletterButton: 'Iscriviti',
    newsletterSuccess: 'Iscrizione completata!',
    newsletterError: "Errore durante l'iscrizione. Riprova.",
    searchPlaceholder: 'Cerca link o argomenti...',
    noResults: 'Nessun risultato per',
    contentsTitle: 'Contenuti'
  },
  en: {
    newsletterTitle: 'Subscribe to Newsletter',
    newsletterPlaceholder: 'Your email...',
    newsletterButton: 'Subscribe',
    newsletterSuccess: 'Subscription complete!',
    newsletterError: 'Error subscribing. Try again.',
    searchPlaceholder: 'Search links or topics...',
    noResults: 'No results for',
    contentsTitle: 'Contents'
  },
  es: {
    newsletterTitle: 'Suscribirse al boletín',
    newsletterPlaceholder: 'Tu correo electrónico...',
    newsletterButton: 'Suscribirse',
    newsletterSuccess: '¡Suscripción completada!',
    newsletterError: 'Error al suscribirse. Inténtalo de nuevo.',
    searchPlaceholder: 'Buscar enlaces o temas...',
    noResults: 'Sin resultados para',
    contentsTitle: 'Contenido'
  }
};

const NewsletterForm = ({ module, pageId, lang }: { module: any, pageId: string, lang: 'it' | 'en' | 'es' }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    try {
      await subscribeToNewsletter(pageId, email);
      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-4 space-y-2 text-green-600">
        <CheckCircle2 className="w-8 h-8" />
        <p className="text-sm font-bold">{translations[lang].newsletterSuccess}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full text-left">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-4 h-4" />
        <h3 className="text-xs font-black uppercase tracking-widest">{module.title || translations[lang].newsletterTitle}</h3>
      </div>
      {module.description && <p className="text-[10px] text-gray-500 mb-3">{module.description}</p>}
      <div className="flex gap-2">
        <input 
          type="email" 
          required
          placeholder={translations[lang].newsletterPlaceholder} 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-black transition-colors"
          disabled={status === 'loading'}
        />
        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === 'loading' ? '...' : translations[lang].newsletterButton}
        </button>
      </div>
      {status === 'error' && <p className="text-[10px] text-red-500 mt-2">{translations[lang].newsletterError}</p>}
    </form>
  );
};

const SocialIcon = ({ platform, className }: { platform: string, className?: string }) => {
  switch (platform) {
    case 'instagram': return <Instagram className={className} />;
    case 'twitter': return <Twitter className={className} />;
    case 'youtube': return <Youtube className={className} />;
    case 'linkedin': return <Linkedin className={className} />;
    case 'github': return <Github className={className} />;
    case 'facebook': return <Facebook className={className} />;
    case 'tiktok': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>;
    default: return <ExternalLink className={className} />;
  }
};

export default function PublicBioPage({ page, isPreview = false }: { page: BioPage, isPreview?: boolean }) {
  const { profile, theme, links, socials, modules } = page;
  const lang = page.language || 'it';
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [confirmLink, setConfirmLink] = useState<{url: string} | null>(null);

  useEffect(() => {
    if (!isPreview) {
      getAllBanners().then(data => {
        setBanners(data.filter(b => b.active));
      }).catch(err => console.error("Error loading banners", err));
    }
  }, [isPreview]);

  const topBanners = banners.filter(b => b.position === 'top');
  const bottomBanners = banners.filter(b => b.position === 'bottom');

  const blocks = [
    ...links.map(l => ({ ...l, _type: 'link' as const })),
    ...modules.map(m => ({ ...m, _type: 'module' as const }))
  ];
  
  const layoutOrder = page.layoutOrder || blocks.map(b => b.id);
  const sortedBlocks = layoutOrder.map(id => blocks.find(b => b.id === id)).filter(Boolean) as typeof blocks;
  const missingBlocks = blocks.filter(b => !layoutOrder.includes(b.id));
  const finalBlocks = [...sortedBlocks, ...missingBlocks];

  const filteredBlocks = finalBlocks.filter(block => {
    if (block._type === 'link') {
      return block.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (block as BioLink).tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return searchQuery === ''; // hide modules when searching
  });

  return (
    <>
      <Helmet>
        <title>{page.seo?.title || page.profile.name + ' - Link in Bio'}</title>
        <meta name="description" content={page.seo?.description || page.profile.bio} />
        <meta property="og:title" content={page.seo?.title || page.profile.name + ' - Link in Bio'} />
        <meta property="og:description" content={page.seo?.description || page.profile.bio} />
        <meta property="og:image" content={page.seo?.imageUrl || page.profile.avatarUrl} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
    <div 
      className={cn("min-h-screen w-full flex flex-col items-center py-12 px-4 relative", isPreview ? "h-full overflow-y-auto" : "")}
      style={{ 
        backgroundColor: theme.backgroundColor, 
        color: theme.textColor,
        fontFamily: theme.fontFamily 
      }}
    >
      {/* Top Banners */}
      {!isPreview && topBanners.length > 0 && (
        <div className="w-full max-w-md flex flex-col gap-4 mb-8">
          {topBanners.map(banner => (
            <div key={banner.id} className="w-full overflow-hidden rounded-xl border border-black/10 shadow-sm bg-black/5">
              {banner.type === 'image' && banner.imageUrl && (
                <a href={banner.linkUrl}
                    onClick={(e) => { if (banner.linkUrl) { e.preventDefault(); setConfirmLink({ url: banner.linkUrl }); } }} className="block w-full">
                  <img src={banner.imageUrl} alt={banner.name} className="w-full h-auto object-cover" />
                </a>
              )}
              {banner.type === 'code' && banner.code && (
                <div className="w-full" dangerouslySetInnerHTML={{ __html: banner.code }} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md flex flex-col items-center space-y-8">
        
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-4"
        >
          <div className="w-20 h-20 bg-gray-200 rounded-full mb-2 border-2 border-black overflow-hidden bg-center bg-cover">
            <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter">{profile.name}</h1>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-widest mt-1 max-w-xs">{profile.bio}</p>
          </div>
        </motion.div>

        {/* Social Organizer */}
        {socials.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-4 mt-6"
          >
            {socials.map((social, idx) => (
              <a 
                key={idx}
                href={social.url}
                onClick={(e) => { e.preventDefault(); setConfirmLink({ url: social.url }); }}
                className="w-8 h-8 border border-black rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                aria-label={social.platform}
              >
                <SocialIcon platform={social.platform} className="w-4 h-4" />
              </a>
            ))}
          </motion.div>
        )}

        {/* Native Search */}
        {links.length > 3 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="w-full relative"
          >
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 opacity-50" />
            </div>
            <input
              type="text"
              placeholder={translations[lang].searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pl-10 pr-4 bg-black/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-white/30 transition-all placeholder:text-white/50"
              style={{ color: theme.textColor }}
            />
          </motion.div>
        )}

        {/* Unified Blocks */}
        <div className="w-full space-y-4 mt-6">
          <AnimatePresence>
            {filteredBlocks.map((block, idx) => {
              if (block._type === 'link') {
                const link = block as BioLink;
                return (
                  <motion.a
                    key={link.id}
                    href={link.url}
                    onClick={(e) => { e.preventDefault(); setConfirmLink(link); }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className={cn(
                      "block w-full transition-all cursor-pointer overflow-hidden relative",
                      theme.buttonRadius === 'full' ? 'rounded-[2rem]' : 
                      theme.buttonRadius === 'lg' ? 'rounded-2xl' : 
                      theme.buttonRadius === 'md' ? 'rounded-xl' : 
                      theme.buttonRadius === 'sm' ? 'rounded-md' : 'rounded-none',
                      "border-2 border-black hover:scale-[1.02]",
                      (link.description || link.image) ? "p-0 text-left" : "py-4 px-6 text-center text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white"
                    )}
                    style={{ 
                      backgroundColor: theme.buttonColor !== 'transparent' ? theme.buttonColor : undefined, 
                      color: theme.buttonTextColor 
                    }}
                  >
                    {(link.description || link.image) ? (
                      <div className="flex items-center">
                        {link.image && (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 border-r-2 border-black">
                            <img src={link.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4 flex-1">
                          <h3 className="text-xs font-black uppercase tracking-widest">{link.title}</h3>
                          {link.description && (
                            <p className="text-[10px] opacity-80 mt-1 line-clamp-2">{link.description}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      link.title
                    )}
                  </motion.a>
                );
              } else {
                const module = block as BioModule;
                return (
                  <motion.div 
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-black"
                  >
                    {module.type === 'tip_jar' && (
                      <div className="text-center space-y-4">
                        <Coffee className="w-6 h-6 mx-auto opacity-80" />
                        <h3 className="text-xs font-black uppercase tracking-widest">{module.title}</h3>
                        <p className="text-[10px] text-gray-500">{module.description}</p>
                        <div className="flex justify-center gap-3">
                          {module.suggestedAmounts.map(amount => (
                            <button 
                              key={amount}
                              className="px-4 py-2 border-2 border-black rounded-md hover:bg-black hover:text-white transition-colors text-xs font-bold"
                            >
                              {amount} {module.currency}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {module.type === 'digital_product' && (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-widest">{module.title}</h3>
                          <p className="text-[10px] text-gray-500 mt-1">{module.description}</p>
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 border-2 border-black rounded-md bg-black text-white text-xs font-bold hover:bg-transparent hover:text-black transition-colors">
                          <Download className="w-3 h-3" />
                          {module.price}€
                        </button>
                      </div>
                    )}
                    {module.type === 'microblog' && (
                      <div className="space-y-2 text-left">
                        <h5 className="text-[10px] font-bold mb-1">{module.title}</h5>
                        <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">{module.content}</p>
                        {module.imageUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-gray-100/10">
                            <img src={module.imageUrl} alt="" className="w-full h-auto object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                    {module.type === 'newsletter' && (
                      <NewsletterForm module={module} pageId={page.id} lang={lang} />
                    )}
                  </motion.div>
                );
              }
            })}
          </AnimatePresence>
          {filteredBlocks.length === 0 && searchQuery && (
            <div className="text-center py-6 opacity-60 flex flex-col items-center">
              <SearchX className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-bold">{translations[lang].noResults} "{searchQuery}"</p>
            </div>
          )}
        </div>
        {/* Footer Brand */}
        <div className="pt-12 pb-4 flex items-center justify-center">
          <a href="#" className="text-[10px] font-black tracking-widest uppercase opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2">
             <div className="w-3 h-3 rounded bg-current flex items-center justify-center text-white"></div>
             PUULP
          </a>
        </div>
      </div>

      {/* Bottom Banners */}
      {!isPreview && bottomBanners.length > 0 && (
        <div className="w-full max-w-md flex flex-col gap-4 mt-8">
          {bottomBanners.map(banner => (
            <div key={banner.id} className="w-full overflow-hidden rounded-xl border border-black/10 shadow-sm bg-black/5">
              {banner.type === 'image' && banner.imageUrl && (
                <a href={banner.linkUrl}
                    onClick={(e) => { if (banner.linkUrl) { e.preventDefault(); setConfirmLink({ url: banner.linkUrl }); } }} className="block w-full">
                  <img src={banner.imageUrl} alt={banner.name} className="w-full h-auto object-cover" />
                </a>
              )}
              {banner.type === 'code' && banner.code && (
                <div className="w-full" dangerouslySetInnerHTML={{ __html: banner.code }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link Confirmation Modal */}
      {confirmLink && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmLink(null)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-[#1A1A1A]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-black">Stai uscendo dalla pagina</h3>
            <p className="text-gray-500 mb-6 text-sm">Stai per visitare un sito web esterno. Vuoi continuare?</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmLink(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-500 font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors text-xs"
              >
                Annulla
              </button>
              <a 
                href={confirmLink.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setConfirmLink(null)}
                className="flex-1 px-4 py-3 bg-[#1A1A1A] text-white font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2 text-xs"
              >
                Continua
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </>

  );
}
