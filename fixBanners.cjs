const fs = require('fs');
let code = fs.readFileSync('src/components/PublicBioPage.tsx', 'utf8');

code = code.replace(/href=\{banner\.linkUrl\} target="_blank" rel="noreferrer"/g, 
  `href={banner.linkUrl}\n                    onClick={(e) => { e.preventDefault(); setConfirmLink({ url: banner.linkUrl }); }}`);

fs.writeFileSync('src/components/PublicBioPage.tsx', code);
console.log("Fixed banners!");
