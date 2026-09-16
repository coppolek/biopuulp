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

      if (!data.monetized) {
        window.location.href = data.targetUrl;
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
    } else if (linkData?.monetized && countdown === 0) {
      // Redirect after countdown
      window.location.href = linkData.targetUrl;
    }
  }, [countdown, loading, linkData]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border-2 border-black">
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">Link non trovato</h1>
          <p className="text-gray-500 text-sm">Lo short link richiesto non esiste o è stato rimosso.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
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
