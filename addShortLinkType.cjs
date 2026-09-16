const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

if (!content.includes('export type ShortLink')) {
  content += `\nexport type ShortLink = {
  id: string;
  shortCode: string;
  targetUrl: string;
  title: string;
  clicks: number;
  createdAt: string;
  monetized: boolean; // if true, shows interstitial ads before redirecting
};
`;
  fs.writeFileSync('src/types.ts', content);
}
console.log("Success");
