const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  "getUserShortLinks, createShortLink, deleteShortLink } from './lib/db';",
  "getUserShortLinks, createShortLink, deleteShortLink, updateShortLink } from './lib/db';"
);
fs.writeFileSync('src/App.tsx', content);
console.log("Fixed import");
