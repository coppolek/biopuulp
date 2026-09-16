const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

const newFunc = `export const updateShortLink = async (id: string, data: any) => {
  try {
    const docRef = doc(db, 'shortLinks', id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating short link:', error);
    throw error;
  }
};

export const deleteShortLink`;

content = content.replace("export const deleteShortLink", newFunc);
fs.writeFileSync('src/lib/db.ts', content);
console.log("Updated db.ts");
