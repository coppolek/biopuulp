const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `        {pages.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
            <h3 className="text-xl font-bold mb-2">Nessuna pagina trovata</h3>
            <p className="text-gray-500 mb-6">Crea il tuo primo Bio Site per iniziare.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90"
            >
              + Crea Pagina
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.filter(page => page.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || page.slug.toLowerCase().includes(searchQuery.toLowerCase())).map(page => (`;

const replaceStr = `        {pages.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
            <h3 className="text-xl font-bold mb-2">Nessuna pagina trovata</h3>
            <p className="text-gray-500 mb-6">Crea il tuo primo Bio Site per iniziare.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90"
            >
              + Crea Pagina
            </button>
          </div>
        ) : (
          <>
            {pages.filter(page => page.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || page.slug.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl mt-4">
                <p className="text-gray-500 font-bold mb-2">Nessun risultato per "{searchQuery}"</p>
                <button onClick={() => setSearchQuery('')} className="text-xs uppercase tracking-widest underline">Azzera filtri</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.filter(page => page.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || page.slug.toLowerCase().includes(searchQuery.toLowerCase())).map(page => (
`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  
  const endTarget = `                </div>
              </div>
            ))}
          </div>
        )}`;
        
  const endReplace = `                </div>
              </div>
            ))}
              </div>
            )}
          </>
        )}`;
  
  if (content.includes(endTarget)) {
      content = content.replace(endTarget, endReplace);
      fs.writeFileSync('src/App.tsx', content);
      console.log("Success");
  } else {
      console.log("End target not found");
  }

} else {
  console.log("Start target not found");
}
