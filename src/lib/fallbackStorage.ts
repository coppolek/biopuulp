import { BioPage, AppBanner, PageAnalytics } from '../types';

const STORAGE_KEY_PAGES = 'biolink_local_pages';
const STORAGE_KEY_SHORTLINKS = 'biolink_local_shortlinks';
const STORAGE_KEY_BANNERS = 'biolink_local_banners';
const STORAGE_KEY_ANALYTICS = 'biolink_local_analytics';
const STORAGE_KEY_SUBSCRIBERS = 'biolink_local_subscribers';
const STORAGE_KEY_QUOTA = 'biolink_quota_exceeded';

let quotaExceededState = false;
const listeners = new Set<(exceeded: boolean) => void>();

export function isQuotaExceeded(): boolean {
  if (quotaExceededState) return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY_QUOTA);
    if (val) {
      const parsed = JSON.parse(val);
      // Reset after 12 hours
      if (Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
        quotaExceededState = true;
        return true;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export function setQuotaExceeded(exceeded: boolean) {
  quotaExceededState = exceeded;
  try {
    if (exceeded) {
      localStorage.setItem(STORAGE_KEY_QUOTA, JSON.stringify({ exceeded: true, timestamp: Date.now() }));
    } else {
      localStorage.removeItem(STORAGE_KEY_QUOTA);
    }
  } catch (e) {
    // ignore
  }
  listeners.forEach(fn => fn(exceeded));
}

export function subscribeToQuotaChanges(callback: (exceeded: boolean) => void): () => void {
  listeners.add(callback);
  callback(isQuotaExceeded());
  return () => {
    listeners.delete(callback);
  };
}

// Initial demo seed pages
const INITIAL_SEED_PAGES: (BioPage & { userId: string })[] = [
  {
    id: 'page_demo_1',
    userId: 'default_user',
    slug: 'coppolek',
    profile: {
      name: 'Coppolek',
      bio: 'Digital Creator, Tech Explorer & Storyteller. Benvenuto nel mio hub digitale!',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
    },
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#1A1A1A',
      buttonColor: '#000000',
      buttonTextColor: '#ffffff',
      buttonRadius: 'lg',
      fontFamily: 'sans-serif',
      buttonStyle: 'solid'
    },
    links: [
      {
        id: 'link_1',
        title: '🚀 Scopri i miei Progetti & Risorse',
        url: 'https://github.com',
        description: 'Tutto il mio codice, guide pratiche e template open-source.',
        clicks: 142
      },
      {
        id: 'link_2',
        title: '📰 Iscriviti alla mia Newsletter Esclusiva',
        url: 'https://substack.com',
        description: 'Un saggio a settimana su innovazione, intelligenza artificiale e futuro.',
        clicks: 89
      },
      {
        id: 'link_3',
        title: '☕ Offrimi un Caffè su Ko-fi',
        url: 'https://ko-fi.com',
        description: 'Supporta le mie ricerche e la creazione di contenuti gratuiti.',
        clicks: 34
      }
    ],
    socials: [
      { platform: 'youtube', url: 'https://youtube.com' },
      { platform: 'instagram', url: 'https://instagram.com' },
      { platform: 'twitter', url: 'https://x.com' },
      { platform: 'github', url: 'https://github.com' }
    ],
    modules: [
      {
        type: 'microblog',
        id: 'post_welcome',
        title: 'Perché la Curatela dei Contenuti è il Nuovo Superpotere Digitale',
        content: `Viviamo in un'era di sovraccarico informativo continuo. Ogni minuto vengono pubblicati centinaia di migliaia di post, articoli e video.

## Il Valore del Filtro
In un mondo saturo di rumore, **chi sa filtrare, sintetizzare e dare prospettiva** possiede il bene più prezioso del web: l'attenzione consapevole.

> "Non conta quante informazioni consumi, ma quante ne trasformi in intuizioni utilizzabili."

### I tre pilastri per emergere oggi:
1. **Profondità analitica**: andare oltre i titoli superficiali e i trend passeggeri.
2. **Coerenza editoriale**: mantenere una voce riconoscibile, autentica e trasparente.
3. **Spazi proprietari**: non affidare il proprio valore solo agli algoritmi dei social network, ma costruire una propria casa digitale.

Grazie per essere parte di questo viaggio! Continua a esplorare i link e gli approfondimenti qui sotto.`,
        date: new Date().toISOString(),
        tags: [],
        imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
        seo: {
          title: 'La Curatela dei Contenuti: Il Nuovo Superpotere | Coppolek',
          description: 'Riflessione sul valore della selezione e della qualità nell\'era della saturazione digitale.'
        }
      }
    ],
    createdAt: new Date().toISOString(),
    views: 345,
    language: 'it'
  }
];

export function getLocalPages(): (BioPage & { userId: string })[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAGES);
    if (!raw) {
      // Seed default
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(INITIAL_SEED_PAGES));
      return INITIAL_SEED_PAGES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(INITIAL_SEED_PAGES));
    return INITIAL_SEED_PAGES;
  } catch (e) {
    return INITIAL_SEED_PAGES;
  }
}

export function saveLocalPage(page: BioPage & { userId: string }): void {
  try {
    const pages = getLocalPages();
    const idx = pages.findIndex(p => p.id === page.id);
    if (idx >= 0) {
      pages[idx] = page;
    } else {
      pages.unshift(page);
    }
    localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
  } catch (e) {
    console.warn('Could not save local page:', e);
  }
}

export function deleteLocalPage(pageId: string): void {
  try {
    const pages = getLocalPages().filter(p => p.id !== pageId);
    localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
  } catch (e) {
    // ignore
  }
}

export function getLocalPageBySlug(slug: string): BioPage | null {
  const pages = getLocalPages();
  const page = pages.find(p => p.slug?.toLowerCase() === slug.toLowerCase());
  return page || null;
}

export function getLocalUserPages(userId: string): BioPage[] {
  const pages = getLocalPages();
  const userPages = pages.filter(p => p.userId === userId);
  if (userPages.length > 0) return userPages;
  // If user has no specific pages yet, return demo pages so user can immediately view/edit
  return pages;
}

export function getLocalShortLinks(userId: string): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHORTLINKS);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(l => !userId || l.userId === userId || l.userId === 'default_user') : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalShortLink(link: any): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHORTLINKS);
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((l: any) => l.id === link.id);
    if (idx >= 0) {
      list[idx] = link;
    } else {
      list.unshift(link);
    }
    localStorage.setItem(STORAGE_KEY_SHORTLINKS, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

export function deleteLocalShortLink(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHORTLINKS);
    if (!raw) return;
    const list = JSON.parse(raw).filter((l: any) => l.id !== id);
    localStorage.setItem(STORAGE_KEY_SHORTLINKS, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

export function getLocalShortLinkByCode(shortCode: string): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHORTLINKS);
    if (!raw) return null;
    const list = JSON.parse(raw);
    return list.find((l: any) => l.shortCode === shortCode) || null;
  } catch (e) {
    return null;
  }
}

export function getLocalBanners(): AppBanner[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BANNERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveLocalBanner(banner: AppBanner): void {
  try {
    const banners = getLocalBanners();
    const idx = banners.findIndex(b => b.id === banner.id);
    if (idx >= 0) {
      banners[idx] = banner;
    } else {
      banners.push(banner);
    }
    localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(banners));
  } catch (e) {
    // ignore
  }
}

export function deleteLocalBanner(bannerId: string): void {
  try {
    const banners = getLocalBanners().filter(b => b.id !== bannerId);
    localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(banners));
  } catch (e) {
    // ignore
  }
}

export function getLocalAnalytics(pageId: string): PageAnalytics {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_ANALYTICS}_${pageId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const today = new Date();
  const dailyStats = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 80) + 15,
      clicks: Math.floor(Math.random() * 40) + 5,
    };
  });

  const monthlyStats = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
      views: Math.floor(Math.random() * 2500) + 400,
      clicks: Math.floor(Math.random() * 1200) + 120,
    };
  });

  const referrals = [
    { source: 'Instagram', count: 320 },
    { source: 'Direct', count: 180 },
    { source: 'Twitter', count: 140 },
    { source: 'TikTok', count: 210 },
    { source: 'Other', count: 65 },
  ];

  const result: PageAnalytics = {
    pageId,
    dailyStats,
    monthlyStats,
    referrals
  };

  try {
    localStorage.setItem(`${STORAGE_KEY_ANALYTICS}_${pageId}`, JSON.stringify(result));
  } catch (e) {}

  return result;
}

export function trackLocalPageView(pageId: string): void {
  try {
    const pages = getLocalPages();
    const page = pages.find(p => p.id === pageId);
    if (page) {
      page.views = (page.views || 0) + 1;
      saveLocalPage(page);
    }

    const analytics = getLocalAnalytics(pageId);
    const today = new Date().toISOString().split('T')[0];
    const stat = analytics.dailyStats.find(s => s.date === today);
    if (stat) {
      stat.views += 1;
    } else {
      analytics.dailyStats.push({ date: today, views: 1, clicks: 0 });
    }
    localStorage.setItem(`${STORAGE_KEY_ANALYTICS}_${pageId}`, JSON.stringify(analytics));
  } catch (e) {}
}

export function trackLocalLinkClick(pageId: string, linkId: string): void {
  try {
    const pages = getLocalPages();
    const page = pages.find(p => p.id === pageId);
    if (page && Array.isArray(page.links)) {
      const link = page.links.find(l => l.id === linkId);
      if (link) {
        link.clicks = (link.clicks || 0) + 1;
        saveLocalPage(page);
      }
    }

    const analytics = getLocalAnalytics(pageId);
    const today = new Date().toISOString().split('T')[0];
    const stat = analytics.dailyStats.find(s => s.date === today);
    if (stat) {
      stat.clicks += 1;
    } else {
      analytics.dailyStats.push({ date: today, views: 0, clicks: 1 });
    }
    localStorage.setItem(`${STORAGE_KEY_ANALYTICS}_${pageId}`, JSON.stringify(analytics));
  } catch (e) {}
}

export function saveLocalSubscriber(pageId: string, email: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: `sub_${Date.now()}`,
      pageId,
      email,
      subscribedAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(list));
  } catch (e) {}
}

export function getLocalSubscribers(pageId: string): { id: string; email: string; subscribedAt: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return list.filter((s: any) => s.pageId === pageId);
  } catch (e) {
    return [];
  }
}
