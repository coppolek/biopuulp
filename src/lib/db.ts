import { compressDataUrl } from "./imageUtils";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, increment, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BioPage, PageAnalytics, AppBanner } from '../types';
import {
  getLocalPages,
  saveLocalPage,
  deleteLocalPage,
  getLocalPageBySlug,
  getLocalUserPages,
  getLocalShortLinks,
  saveLocalShortLink,
  deleteLocalShortLink,
  getLocalShortLinkByCode,
  getLocalBanners,
  saveLocalBanner,
  deleteLocalBanner,
  getLocalAnalytics,
  trackLocalPageView,
  trackLocalLinkClick,
  saveLocalSubscriber,
  getLocalSubscribers,
  isQuotaExceeded,
  setQuotaExceeded
} from './fallbackStorage';

export { isQuotaExceeded, setQuotaExceeded, subscribeToQuotaChanges } from './fallbackStorage';

function handleFirestoreError(error: any) {
  const msg = error?.message || String(error || '');
  const code = error?.code || '';
  if (
    code === 'resource-exhausted' ||
    msg.includes('Quota') ||
    msg.includes('quota') ||
    msg.includes('429') ||
    msg.includes('Resource has been exhausted')
  ) {
    setQuotaExceeded(true);
    console.warn('[Firestore Quota Exceeded] Seamlessly using resilient local storage cache.');
  } else {
    console.warn('[Firestore Error]', code, msg);
  }
}

export const getAllBanners = async (): Promise<AppBanner[]> => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'banners'));
      const querySnapshot = await getDocs(q);
      const banners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppBanner));
      banners.forEach(b => saveLocalBanner(b));
      if (banners.length > 0) return banners;
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
  return getLocalBanners();
};

export const saveBanner = async (banner: AppBanner): Promise<void> => {
  saveLocalBanner(banner);
  try {
    if (!isQuotaExceeded()) {
      const bannerRef = doc(db, 'banners', banner.id);
      await setDoc(bannerRef, banner);
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const deleteBanner = async (bannerId: string): Promise<void> => {
  deleteLocalBanner(bannerId);
  try {
    if (!isQuotaExceeded()) {
      const bannerRef = doc(db, 'banners', bannerId);
      await deleteDoc(bannerRef);
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const getPageAnalytics = async (pageId: string): Promise<PageAnalytics> => {
  try {
    if (!isQuotaExceeded()) {
      const docRef = doc(db, 'analytics', pageId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as PageAnalytics;
      }
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
  return getLocalAnalytics(pageId);
};

export const trackPageView = async (pageId: string): Promise<void> => {
  trackLocalPageView(pageId);
  try {
    if (!isQuotaExceeded()) {
      const pageRef = doc(db, 'pages', pageId);
      await updateDoc(pageRef, {
        views: increment(1)
      });
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const trackLinkClick = async (pageId: string, linkId: string): Promise<void> => {
  trackLocalLinkClick(pageId, linkId);
  try {
    if (!isQuotaExceeded()) {
      const pageRef = doc(db, 'pages', pageId);
      const pageSnap = await getDoc(pageRef);
      if (pageSnap.exists()) {
        const pageData = pageSnap.data() as BioPage;
        const link = pageData.links?.find(l => l.id === linkId);
        if (link) {
          link.clicks = (link.clicks || 0) + 1;
          await setDoc(pageRef, pageData);
        }
      }
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const getUserPages = async (userId: string): Promise<BioPage[]> => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'pages'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const pages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BioPage));
      pages.forEach(p => saveLocalPage(p as any));
      if (pages.length > 0) return pages;
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
  return getLocalUserPages(userId);
};

export const getAllPages = async (): Promise<BioPage[]> => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'pages'));
      const querySnapshot = await getDocs(q);
      const pages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BioPage));
      pages.forEach(p => saveLocalPage(p as any));
      if (pages.length > 0) return pages;
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
  return getLocalPages();
};

export const deletePage = async (pageId: string): Promise<void> => {
  deleteLocalPage(pageId);
  try {
    if (!isQuotaExceeded()) {
      const pageRef = doc(db, 'pages', pageId);
      await deleteDoc(pageRef);
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const getPageBySlug = async (slug: string): Promise<BioPage | null> => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'pages'), where('slug', '==', slug));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const page = { id: doc.id, ...doc.data() } as BioPage;
        saveLocalPage(page as any);
        return page;
      }
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
  return getLocalPageBySlug(slug);
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

  // Guarantee that the document never exceeds Firestore's 1MB limit by compressing all data URLs
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

  // Save to resilient local storage first
  saveLocalPage(page);

  // Attempt Firestore sync
  try {
    if (!isQuotaExceeded()) {
      const pageRef = doc(db, 'pages', page.id);
      await setDoc(pageRef, page);
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const createNewPage = async (userId: string, slug: string): Promise<BioPage> => {
  const newPage: BioPage & { userId: string } = {
    id: `page_${Date.now()}`,
    userId,
    slug,
    profile: {
      name: `@${slug}`,
      bio: 'Benvenuto sul mio profilo creator!',
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
  saveLocalSubscriber(pageId, email);
  try {
    if (!isQuotaExceeded()) {
      const subscriberRef = doc(collection(db, 'subscribers'));
      await setDoc(subscriberRef, {
        pageId,
        email,
        subscribedAt: new Date().toISOString()
      });
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
};

export const getPageSubscribers = async (pageId: string): Promise<{id: string, email: string, subscribedAt: string}[]> => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'subscribers'), where('pageId', '==', pageId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    }
  } catch (error: any) {
    handleFirestoreError(error);
  }
  return getLocalSubscribers(pageId);
};

export const getUserShortLinks = async (userId: string) => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'shortLinks'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      links.forEach(l => saveLocalShortLink(l));
      if (links.length > 0) return links;
    }
  } catch (error) {
    handleFirestoreError(error);
  }
  return getLocalShortLinks(userId);
};

export const createShortLink = async (userId: string, data: any) => {
  const newLink = {
    id: `short_${Date.now()}`,
    ...data,
    userId,
    createdAt: new Date().toISOString(),
    clicks: 0
  };
  saveLocalShortLink(newLink);

  try {
    if (!isQuotaExceeded()) {
      const docRef = await addDoc(collection(db, 'shortLinks'), {
        ...data,
        userId,
        createdAt: new Date().toISOString(),
        clicks: 0
      });
      newLink.id = docRef.id;
      saveLocalShortLink(newLink);
    }
  } catch (error) {
    handleFirestoreError(error);
  }
  return newLink;
};

export const updateShortLink = async (id: string, data: any) => {
  const existing = getLocalShortLinkByCode(data.shortCode) || { id };
  saveLocalShortLink({ ...existing, ...data, id });

  try {
    if (!isQuotaExceeded()) {
      const docRef = doc(db, 'shortLinks', id);
      await updateDoc(docRef, data);
    }
  } catch (error) {
    handleFirestoreError(error);
  }
};

export const deleteShortLink = async (id: string) => {
  deleteLocalShortLink(id);
  try {
    if (!isQuotaExceeded()) {
      await deleteDoc(doc(db, 'shortLinks', id));
    }
  } catch (error) {
    handleFirestoreError(error);
  }
};

export const getShortLinkByCode = async (shortCode: string) => {
  try {
    if (!isQuotaExceeded()) {
      const q = query(collection(db, 'shortLinks'), where('shortCode', '==', shortCode));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const item = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
        saveLocalShortLink(item);
        return item;
      }
    }
  } catch (error) {
    handleFirestoreError(error);
  }
  return getLocalShortLinkByCode(shortCode);
};

export const incrementShortLinkClick = async (id: string) => {
  try {
    const list = getLocalShortLinks('');
    const item = list.find((l: any) => l.id === id);
    if (item) {
      item.clicks = (item.clicks || 0) + 1;
      saveLocalShortLink(item);
    }
    if (!isQuotaExceeded()) {
      const linkRef = doc(db, 'shortLinks', id);
      await updateDoc(linkRef, {
        clicks: increment(1)
      });
    }
  } catch (error) {
    handleFirestoreError(error);
  }
};
