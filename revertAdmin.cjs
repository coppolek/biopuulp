const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/let pages = \[\];\n\s*let banners = \[\];\n\s*try \{ pages = await getAllPages\(\); \} catch \(e\) \{ console.error\("pages err", e\); throw e; \}\n\s*try \{ banners = await getAllBanners\(\); \} catch \(e\) \{ console.error\("banners err", e\); throw e; \}/g, 
`const [pages, banners] = await Promise.all([
          getAllPages(),
          getAllBanners()
        ]);`);

fs.writeFileSync('src/App.tsx', code);
