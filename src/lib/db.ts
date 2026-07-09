import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BioPage, UserAccount, PageAnalytics, DailyStats, AppBanner } from '../types';

export const getAllBanners = async (): Promise<AppBanner[]> => {
  const q = query(collection(db, 'banners'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppBanner));
};

export const saveBanner = async (banner: AppBanner): Promise<void> => {
  const bannerRef = doc(db, 'banners', banner.id);
  await setDoc(bannerRef, banner);
};

export const deleteBanner = async (bannerId: string): Promise<void> => {
  const bannerRef = doc(db, 'banners', bannerId);
  await deleteDoc(bannerRef);
};

export const getPageAnalytics = async (pageId: string): Promise<PageAnalytics> => {
  const docRef = doc(db, 'analytics', pageId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as PageAnalytics;
  }
  
  // Seed initial mock data if not exists
  const mockDailyStats: DailyStats[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 500) + 100,
      clicks: Math.floor(Math.random() * 200) + 20,
    };
  });
  
  const analytics: PageAnalytics = {
    pageId,
    dailyStats: mockDailyStats
  };
  
  await setDoc(docRef, analytics);
  return analytics;
};

export const getUserPages = async (userId: string): Promise<BioPage[]> => {
  const q = query(collection(db, 'pages'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BioPage));
};

export const getAllPages = async (): Promise<BioPage[]> => {
  const q = query(collection(db, 'pages'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BioPage));
};

export const deletePage = async (pageId: string): Promise<void> => {
  const pageRef = doc(db, 'pages', pageId);
  await deleteDoc(pageRef);
};

export const getPageBySlug = async (slug: string): Promise<BioPage | null> => {
  const q = query(collection(db, 'pages'), where('slug', '==', slug));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as BioPage;
};

export const savePage = async (page: BioPage & { userId: string }): Promise<void> => {
  const pageRef = doc(db, 'pages', page.id);
  await setDoc(pageRef, page);
};

export const createNewPage = async (userId: string, slug: string): Promise<BioPage> => {
  const newPage: BioPage & { userId: string } = {
    id: `page_${Date.now()}`,
    userId,
    slug,
    profile: {
      name: `@${slug}`,
      bio: 'New creator profile',
      avatarUrl: 'https://i.pravatar.cc/300'
    },
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#1A1A1A',
      buttonColor: 'transparent',
      buttonTextColor: '#1A1A1A',
      buttonRadius: 'none',
      fontFamily: 'sans-serif'
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
  const subscriberRef = doc(collection(db, 'subscribers'));
  await setDoc(subscriberRef, {
    pageId,
    email,
    subscribedAt: new Date().toISOString()
  });
};

export const getPageSubscribers = async (pageId: string): Promise<{id: string, email: string, subscribedAt: string}[]> => {
  const q = query(collection(db, 'subscribers'), where('pageId', '==', pageId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
};
