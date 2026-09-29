import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
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

// Use memoryLocalCache to eliminate IndexedDB multi-tab lease collisions and future update time skew in iframes/tabs
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);
