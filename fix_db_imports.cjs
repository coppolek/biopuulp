const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');
content = content.replace(
  "import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, increment } from 'firebase/firestore';",
  "import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, deleteDoc, increment, addDoc } from 'firebase/firestore';"
);
fs.writeFileSync('src/lib/db.ts', content);
console.log("Fixed db.ts");
