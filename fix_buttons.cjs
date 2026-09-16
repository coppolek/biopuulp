const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetButtons = `<div className="mt-auto pt-4">
                  <button 
                    onClick={() => onEdit(page)}
                    className="w-full py-3 border-2 border-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-black hover:text-white transition-colors"
                  >
                    Gestisci Pagina
                  </button>
                </div>`;

const updatedButtons = `<div className="mt-auto pt-4 flex gap-2">
                  <button 
                    onClick={() => onEdit(page)}
                    className="flex-1 py-3 border-2 border-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-black hover:text-white transition-colors"
                  >
                    Gestisci Pagina
                  </button>
                  <button 
                    onClick={() => onViewAnalytics && onViewAnalytics(page)}
                    className="px-4 py-3 border-2 border-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-black hover:text-white transition-colors flex items-center justify-center"
                    title="Statistiche"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </button>
                </div>`;

content = content.replace(targetButtons, updatedButtons);
fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx buttons");
