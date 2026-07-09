const fs = require('fs');
let code = fs.readFileSync('src/components/PublicBioPage.tsx', 'utf8');

code = code.replace(/href=\{banner\.linkUrl\}\n                    onClick=\{\(e\) => \{ e\.preventDefault\(\); setConfirmLink\(\{ url: banner\.linkUrl \}\); \}\} className="block w-full"/g, 
  `href={banner.linkUrl}\n                    onClick={(e) => { if (banner.linkUrl) { e.preventDefault(); setConfirmLink({ url: banner.linkUrl }); } }} className="block w-full"`);

fs.writeFileSync('src/components/PublicBioPage.tsx', code);
console.log("Fixed banners 2!");
