import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getShortLinkByCode, incrementShortLinkClick, getAllBanners } from '../lib/db';
import { AppBanner } from '../types';

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [linkData, setLinkData] = useState<any>(null);
  const [adBanner, setAdBanner] = useState<AppBanner | null>(null);

  useEffect(() => {
    const processLink = async () => {
      if (!shortCode) return;
      
      const data = await getShortLinkByCode(shortCode);
      if (!data) {
        setError(true);
        setLoading(false);
        return;
      }

      setLinkData(data);
      incrementShortLinkClick(data.id);

      const target = (data.targetUrl || data.originalUrl || '').trim();
      const finalUrl = target.startsWith('http://') || target.startsWith('https://') ? target : `https://${target}`;
      setLinkData({ ...data, targetUrl: finalUrl });

      if (!data.monetized) {
        // Immediate redirect attempt
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = finalUrl;
          } else {
            window.location.href = finalUrl;
          }
        } catch (_) {
          window.location.href = finalUrl;
        }
        setLoading(false);
      } else {
        try {
          const banners = await getAllBanners();
          const activeShortUrlBanners = banners.filter(b => b.active && b.position === 'short_url');
          if (activeShortUrlBanners.length > 0) {
            // Pick a random banner
            const randomBanner = activeShortUrlBanners[Math.floor(Math.random() * activeShortUrlBanners.length)];
            setAdBanner(randomBanner);
          }
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      }
    };

    processLink();
  }, [shortCode]);

  useEffect(() => {
    if (linkData?.monetized && !loading && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (linkData?.monetized && countdown === 0 && linkData?.targetUrl) {
      // Redirect after countdown
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = linkData.targetUrl;
        } else {
          window.location.href = linkData.targetUrl;
        }
      } catch (_) {
        window.location.href = linkData.targetUrl;
      }
    }
  }, [countdown, loading, linkData]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border-2 border-black">
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">Link non trovato</h1>
          <p className="text-gray-500 text-sm mb-6">Lo short link richiesto non esiste o è stato rimosso.</p>
          <a
            href="/"
            className="inline-block bg-black text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-gray-800 transition-colors"
          >
            Torna alla Home
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Caricamento link in corso...</p>
      </div>
    );
  }

  // Non-monetized immediate landing if navigation didn't leave immediately
  if (linkData && !linkData.monetized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-2 border-black">
          <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-lg mx-auto mb-4">
            B•
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight mb-2">Reindirizzamento in corso</h1>
          <p className="text-gray-500 text-xs mb-6 break-all">
            Stai per essere reindirizzato a: <br />
            <strong className="text-black font-semibold">{linkData.targetUrl}</strong>
          </p>
          <a
            href={linkData.targetUrl}
            target="_top"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full bg-black text-white px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
          >
            <span>Apri Destinazione Ora</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {linkData?.seo && (
        <Helmet>
          {linkData.seo.title && <title>{linkData.seo.title}</title>}
          {linkData.seo.title && <meta property="og:title" content={linkData.seo.title} />}
          {linkData.seo.title && <meta name="twitter:title" content={linkData.seo.title} />}
          
          {linkData.seo.description && <meta name="description" content={linkData.seo.description} />}
          {linkData.seo.description && <meta property="og:description" content={linkData.seo.description} />}
          {linkData.seo.description && <meta name="twitter:description" content={linkData.seo.description} />}
          
          {linkData.seo.imageUrl && <meta property="og:image" content={linkData.seo.imageUrl} />}
          {linkData.seo.imageUrl && <meta name="twitter:image" content={linkData.seo.imageUrl} />}
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
      )}
      <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="font-black tracking-tighter">PUULP SHORTENER</div>
        <div className="text-xs font-bold bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">
          Attendi {countdown}s
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {adBanner ? (
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative group mb-4">
            {adBanner.type === 'image' ? (
              <a href={adBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative aspect-[16/9] md:aspect-[21/9]">
                <img src={adBanner.imageUrl} alt={adBanner.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold backdrop-blur-sm">AD</div>
              </a>
            ) : adBanner.type === 'text' ? (
              <a href={adBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full flex flex-col items-center justify-center text-center p-8 relative aspect-[16/9] md:aspect-[21/9]" style={{ backgroundColor: adBanner.backgroundColor, color: adBanner.textColor }}>
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-widest">{adBanner.text}</h2>
                <div className="absolute top-2 right-2 bg-black/10 text-current text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold backdrop-blur-sm border border-current/20">AD</div>
              </a>
            ) : (
              <div className="w-full aspect-[16/9] md:aspect-[21/9] flex items-center justify-center bg-gray-50 relative">
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold z-10">AD</div>
                <div dangerouslySetInnerHTML={{ __html: adBanner.code || '' }} />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white aspect-[16/9] md:aspect-[21/9] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group mb-4">
            <div className="text-center p-6 relative z-10">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-black mb-2">Spazio Pubblicitario</h2>
              <p className="text-gray-500 font-medium text-sm md:text-base">Supporta il creatore visualizzando questo annuncio.</p>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center">
          <p className="text-sm font-bold text-gray-500 mb-4">Reindirizzamento verso <span className="text-black">{linkData.title || linkData.targetUrl}</span> in corso...</p>
          {countdown === 0 ? (
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <button 
              disabled
              className="bg-gray-200 text-gray-500 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest cursor-not-allowed"
            >
              Skip Ad in {countdown}
            </button>
          )}
        </div>
      </main>
    </div>
    </>
  );
}
