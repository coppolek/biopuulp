import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use persistent cache with multi-tab manager, with graceful fallback to memory cache if indexedDB is restricted
let localCacheSetting;
try {
  localCacheSetting = persistentLocalCache({ tabManager: persistentMultipleTabManager() });
} catch (e) {
  localCacheSetting = memoryLocalCache();
}

export const db = initializeFirestore(app, {
  localCache: localCacheSetting
}, config.firestoreDatabaseId);
