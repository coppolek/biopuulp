const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

const additionalFunctions = `

export const getUserShortLinks = async (userId: string) => {
  try {
    const q = query(collection(db, 'shortLinks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching short links:', error);
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
    console.error('Error creating short link:', error);
    throw error;
  }
};

export const deleteShortLink = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'shortLinks', id));
  } catch (error) {
    console.error('Error deleting short link:', error);
    throw error;
  }
};

export const getShortLinkByCode = async (shortCode: string) => {
  try {
    const q = query(collection(db, 'shortLinks'), where('shortCode', '==', shortCode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting short link:', error);
    return null;
  }
};

export const incrementShortLinkClick = async (id: string) => {
  try {
    const linkRef = doc(db, 'shortLinks', id);
    await updateDoc(linkRef, {
      clicks: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing click:', error);
  }
};
`;

content += additionalFunctions;
fs.writeFileSync('src/lib/db.ts', content);
console.log("Success");
