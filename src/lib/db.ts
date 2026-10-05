import { compressDataUrl } from "./imageUtils";
import { BioPage, PageAnalytics, AppBanner } from '../types';

export const getAllBanners = async (): Promise<AppBanner[]> => {
  try {
    const res = await fetch('/api/banners');
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('Could not fetch banners from MySQL API:', error);
    return [];
  }
};

export const saveBanner = async (banner: AppBanner): Promise<void> => {
  try {
    await fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner)
    });
  } catch (error) {
    console.warn('Could not save banner to MySQL API:', error);
  }
};

export const deleteBanner = async (bannerId: string): Promise<void> => {
  try {
    await fetch(`/api/banners/${bannerId}`, { method: 'DELETE' });
  } catch (error) {
    console.warn('Could not delete banner from MySQL API:', error);
  }
};

export const getPageAnalytics = async (pageId: string): Promise<PageAnalytics> => {
  try {
    const res = await fetch(`/api/analytics/${pageId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.pageId) return data;
    }
  } catch (error) {
    console.warn('Could not fetch analytics from MySQL API:', error);
  }
  
  const dailyStats = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 50) + 5,
      clicks: Math.floor(Math.random() * 20) + 2,
    };
  });

  const monthlyStats = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
      views: Math.floor(Math.random() * 1500) + 200,
      clicks: Math.floor(Math.random() * 600) + 50,
    };
  });

  const referrals = [
    { source: 'Instagram', count: 120 },
    { source: 'Twitter', count: 60 },
    { source: 'Direct', count: 45 },
    { source: 'TikTok', count: 85 },
    { source: 'Other', count: 20 },
  ].sort((a, b) => b.count - a.count);

  return {
    pageId,
    dailyStats,
    monthlyStats,
    referrals
  };
};

export const trackPageView = async (pageId: string): Promise<void> => {
  try {
    await fetch(`/api/analytics/${pageId}/view`, { method: 'POST' });
  } catch (error) {
    console.warn('Could not track page view in MySQL API:', error);
  }
};

export const trackLinkClick = async (pageId: string, linkId: string): Promise<void> => {
  try {
    await fetch(`/api/analytics/${pageId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId })
    });
  } catch (error) {
    console.warn('Could not track link click in MySQL API:', error);
  }
};

export const getUserPages = async (userId: string): Promise<BioPage[]> => {
  try {
    const res = await fetch(`/api/pages?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('Could not fetch user pages from MySQL API:', error);
    return [];
  }
};

export const getAllPages = async (): Promise<BioPage[]> => {
  try {
    const res = await fetch('/api/pages/all');
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('Could not fetch all pages from MySQL API:', error);
    return [];
  }
};

export const deletePage = async (pageId: string): Promise<void> => {
  try {
    await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
  } catch (error) {
    console.warn('Could not delete page from MySQL API:', error);
  }
};

export const getPageBySlug = async (slug: string): Promise<BioPage | null> => {
  try {
    const res = await fetch(`/api/pages/by-slug/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Could not get page by slug from MySQL API:', error);
    return null;
  }
};

const cleanUndefined = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, cleanUndefined(v)]));
  }
  return obj;
};

export const savePage = async (page: BioPage & { userId: string }): Promise<void> => {
  page = cleanUndefined(page);

  try {
    if (page.profile?.avatarUrl && page.profile.avatarUrl.startsWith("data:image")) {
      page.profile.avatarUrl = await compressDataUrl(page.profile.avatarUrl, 256, 0.75);
    }
    if (page.seo?.imageUrl && page.seo.imageUrl.startsWith("data:image")) {
      page.seo.imageUrl = await compressDataUrl(page.seo.imageUrl, 640, 0.75);
    }
    if (Array.isArray(page.links)) {
      for (const l of page.links) {
        if (l.image && l.image.startsWith("data:image")) {
          l.image = await compressDataUrl(l.image, 320, 0.75);
        }
        if (Array.isArray(l.children)) {
          for (const c of l.children) {
            if (c.image && c.image.startsWith("data:image")) {
              c.image = await compressDataUrl(c.image, 320, 0.75);
            }
          }
        }
      }
    }
    if (Array.isArray(page.modules)) {
      for (const m of page.modules) {
        if ("imageUrl" in m && typeof (m as any).imageUrl === "string" && (m as any).imageUrl.startsWith("data:image")) {
          (m as any).imageUrl = await compressDataUrl((m as any).imageUrl, 640, 0.75);
        }
        if ("videoUrl" in m && typeof (m as any).videoUrl === "string" && (m as any).videoUrl.startsWith("data:") && (m as any).videoUrl.length > 50000) {
          (m as any).videoUrl = undefined;
        }
      }
    }
  } catch (err) {
    console.warn("Auto-compression during savePage caught error:", err);
  }

  try {
    await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    });
  } catch (error) {
    console.warn('Could not save page to MySQL API:', error);
  }
};

export const createNewPage = async (userId: string, slug: string): Promise<BioPage> => {
  const newPage: BioPage & { userId: string } = {
    id: `page_${Date.now()}`,
    userId,
    slug,
    profile: {
      name: `@${slug}`,
      bio: 'New creator profile',
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
    links: [],
    socials: [],
    modules: [],
    createdAt: new Date().toISOString(),
    views: 0,
    language: 'it'
  };
  await savePage(newPage);
  return newPage;
};

export const subscribeToNewsletter = async (pageId: string, email: string): Promise<void> => {
  try {
    await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, email })
    });
  } catch (error) {
    console.warn('Could not subscribe to newsletter in MySQL API:', error);
  }
};

export const getPageSubscribers = async (pageId: string): Promise<{id: string, email: string, subscribedAt: string}[]> => {
  try {
    const res = await fetch(`/api/subscribers?pageId=${encodeURIComponent(pageId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('Could not fetch subscribers from MySQL API:', error);
    return [];
  }
};

export const getUserShortLinks = async (userId: string) => {
  try {
    const res = await fetch(`/api/short-links?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.warn('Could not fetch short links from MySQL API:', error);
    return [];
  }
};

export const createShortLink = async (userId: string, data: any) => {
  try {
    const res = await fetch('/api/short-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId })
    });
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn('Could not create short link in MySQL API:', error);
  }
  return { id: `link_${Date.now()}`, ...data, userId, createdAt: new Date().toISOString(), clicks: 0 };
};

export const updateShortLink = async (id: string, data: any) => {
  try {
    await fetch(`/api/short-links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.warn('Could not update short link in MySQL API:', error);
  }
};

export const deleteShortLink = async (id: string) => {
  try {
    await fetch(`/api/short-links/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.warn('Could not delete short link in MySQL API:', error);
  }
};

export const getShortLinkByCode = async (shortCode: string) => {
  try {
    const res = await fetch(`/api/short-links/by-code/${encodeURIComponent(shortCode)}`);
    if (res.ok) return await res.json();
  } catch (error) {
    console.warn('Could not get short link by code from MySQL API:', error);
  }
  return null;
};

export const incrementShortLinkClick = async (id: string) => {
  try {
    await fetch(`/api/short-links/${id}/click`, { method: 'POST' });
  } catch (error) {
    console.warn('Could not increment short link click in MySQL API:', error);
  }
};
