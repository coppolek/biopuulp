const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldStr = `<div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden">
                      <img src={page.profile.avatarUrl} alt="" />
                    </div>
                    <div>
                      <h3 className="font-black italic tracking-tighter text-xl">{page.slug}</h3>
                      <div className="flex items-center gap-2">
                        <a href={\`/\${page.slug}\`} target="_blank" className="text-sm font-bold hover:underline">
                          {page.customDomain ? page.customDomain : \`puulp.it/\${page.slug}\`}
                        </a>
                        <button 
                          onClick={(e) => copyUrl(e, page)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black rounded-md transition-colors"
                          title="Copia link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                  <div className="flex items-center gap-3">
                  </div>
                    <button 
                      onClick={() => { setDuplicateTarget(page); setDuplicateSlug(page.slug + '-copy'); }}
                      className="p-2 bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors"
                      title="Duplica Pagina"
                    >
                      <Files className="w-4 h-4" />
                    </button>
                  </div>
                </div>`;

const newStr = `<div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden flex-shrink-0">
                      <img src={page.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-black italic tracking-tighter text-xl">{page.slug}</h3>
                      <div className="flex items-center gap-2">
                        <a href={\`/\${page.slug}\`} target="_blank" className="text-sm font-bold hover:underline">
                          {page.customDomain ? page.customDomain : \`puulp.it/\${page.slug}\`}
                        </a>
                        <button 
                          onClick={(e) => copyUrl(e, page)}
                          className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black rounded-md transition-colors"
                          title="Copia link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {page.socials && page.socials.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {page.socials.slice(0, 5).map((social, i) => (
                            <SocialIcon key={i} platform={social.platform} className="w-4 h-4 text-gray-400" />
                          ))}
                          {page.socials.length > 5 && (
                            <span className="text-[10px] font-bold text-gray-400 ml-1">+{page.socials.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setDuplicateTarget(page); setDuplicateSlug(page.slug + '-copy'); }}
                    className="p-2 bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    title="Duplica Pagina"
                  >
                    <Files className="w-4 h-4" />
                  </button>
                </div>`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success");
} else {
  console.error("Pattern not found. Checking exactly what is in the file:");
  const lines = content.split('\\n');
  const startIdx = lines.findIndex(l => l.includes('<div className="flex justify-between items-start mb-6">'));
  if (startIdx !== -1) {
    console.log(lines.slice(startIdx, startIdx + 30).join('\\n'));
  }
}
