import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Markdown from 'react-markdown';
import { BioPage, BioLink, SocialLink, BioModule, AppBanner } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, Twitter, Youtube, Linkedin, Github, Facebook, Search, 
  ExternalLink, Coffee, Calendar, Download, Newspaper, SearchX, Mail, CheckCircle2
, Folder } from 'lucide-react';
import { subscribeToNewsletter, getAllBanners, trackLinkClick } from '../lib/db';

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
      <div className="flex flex-col gap-2">
        <input 
          type="email" 
          required
          placeholder={translations[lang].newsletterPlaceholder} 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-black transition-colors"
          disabled={status === 'loading'}
        />
        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="w-full px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
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
  const [confirmLink, setConfirmLink] = useState<{id?: string, url: string} | null>(null);

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
      className={cn("min-h-screen w-full flex flex-col items-center py-12 px-4 relative z-0", isPreview ? "h-full overflow-y-auto" : "")}
      style={{ 
        backgroundColor: theme.backgroundColor, 
        color: theme.textColor,
        fontFamily: theme.fontFamily 
      }}
    >
      {/* Background Layer */}
      {theme.backgroundStyle && theme.backgroundStyle !== 'solid' && (
        <div className="fixed inset-0 -z-10 pointer-events-none opacity-50" 
          style={{
            background: theme.backgroundStyle === 'gradient-animated' 
              ? 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1), rgba(255,255,255,0.1))'
              : theme.backgroundStyle === 'mesh'
              ? 'radial-gradient(at 40% 20%, rgba(255,255,255,0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(0,0,0,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(255,255,255,0.1) 0px, transparent 50%)'
              : theme.backgroundStyle === 'dots'
              ? 'radial-gradient(rgba(0,0,0,0.2) 1px, transparent 1px)'
              : theme.backgroundStyle === 'grid'
              ? 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)'
              : theme.backgroundStyle === 'noise'
              ? 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.3%22/%3E%3C/svg%3E")'
              : theme.backgroundStyle === 'minimal-lines'
              ? 'repeating-linear-gradient( 45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 11px )'
              : theme.backgroundStyle === 'stars'
              ? 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0, transparent 2px)'
              : 'transparent',
            backgroundSize: theme.backgroundStyle === 'dots' ? '20px 20px' 
              : theme.backgroundStyle === 'grid' ? '40px 40px' 
              : theme.backgroundStyle === 'stars' ? '100px 100px'
              : theme.backgroundStyle === 'noise' ? '200px 200px'
              : '400% 400%',
            animation: theme.backgroundStyle === 'gradient-animated' ? 'gradient-shift 15s ease infinite'
              : theme.backgroundStyle === 'stars' ? 'twinkle 4s ease-in-out infinite alternate'
              : 'none'
          }}
        />
      )}
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
                
                const roundedClass = theme.buttonRadius === 'full' ? 'rounded-[2rem]' : 
                      theme.buttonRadius === 'lg' ? 'rounded-2xl' : 
                      theme.buttonRadius === 'md' ? 'rounded-xl' : 
                      theme.buttonRadius === 'sm' ? 'rounded-md' : 'rounded-none';

                if (link.link_type === 'folder') {
                  return (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      className="w-full"
                    >
                      <details className="group w-full bg-white border-2 border-black overflow-hidden" style={{ borderRadius: theme.buttonRadius === 'full' ? '1.5rem' : theme.buttonRadius === 'lg' ? '1rem' : theme.buttonRadius === 'md' ? '0.75rem' : theme.buttonRadius === 'sm' ? '0.375rem' : '0' }}>
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none outline-none font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-colors">
                          <span className="flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            {link.title || 'Cartella'}
                          </span>
                          <span className="transition group-open:rotate-180">
                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                          </span>
                        </summary>
                        <div className="p-4 bg-gray-50 border-t-2 border-black flex flex-col gap-3">
                          {(link.children || []).map(child => (
                            <a 
                              key={child.id} 
                              href={child.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "block w-full py-3 px-4 bg-white border-2 border-black text-center text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all hover:scale-[1.02]",
                                roundedClass
                              )}
                            >
                              {child.title || child.url}
                            </a>
                          ))}
                          {(link.children || []).length === 0 && (
                            <p className="text-center text-gray-400 text-xs py-2">Nessun link nella cartella</p>
                          )}
                        </div>
                      </details>
                    </motion.div>
                  );
                }

                if (link.link_type === 'youtube' && link.url) {
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                  const match = link.url.match(regExp);
                  const ytId = (match && match[2].length === 11) ? match[2] : null;
                  if (ytId) {
                    return (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className={cn("w-full overflow-hidden border-2 border-black", roundedClass)}
                      >
                        <iframe 
                          className="w-full aspect-video" 
                          src={`https://www.youtube.com/embed/${ytId}`} 
                          title={link.title} 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                        {link.title && <div className="p-3 bg-white text-black font-bold text-xs uppercase tracking-widest text-center border-t-2 border-black">{link.title}</div>}
                      </motion.div>
                    );
                  }
                }
                
                if (link.link_type === 'spotify' && link.url) {
                  const regExp = /spotify.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/;
                  const match = link.url.match(regExp);
                  if (match) {
                    const type = match[1];
                    const id = match[2];
                    return (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className={cn("w-full overflow-hidden", roundedClass)}
                      >
                        <iframe 
                          src={`https://open.spotify.com/embed/${type}/${id}?utm_source=generator`} 
                          width="100%" 
                          height="152" 
                          frameBorder="0" 
                          allowFullScreen={false} 
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                          loading="lazy"
                        ></iframe>
                      </motion.div>
                    );
                  }
                }

                const isAmazon = link.link_type === 'amazon';

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
                      roundedClass,
                      "border-2 border-black hover:scale-[1.02]",
                      (link.description || link.image || isAmazon) ? "p-0 text-left bg-white" : "py-4 px-6 text-center text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white"
                    )}
                    style={(link.description || link.image || isAmazon) ? {} : { 
                      backgroundColor: theme.buttonColor !== 'transparent' ? theme.buttonColor : undefined, 
                      color: theme.buttonTextColor 
                    }}
                  >
                    {(link.description || link.image || isAmazon) ? (
                      <div className="flex items-center">
                        {link.image && (
                          <div className={cn("flex-shrink-0 border-r-2 border-black", isAmazon ? "w-28 h-28 sm:w-32 sm:h-32 p-2 bg-white" : "w-24 h-24 sm:w-28 sm:h-28")}>
                            <img src={link.image} alt="" className={cn("w-full h-full", isAmazon ? "object-contain" : "object-cover")} />
                          </div>
                        )}
                        <div className="p-4 flex-1">
                          {isAmazon && <div className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] mb-1">Amazon Picks</div>}
                          <h3 className="text-xs font-black uppercase tracking-widest text-black">{link.title}</h3>
                          {link.description && (
                            <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{link.description}</p>
                          )}
                          {isAmazon && link.price && (
                            <div className="mt-2 text-sm font-black text-black">{link.price}</div>
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
                      <div className="space-y-2 text-left" style={{
                        backgroundColor: module.tags?.[0]?.startsWith('#') ? module.tags[0] : 'transparent',
                        padding: module.tags?.[0]?.startsWith('#') ? '12px' : '0',
                        borderRadius: '8px',
                        color: module.tags?.[0] === '#1a1a1a' ? 'white' : 'inherit'
                      }}>
                        <h5 className="text-[10px] font-bold mb-2">{module.title}</h5>
                        <div className="text-[10px] leading-relaxed markdown-body">
                          <Markdown>{module.content}</Markdown>
                        </div>
                        {module.imageUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <img src={module.imageUrl} alt="" className="w-full h-auto object-cover" />
                          </div>
                        )}
                        {module.videoUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <video src={module.videoUrl} controls className="w-full h-auto object-cover" />
                          </div>
                        )}
                        {module.embedCode && (
                          <div className="mt-3 rounded-lg overflow-hidden w-full" dangerouslySetInnerHTML={{ __html: module.embedCode }} />
                        )}
                      </div>
                    )}
                    {module.type === 'careerjet' && (
                      <CareerjetModule module={module} />
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
                onClick={() => {
                  if (!isPreview && confirmLink.id) {
                    trackLinkClick(page.id, confirmLink.id);
                  }
                  setConfirmLink(null);
                }}
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

const CareerjetModule = ({ module }: { module: any }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (module.showWidget) {
      const scriptId = 'cj-search-box-script';
      if (!document.getElementById(scriptId)) {
        const js = document.createElement('script');
        js.id = scriptId;
        js.async = true;
        js.src = 'https://static.careerjet.org/js/all_widget_search_box_3rd_party.min.js?t=' + Date.now();
        document.body.appendChild(js);
      }
      return;
    }

    const fetchJobs = async () => {
      try {
        const queryParams: Record<string, string> = {
          keywords: module.keywords || '',
          location: module.location || '',
          maxResults: (module.maxResults || 5).toString()
        };
        if (module.affid) {
          queryParams.affid = module.affid;
        }
        if (module.apiKey) {
          queryParams.apiKey = module.apiKey;
        }
        const query = new URLSearchParams(queryParams);
        const res = await fetch(`/api/careerjet?${query.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'API Error');
        }
        setJobs(data.jobs || []);
      } catch (err: any) {
        console.error("Error fetching jobs:", err);
        setJobs([{ error: err.message }]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [module.keywords, module.location, module.maxResults, module.showWidget, module.widgetUrl]);

  if (module.showWidget) {
    return (
      <div className="w-full text-left">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest">{module.title || 'Cerca Lavoro'}</h3>
        </div>
        {!module.widgetUrl ? (
          <p className="text-[10px] text-gray-500 py-4">URL del widget non configurato.</p>
        ) : (
          <div className="cj-search-box" data-url={module.widgetUrl}></div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full text-left">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest">{module.title || 'Annunci di Lavoro'}</h3>
      </div>
      
      {loading ? (
        <div className="py-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"></div>
        </div>
      ) : jobs.length > 0 && jobs[0].error ? (
        <div className="bg-red-50 text-red-500 text-[10px] p-3 rounded-lg border border-red-100">
          <strong>Errore Careerjet:</strong> {jobs[0].error}
          <br/>
          {jobs[0].error.includes("Unauthorized access from IP") ? (
            <span>Per utilizzare la chiave API v4, devi inserire l'IP indicato nell'errore (es. 34.96.39.181) nella whitelist (IP consentiti) all'interno del pannello sviluppatori del tuo account Careerjet. In alternativa, rimuovi la chiave API dal pannello del Bio Site per utilizzare l'API pubblica gratuita.</span>
          ) : (
            <span>Se stai utilizzando la chiave API v4, verifica che sia corretta. Se non ne hai una, rimuovi la chiave API dal pannello per usare quella pubblica.</span>
          )}
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-[10px] text-gray-500 text-center py-4">Nessun annuncio trovato.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any, idx: number) => (
            <a 
              key={idx} 
              href={job.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-black transition-colors group"
            >
              <h4 className="font-bold text-sm text-black group-hover:underline line-clamp-1">{job.title}</h4>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{job.company}</span>
                <span className="text-[10px] text-gray-400">{job.locations}</span>
                {job.salary && <span className="text-[10px] text-green-600 font-bold">{job.salary}</span>}
              </div>
            </a>
          ))}
          <div className="text-[9px] text-center text-gray-400 pt-2 opacity-60">
            Powered by Careerjet
          </div>
        </div>
      )}
    </div>
  );
};
