const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace(
  "| { type: 'microblog'; id: string; title: string; content: string; date: string; imageUrl?: string; videoUrl?: string; tags: string[]; seo?: { title?: string; description?: string } }",
  "| { type: 'microblog'; id: string; title: string; content: string; date: string; imageUrl?: string; videoUrl?: string; embedCode?: string; tags: string[]; seo?: { title?: string; description?: string } }"
);
fs.writeFileSync('src/types.ts', content);
console.log("Updated types.ts");
