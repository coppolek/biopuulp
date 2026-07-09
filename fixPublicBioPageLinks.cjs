const fs = require('fs');
let code = fs.readFileSync('src/components/PublicBioPage.tsx', 'utf8');

// Add confirmLink state
if (!code.includes('const [confirmLink')) {
  code = code.replace(/const \[banners, setBanners\] = useState<AppBanner\[\]>\(\[\]\);/g, 
  "const [banners, setBanners] = useState<AppBanner[]>([]);\n  const [confirmLink, setConfirmLink] = useState<BioLink | null>(null);");
}

// Intercept link clicks
// We look for:
// <motion.a
//   key={link.id}
//   href={link.url}
//   target="_blank"
//   rel="noreferrer"

code = code.replace(/href=\{link\.url\}\n\s*target="_blank"\n\s*rel="noreferrer"/g, 
  `href={link.url}\n                    onClick={(e) => { e.preventDefault(); setConfirmLink(link); }}`);


// Add the modal before the closing </div> of the main return
// we know the end of the file looks like:
/*
      {/* Bottom Banners *\/}
      {!isPreview && bottomBanners.length > 0 && (
        ...
      )}
    </div>
    </>
  );
}
*/

const modalCode = `
      {/* Link Confirmation Modal */}
      {confirmLink && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmLink(null)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-[#1A1A1A]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-black">Stai uscendo dalla pagina</h3>
            <p className="text-gray-500 mb-6 text-sm">Stai per visitare un sito web esterno. Vuoi continuare?</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmLink(null)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-500 font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors text-xs"
              >
                Annulla
              </button>
              <a 
                href={confirmLink.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => setConfirmLink(null)}
                className="flex-1 px-4 py-3 bg-[#1A1A1A] text-white font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2 text-xs"
              >
                Continua
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </>
`;

code = code.replace(/    <\/div>\n    <\/>\n  \);\n\}/g, modalCode + "\n  );\n}");

fs.writeFileSync('src/components/PublicBioPage.tsx', code);
console.log("Fixed!");
