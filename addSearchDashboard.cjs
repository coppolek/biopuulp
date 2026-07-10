const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr1 = `  const [duplicateTarget, setDuplicateTarget] = useState<BioPage | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState('');`;

const replaceStr1 = `  const [duplicateTarget, setDuplicateTarget] = useState<BioPage | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');`;

const targetStr2 = `        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">I tuoi Bio Site</h1>
            <p className="text-gray-500 mt-2 font-medium">Gestisci le tue pagine e monitora le analytics.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90"
          >
            + Nuova Pagina
          </button>
        </div>

        {pages.length === 0 ? (`;

const replaceStr2 = `        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">I tuoi Bio Site</h1>
            <p className="text-gray-500 mt-2 font-medium">Gestisci le tue pagine e monitora le analytics.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cerca pagina o slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border-2 border-gray-200 rounded-full focus:border-black outline-none transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 whitespace-nowrap"
            >
              + Nuova Pagina
            </button>
          </div>
        </div>

        {pages.length === 0 ? (`;

const targetStr3 = `            {pages.map(page => (
              <div key={page.id} className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm hover:shadow-lg transition-all group relative flex flex-col">`;

const replaceStr3 = `            {pages.filter(page => page.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || page.slug.toLowerCase().includes(searchQuery.toLowerCase())).map(page => (
              <div key={page.id} className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm hover:shadow-lg transition-all group relative flex flex-col">`;

let success = true;
if (content.includes(targetStr1)) content = content.replace(targetStr1, replaceStr1); else { console.log("Str1 not found"); success = false; }
if (content.includes(targetStr2)) content = content.replace(targetStr2, replaceStr2); else { console.log("Str2 not found"); success = false; }
if (content.includes(targetStr3)) content = content.replace(targetStr3, replaceStr3); else { console.log("Str3 not found"); success = false; }

if (success) {
  fs.writeFileSync('src/App.tsx', content);
  console.log("Success");
}
