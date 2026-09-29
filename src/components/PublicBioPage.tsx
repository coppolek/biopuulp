import React, { useState, useEffect } from 'react';

import Markdown from 'react-markdown';
import { BioPage, BioLink, SocialLink, BioModule, AppBanner } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, Twitter, Youtube, Linkedin, Github, Facebook, Search, 
  ExternalLink, Coffee, Calendar, Download, Newspaper, SearchX, Mail, CheckCircle2
, Folder, DollarSign, BookOpen, Clock, Share2, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
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


interface MicroblogArticleProps {
  module: BioModule & {
    title?: string;
    content?: string;
    imageUrl?: string;
    videoUrl?: string;
    embedCode?: string;
    date?: string;
    tags?: string[];
    seo?: { title?: string; description?: string };
  };
  theme: BioPage["theme"];
  lang?: "it" | "en" | "es";
}

const MicroblogArticleCard = ({ module, theme, lang = "it" }: MicroblogArticleProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const customBg = module.tags?.[0]?.startsWith("#") ? module.tags[0] : null;
  const isDarkCustomBg = customBg === "#1a1a1a";
  const isLightCustomBg = customBg && customBg !== "#1a1a1a";

  const content = module.content || "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  const formattedDate = module.date
    ? new Date(module.date).toLocaleDateString(
        lang === "it" ? "it-IT" : lang === "es" ? "es-ES" : "en-US",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : null;

  const isLong = content.length > 320 || content.split("\n").length > 4;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: module.title || "Articolo",
      text: module.title || "",
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const markdownComponents = {
    h1: ({ ...props }: any) => (
      <h3 className="text-base sm:text-lg font-black tracking-tight mt-4 mb-2 text-current" {...props} />
    ),
    h2: ({ ...props }: any) => (
      <h4 className="text-sm sm:text-base font-extrabold tracking-tight mt-3 mb-1.5 text-current" {...props} />
    ),
    h3: ({ ...props }: any) => (
      <h5 className="text-xs sm:text-sm font-bold tracking-tight mt-2.5 mb-1 opacity-90 text-current" {...props} />
    ),
    p: ({ ...props }: any) => (
      <p className="text-xs sm:text-[13px] leading-relaxed mb-3 last:mb-0 opacity-90 font-normal" {...props} />
    ),
    blockquote: ({ ...props }: any) => (
      <blockquote
        className="border-l-3 border-indigo-500/80 pl-3.5 py-1.5 my-3 italic text-xs sm:text-[13px] bg-black/[0.03] dark:bg-white/[0.04] rounded-r-xl"
        {...props}
      />
    ),
    ul: ({ ...props }: any) => (
      <ul className="list-disc list-inside space-y-1.5 my-2.5 text-xs sm:text-[13px] opacity-90 pl-1" {...props} />
    ),
    ol: ({ ...props }: any) => (
      <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-xs sm:text-[13px] opacity-90 pl-1" {...props} />
    ),
    li: ({ ...props }: any) => <li className="leading-relaxed" {...props} />,
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-bold underline decoration-current/40 underline-offset-3 hover:decoration-current hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
        {...props}
      >
        <span>{children}</span>
        <ExternalLink className="w-2.5 h-2.5 inline-block opacity-60" />
      </a>
    ),
    strong: ({ ...props }: any) => <strong className="font-extrabold text-current" {...props} />,
    code: ({ ...props }: any) => (
      <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px]" {...props} />
    ),
    hr: () => <hr className="my-4 border-current/15" />
  };

  return (
    <>
      <article
        className={cn(
          "group relative w-full text-left overflow-hidden transition-all duration-300",
          "rounded-2xl border shadow-xs hover:shadow-md",
          customBg
            ? ""
            : "bg-white/95 dark:bg-zinc-900/90 border-black/10 dark:border-white/10 text-neutral-900 dark:text-neutral-100 backdrop-blur-xs"
        )}
        style={{
          backgroundColor: customBg || undefined,
          color: isDarkCustomBg ? "#ffffff" : (isLightCustomBg ? "#1a1a1a" : undefined),
          borderColor: customBg ? `${customBg}40` : undefined
        }}
      >
        {/* Cover Hero Image */}
        {module.imageUrl && (
          <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            <img
              src={module.imageUrl}
              alt={module.title || "Copertina articolo"}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none opacity-70" />
            <div className="absolute bottom-2.5 left-3.5 flex items-center gap-1.5 text-[11px] font-medium text-white/95 drop-shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{readTimeMin} min di lettura</span>
            </div>
          </div>
        )}

        {/* Video Player */}
        {module.videoUrl && (
          <div className="w-full bg-black">
            <video src={module.videoUrl} controls className="w-full max-h-96 object-cover" />
          </div>
        )}

        {/* Embed Code */}
        {module.embedCode && (
          <div className="w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: module.embedCode }} />
        )}

        {/* Content Container */}
        <div className="p-4 sm:p-5">
          {/* Metadata Bar */}
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium opacity-65 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Newspaper className="w-3.5 h-3.5 text-indigo-500" />
                <span>Articolo</span>
              </span>
              {formattedDate && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span>{formattedDate}</span>
                </>
              )}
              {!module.imageUrl && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span>{readTimeMin} min lettura</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Condividi articolo"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 font-bold">Copiato!</span>
                </>
              ) : (
                <Share2 className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
              )}
            </button>
          </div>

          {/* Headline */}
          {module.title && (
            <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {module.title}
            </h3>
          )}

          {/* Markdown Body */}
          <div className="relative">
            <div
              className={cn(
                "transition-all duration-300",
                !isExpanded && isLong && "max-h-44 overflow-hidden"
              )}
            >
              <Markdown components={markdownComponents}>
                {content}
              </Markdown>
            </div>

            {/* Gradient mask when collapsed */}
            {!isExpanded && isLong && (
              <div
                className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
                style={{
                  background: customBg
                    ? `linear-gradient(to top, ${customBg} 20%, transparent 100%)`
                    : "linear-gradient(to top, rgba(255,255,255,0.95) 20%, transparent 100%)"
                }}
              />
            )}
          </div>

          {/* Expander Footer */}
          {isLong && (
            <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-current/10">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-bold flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer py-1"
              >
                <span>{isExpanded ? "Mostra meno" : "Leggi tutto l'articolo"}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowReaderModal(true)}
                className="text-[11px] font-semibold opacity-60 hover:opacity-100 flex items-center gap-1 transition-opacity cursor-pointer py-1"
                title="Apri in modalità lettura a schermo intero"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modalità lettura</span>
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Reader Mode Modal */}
      {showReaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 text-neutral-900 dark:text-neutral-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-black/10 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/10 dark:border-white/10 shrink-0 bg-neutral-50/80 dark:bg-zinc-800/80 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                <Newspaper className="w-4 h-4 text-indigo-500" />
                <span>Modalità Lettura</span>
                {readTimeMin && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{readTimeMin} min</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 opacity-70" />}
                  <span className="hidden sm:inline">{copied ? "Copiato!" : "Condividi"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReaderModal(false)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Chiudi"
                >
                  <X className="w-5 h-5 opacity-70 hover:opacity-100" />
                </button>
              </div>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-5">
              {module.imageUrl && (
                <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-xs">
                  <img src={module.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {module.title && (
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  {module.title}
                </h1>
              )}
              {formattedDate && (
                <div className="text-xs text-neutral-400 font-medium pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  Pubblicato il {formattedDate}
                </div>
              )}
              <div className="text-sm sm:text-base leading-relaxed">
                <Markdown components={markdownComponents}>
                  {content}
                </Markdown>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-black/10 dark:border-white/10 bg-neutral-50/50 dark:bg-zinc-800/50 text-right">
              <button
                type="button"
                onClick={() => setShowReaderModal(false)}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function PublicBioPage({ page, isPreview = false }: { page: BioPage, isPreview?: boolean }) {
  const { profile, theme, links, socials, modules } = page;
  const lang = page.language || 'it';
  const [searchQuery, setSearchQuery] = useState('');
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [confirmLink, setConfirmLink] = useState<(Partial<BioLink> & { url: string; isMonetized?: boolean }) | null>(null);
  const [adCountdown, setAdCountdown] = useState(5);
  const [activeAdBanner, setActiveAdBanner] = useState<AppBanner | null>(null);

  useEffect(() => {
    if (confirmLink?.isMonetized) {
      setAdCountdown(5);
      const activeBanners = banners.filter(b => b.active);
      if (activeBanners.length > 0) {
        const shortUrlBanners = activeBanners.filter(b => b.position === "short_url");
        const pool = shortUrlBanners.length > 0 ? shortUrlBanners : activeBanners;
        setActiveAdBanner(pool[Math.floor(Math.random() * pool.length)]);
      } else {
        setActiveAdBanner(null);
      }
    }
  }, [confirmLink, banners]);

  useEffect(() => {
    if (confirmLink?.isMonetized && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [confirmLink, adCountdown]);

  const handleLinkClick = (linkToOpen: BioLink, e: React.MouseEvent) => {
    e.preventDefault();
    const isMonetized = !!(linkToOpen.monetized || page.monetizeAllLinks);
    setConfirmLink({
      ...linkToOpen,
      isMonetized
    });
  };

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
                              onClick={(e) => handleLinkClick(child, e)}
                              className={cn(
                                "block w-full py-3 px-4 bg-white border-2 border-black text-center text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all hover:scale-[1.02]",
                                roundedClass
                              )}
                            >
                              <span className="inline-flex items-center justify-center gap-1.5">
                                {(child.monetized || page.monetizeAllLinks) && (
                                  <DollarSign className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                )}
                                <span>{child.title || child.url}</span>
                              </span>
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
                    onClick={(e) => handleLinkClick(link, e)}
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
                const isMicroblog = module.type === 'microblog';
                return (
                  <motion.div 
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className={cn(
                      "w-full",
                      isMicroblog
                        ? "p-0 bg-transparent border-0"
                        : "p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-black"
                    )}
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
                      <MicroblogArticleCard module={module} theme={theme} lang={lang} />
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

      {/* Link Interstitial & Confirmation Modal */}
      {confirmLink && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setConfirmLink(null)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center border-4 border-[#1A1A1A] overflow-hidden relative" 
            onClick={e => e.stopPropagation()}
          >
            {confirmLink.isMonetized ? (
              <div className="flex flex-col items-center">
                {/* Header */}
                <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Link Monetizzato
                    </span>
                  </div>
                  <div className="text-[11px] font-black uppercase tracking-widest bg-black text-white px-3 py-1 rounded-full">
                    {adCountdown > 0 ? `Attendi ${adCountdown}s` : "Pronto!"}
                  </div>
                </div>

                {/* Ad Banner Display */}
                {activeAdBanner ? (
                  <div className="w-full bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative group mb-4">
                    {activeAdBanner.type === "image" ? (
                      <a href={activeAdBanner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" className="block w-full relative aspect-[16/9]">
                        <img src={activeAdBanner.imageUrl} alt={activeAdBanner.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-black backdrop-blur-sm">
                          SPONSOR
                        </div>
                      </a>
                    ) : activeAdBanner.type === "text" ? (
                      <a 
                        href={activeAdBanner.linkUrl || "#"} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block w-full flex flex-col items-center justify-center text-center p-6 relative aspect-[16/9]"
                        style={{ backgroundColor: activeAdBanner.backgroundColor || "#000", color: activeAdBanner.textColor || "#fff" }}
                      >
                        <h4 className="text-xl sm:text-2xl font-black uppercase tracking-widest">{activeAdBanner.text}</h4>
                        <div className="absolute top-2 right-2 bg-black/20 text-current text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-bold backdrop-blur-sm border border-current/20">
                          SPONSOR
                        </div>
                      </a>
                    ) : (
                      <div className="w-full aspect-[16/9] flex items-center justify-center bg-gray-50 relative p-2">
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded uppercase tracking-widest font-black z-10">
                          SPONSOR
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: activeAdBanner.code || "" }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] bg-gradient-to-br from-emerald-50/50 to-gray-50 rounded-2xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center p-6 relative overflow-hidden mb-4">
                    <div className="text-center z-10">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mb-2">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-black mb-1">Spazio Pubblicitario</h4>
                      <p className="text-gray-500 text-xs">Supporta il creator visualizzando questo annuncio.</p>
                    </div>
                  </div>
                )}

                {/* Target info */}
                <div className="mb-4 w-full text-left bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Destinazione:</span>
                  <p className="text-xs font-bold text-gray-800 truncate">{confirmLink.title || confirmLink.url}</p>
                  <p className="text-[10px] text-gray-500 truncate">{confirmLink.url}</p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-5">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setConfirmLink(null)}
                    className="px-4 py-3 border-2 border-gray-200 text-gray-500 font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors text-xs"
                  >
                    Annulla
                  </button>
                  <button 
                    disabled={adCountdown > 0}
                    onClick={() => {
                      if (!isPreview && confirmLink.id) {
                        trackLinkClick(page.id, confirmLink.id);
                      }
                      window.open(confirmLink.url, "_blank", "noopener,noreferrer");
                      setConfirmLink(null);
                    }}
                    className={cn(
                      "flex-1 px-4 py-3 font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 text-xs",
                      adCountdown > 0 
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                        : "bg-[#1A1A1A] text-white hover:bg-emerald-600 shadow-md cursor-pointer"
                    )}
                  >
                    {adCountdown > 0 ? `Attendi (${adCountdown}s)` : "Continua verso il link →"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
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
              </div>
            )}
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
        if (!res.ok) {
          setJobs([]); return;
          setJobs([]);
          return;
        }
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err: any) {
        // gracefully handled
        setJobs([]);
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
