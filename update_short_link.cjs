const fs = require('fs');
let content = fs.readFileSync('src/components/ShortLinkRedirect.tsx', 'utf8');

// Update imports
content = content.replace(
  "import { getShortLinkByCode, incrementShortLinkClick } from '../lib/db';",
  "import { getShortLinkByCode, incrementShortLinkClick, getAllBanners } from '../lib/db';\nimport { AppBanner } from '../types';"
);

// Add banner state
content = content.replace(
  "const [linkData, setLinkData] = useState<any>(null);",
  "const [linkData, setLinkData] = useState<any>(null);\n  const [adBanner, setAdBanner] = useState<AppBanner | null>(null);"
);

// Fetch banners in processLink if monetized
content = content.replace(
  "      if (!data.monetized) {\n        window.location.href = data.targetUrl;\n      } else {\n        setLoading(false);\n      }",
  "      if (!data.monetized) {\n        window.location.href = data.targetUrl;\n      } else {\n        try {\n          const banners = await getAllBanners();\n          const activeShortUrlBanners = banners.filter(b => b.active && b.position === 'short_url');\n          if (activeShortUrlBanners.length > 0) {\n            // Pick a random banner\n            const randomBanner = activeShortUrlBanners[Math.floor(Math.random() * activeShortUrlBanners.length)];\n            setAdBanner(randomBanner);\n          }\n        } catch (e) {\n          console.error(e);\n        }\n        setLoading(false);\n      }"
);

// Update render placeholder with actual banner
const oldAdRender = `{/* Placeholder for actual Ad Network integration */}
        <div className="w-full max-w-2xl bg-white aspect-[16/9] md:aspect-[21/9] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="text-center p-6 relative z-10">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-black mb-2">Spazio Pubblicitario</h2>
            <p className="text-gray-500 font-medium text-sm md:text-base">Supporta il creatore visualizzando questo annuncio.</p>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
        </div>`;

const newAdRender = `{adBanner ? (
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative group mb-4">
            {adBanner.type === 'image' ? (
              <a href={adBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative aspect-[16/9] md:aspect-[21/9]">
                <img src={adBanner.imageUrl} alt={adBanner.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold backdrop-blur-sm">AD</div>
              </a>
            ) : adBanner.type === 'text' ? (
              <a href={adBanner.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full flex flex-col items-center justify-center text-center p-8 relative aspect-[16/9] md:aspect-[21/9]" style={{ backgroundColor: adBanner.backgroundColor, color: adBanner.textColor }}>
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-widest">{adBanner.text}</h2>
                <div className="absolute top-2 right-2 bg-black/10 text-current text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold backdrop-blur-sm border border-current/20">AD</div>
              </a>
            ) : (
              <div className="w-full aspect-[16/9] md:aspect-[21/9] flex items-center justify-center bg-gray-50 relative">
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold z-10">AD</div>
                <div dangerouslySetInnerHTML={{ __html: adBanner.code || '' }} />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl bg-white aspect-[16/9] md:aspect-[21/9] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group mb-4">
            <div className="text-center p-6 relative z-10">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-black mb-2">Spazio Pubblicitario</h2>
              <p className="text-gray-500 font-medium text-sm md:text-base">Supporta il creatore visualizzando questo annuncio.</p>
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
          </div>
        )}`;

content = content.replace(oldAdRender, newAdRender);

fs.writeFileSync('src/components/ShortLinkRedirect.tsx', content);
console.log("Success short link");
