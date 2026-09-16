const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');
content = content.replace(
  "return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };",
  "return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;"
);
fs.writeFileSync('src/lib/db.ts', content);
console.log("Fixed db.ts type");
