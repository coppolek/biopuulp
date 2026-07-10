const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

const targetStr = `function MicroblogEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bgColor, setBgColor] = useState('');`;

const replaceStr = `import { Video } from 'lucide-react';

function MicroblogEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [showSeo, setShowSeo] = useState(false);`;

content = content.replace(targetStr, replaceStr);

const targetStr2 = `    const newModule: BioModule = {
      type: 'microblog',
      id: Date.now().toString(),
      title,
      content,
      imageUrl: imageUrl || undefined,
      date: new Date().toISOString(),
      tags: bgColor ? [bgColor] : []
    };`;

const replaceStr2 = `    const newModule: BioModule = {
      type: 'microblog',
      id: Date.now().toString(),
      title,
      content,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      seo: {
        title: seoTitle || undefined,
        description: seoDescription || undefined
      },
      date: new Date().toISOString(),
      tags: bgColor ? [bgColor] : []
    };`;

content = content.replace(targetStr2, replaceStr2);

const targetStr3 = `    setPage({ ...page, modules: [newModule, ...(page.modules || [])] });
    setTitle('');
    setContent('');
    setImageUrl('');
    alert('Post aggiunto alla pagina!');
  };`;

const replaceStr3 = `    setPage({ ...page, modules: [newModule, ...(page.modules || [])] });
    setTitle('');
    setContent('');
    setImageUrl('');
    setVideoUrl('');
    setSeoTitle('');
    setSeoDescription('');
    setShowSeo(false);
    alert('Post aggiunto alla pagina!');
  };`;

content = content.replace(targetStr3, replaceStr3);


const targetStr4 = `        {imageUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-48">
            <img src={imageUrl} alt="Anteprima media" className="w-full h-full object-contain" />
            <button 
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
          <label className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-wider cursor-pointer">
            Aggiungi Foto
            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImageUrl(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-400">{content.length} / 500 char</span>
            <button 
              onClick={handlePost}
              className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:opacity-90"
            >Pubblica</button>
          </div>
        </div>`;

const replaceStr4 = `        {imageUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-48">
            <img src={imageUrl} alt="Anteprima media" className="w-full h-full object-contain" />
            <button 
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        {videoUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-48">
            <video src={videoUrl} controls className="w-full h-full object-contain" />
            <button 
              onClick={() => setVideoUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        
        {showSeo && (
          <div className="mb-4 space-y-3 bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Impostazioni SEO</h4>
            <input 
              type="text" 
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              placeholder="SEO Title (opzionale)" 
              className="w-full bg-transparent border-b border-gray-200 py-1 text-sm focus:outline-none focus:border-black" 
            />
            <textarea 
              value={seoDescription}
              onChange={e => setSeoDescription(e.target.value)}
              placeholder="SEO Description (opzionale)" 
              className="w-full bg-transparent border-none text-sm resize-none h-16 focus:outline-none"
            ></textarea>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 pt-2 border-t border-gray-200 gap-4">
          <div className="flex items-center gap-4">
            <label className="text-[10px] flex flex-col items-center gap-1 font-bold text-gray-400 hover:text-black uppercase tracking-wider cursor-pointer transition-colors">
              <ImageIcon className="w-4 h-4" />
              <span>Foto</span>
              <input 
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImageUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            <label className="text-[10px] flex flex-col items-center gap-1 font-bold text-gray-400 hover:text-black uppercase tracking-wider cursor-pointer transition-colors">
              <Video className="w-4 h-4" />
              <span>Video</span>
              <input 
                type="file" 
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setVideoUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            <button 
              onClick={() => setShowSeo(!showSeo)}
              className={\`text-[10px] flex flex-col items-center gap-1 font-bold uppercase tracking-wider transition-colors \${showSeo ? 'text-black' : 'text-gray-400 hover:text-black'}\`}
            >
              <Globe className="w-4 h-4" />
              <span>SEO</span>
            </button>
          </div>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <span className="text-[10px] font-mono text-gray-400">{content.length} / 500</span>
            <button 
              onClick={handlePost}
              className="px-6 py-2 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:opacity-90 w-full sm:w-auto"
            >Pubblica</button>
          </div>
        </div>`;

content = content.replace(targetStr4, replaceStr4);

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Success");
