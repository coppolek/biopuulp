const fs = require('fs');
let code = fs.readFileSync('src/components/PublicBioPage.tsx', 'utf8');

// replace the state to hold { url: string }
code = code.replace(/const \[confirmLink, setConfirmLink\] = useState<BioLink \| null>\(null\);/, 
  "const [confirmLink, setConfirmLink] = useState<{url: string} | null>(null);");

// replace SocialLink click
code = code.replace(/href=\{social\.url\} \n\s*target="_blank" \n\s*rel="noreferrer"/g, 
  `href={social.url}\n                onClick={(e) => { e.preventDefault(); setConfirmLink({ url: social.url }); }}`);

fs.writeFileSync('src/components/PublicBioPage.tsx', code);
console.log("Fixed social links!");
