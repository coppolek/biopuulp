const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \[pages, banners\] = await Promise\.all\(\[\n\s*getAllPages\(\),\n\s*getAllBanners\(\)\n\s*\]\);/g, 
`let pages = [];
        let banners = [];
        try { pages = await getAllPages(); } catch (e) { console.error("pages err", e); throw e; }
        try { banners = await getAllBanners(); } catch (e) { console.error("banners err", e); throw e; }`);

fs.writeFileSync('src/App.tsx', code);
