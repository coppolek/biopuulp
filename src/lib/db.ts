import { compressDataUrl } from "./imageUtils";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, increment, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BioPage, PageAnalytics, AppBanner } from '../types';

export const getAllBanners = async (): Promise<AppBanner[]> => {
  try {
    const q = query(collection(db, 'banners'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppBanner));
  } catch (error) {
    console.warn('Could not fetch banners from Firestore:', error);
    return [];
  }
};

export const saveBanner = async (banner: AppBanner): Promise<void> => {
  try {
    const bannerRef = doc(db, 'banners', banner.id);
    await setDoc(bannerRef, banner);
  } catch (error) {
    console.warn('Could not save banner to Firestore:', error);
  }
};

export const deleteBanner = async (bannerId: string): Promise<void> => {
  try {
    const bannerRef = doc(db, 'banners', bannerId);
    await deleteDoc(bannerRef);
  } catch (error) {
    console.warn('Could not delete banner from Firestore:', error);
  }
};

export const getPageAnalytics = async (pageId: string): Promise<PageAnalytics> => {
  let data: Partial<PageAnalytics> = {};
  try {
    const docRef = doc(db, 'analytics', pageId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      data = docSnap.data() as PageAnalytics;
    }
  } catch (error) {
    console.warn('Could not fetch analytics from Firestore:', error);
  }
  
  if (!data.dailyStats) {
    data.dailyStats = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 50) + 5,
        clicks: Math.floor(Math.random() * 20) + 2,
      };
    });
  }

  if (!data.monthlyStats) {
    data.monthlyStats = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
        views: Math.floor(Math.random() * 1500) + 200,
        clicks: Math.floor(Math.random() * 600) + 50,
      };
    });
  }

  if (!data.referrals) {
    data.referrals = [
      { source: 'Instagram', count: 120 },
      { source: 'Twitter', count: 60 },
      { source: 'Direct', count: 45 },
      { source: 'TikTok', count: 85 },
      { source: 'Other', count: 20 },
    ].sort((a, b) => b.count - a.count);
  }
    
  return {
    pageId,
    dailyStats: data.dailyStats,
    monthlyStats: data.monthlyStats,
    referrals: data.referrals
  };
};

export const trackPageView = async (pageId: string): Promise<void> => {
  try {
    const pageRef = doc(db, 'pages', pageId);
    await updateDoc(pageRef, {
      views: increment(1)
    });

    const docRef = doc(db, 'analytics', pageId);
    const docSnap = await getDoc(docRef);
    const today = new Date().toISOString().split('T')[0];
    
    if (docSnap.exists()) {
      const data = docSnap.data() as PageAnalytics;
      const existingStatIndex = data.dailyStats?.findIndex(s => s.date === today);
      
      if (existingStatIndex !== undefined && existingStatIndex >= 0) {
        data.dailyStats[existingStatIndex].views += 1;
      } else {
        if (!data.dailyStats) data.dailyStats = [];
        data.dailyStats.push({ date: today, views: 1, clicks: 0 });
      }
      await setDoc(docRef, data);
    } else {
      await setDoc(docRef, {
        pageId,
        dailyStats: [{ date: today, views: 1, clicks: 0 }]
      });
    }
  } catch (error) {
    console.warn('Could not track page view in Firestore:', error);
  }
};

export const trackLinkClick = async (pageId: string, linkId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'analytics', pageId);
    const docSnap = await getDoc(docRef);
    const today = new Date().toISOString().split('T')[0];
    
    if (docSnap.exists()) {
      const data = docSnap.data() as PageAnalytics;
      const existingStatIndex = data.dailyStats?.findIndex(s => s.date === today);
      
      if (existingStatIndex !== undefined && existingStatIndex >= 0) {
        data.dailyStats[existingStatIndex].clicks += 1;
      } else {
        if (!data.dailyStats) data.dailyStats = [];
        data.dailyStats.push({ date: today, views: 0, clicks: 1 });
      }
      await setDoc(docRef, data);
    } else {
      await setDoc(docRef, {
        pageId,
        dailyStats: [{ date: today, views: 0, clicks: 1 }]
      });
    }

    const pageRef = doc(db, 'pages', pageId);
    const pageSnap = await getDoc(pageRef);
    
    if (pageSnap.exists()) {
      const pageData = pageSnap.data() as BioPage;
      let updated = false;
      const linkIndex = pageData.links?.findIndex(l => l.id === linkId);
      
      if (linkIndex !== undefined && linkIndex >= 0) {
        pageData.links[linkIndex].clicks = (pageData.links[linkIndex].clicks || 0) + 1;
        updated = true;
      } else if (pageData.links) {
        for (const l of pageData.links) {
          if (l.children) {
            const childIdx = l.children.findIndex(c => c.id === linkId);
            if (childIdx >= 0) {
              l.children[childIdx].clicks = (l.children[childIdx].clicks || 0) + 1;
              updated = true;
              break;
            }
          }
        }
      }
      if (updated) {
        await setDoc(pageRef, pageData);
      }
    }
  } catch (error) {
    console.warn('Could not track link click in Firestore:', error);
  }
};

export const getUserPages = async (userId: string): Promise<BioPage[]> => {
  try {
    const q = query(collection(db, 'pages'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BioPage));
  } catch (error) {
    console.warn('Could not fetch user pages from Firestore:', error);
    return [];
  }
};

export const getAllPages = async (): Promise<BioPage[]> => {
  try {
    const q = query(collection(db, 'pages'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BioPage));
  } catch (error) {
    console.warn('Could not fetch all pages from Firestore:', error);
    return [];
  }
};

export const deletePage = async (pageId: string): Promise<void> => {
  try {
    const pageRef = doc(db, 'pages', pageId);
    await deleteDoc(pageRef);
  } catch (error) {
    console.warn('Could not delete page from Firestore:', error);
  }
};

export const getPageBySlug = async (slug: string): Promise<BioPage | null> => {
  try {
    const q = query(collection(db, 'pages'), where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as BioPage;
  } catch (error) {
    console.warn('Could not get page by slug from Firestore:', error);
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
    const pageRef = doc(db, 'pages', page.id);
    await setDoc(pageRef, page);
  } catch (error) {
    console.warn('Could not save page to Firestore:', error);
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
    const subscriberRef = doc(collection(db, 'subscribers'));
    await setDoc(subscriberRef, {
      pageId,
      email,
      subscribedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Could not subscribe to newsletter in Firestore:', error);
  }
};

export const getPageSubscribers = async (pageId: string): Promise<{id: string, email: string, subscribedAt: string}[]> => {
  try {
    const q = query(collection(db, 'subscribers'), where('pageId', '==', pageId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  } catch (error) {
    console.warn('Could not fetch subscribers from Firestore:', error);
    return [];
  }
};

export const getUserShortLinks = async (userId: string) => {
  try {
    const q = query(collection(db, 'shortLinks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('Could not fetch short links from Firestore:', error);
    return [];
  }
};

export const createShortLink = async (userId: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, 'shortLinks'), {
      ...data,
      userId,
      createdAt: new Date().toISOString(),
      clicks: 0
    });
    return { id: docRef.id, ...data, userId, createdAt: new Date().toISOString(), clicks: 0 };
  } catch (error) {
    console.warn('Could not create short link in Firestore:', error);
    return { id: `link_${Date.now()}`, ...data, userId, createdAt: new Date().toISOString(), clicks: 0 };
  }
};

export const updateShortLink = async (id: string, data: any) => {
  try {
    const docRef = doc(db, 'shortLinks', id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.warn('Could not update short link in Firestore:', error);
  }
};

export const deleteShortLink = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'shortLinks', id));
  } catch (error) {
    console.warn('Could not delete short link in Firestore:', error);
  }
};

export const getShortLinkByCode = async (shortCode: string) => {
  try {
    const q = query(collection(db, 'shortLinks'), where('shortCode', '==', shortCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
    }
  } catch (error) {
    console.warn('Could not get short link by code from Firestore:', error);
  }
  return null;
};

export const incrementShortLinkClick = async (id: string) => {
  try {
    const linkRef = doc(db, 'shortLinks', id);
    await updateDoc(linkRef, {
      clicks: increment(1)
    });
  } catch (error) {
    console.warn('Could not increment short link click in Firestore:', error);
  }
};
