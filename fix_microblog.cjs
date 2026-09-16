const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

const statesTarget = `  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');`;
const newStates = `  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');`;
content = content.replace(statesTarget, newStates);

const handlePostTarget = `  const handlePost = () => {
    if (!title || !content) return;
    const newModule: BioModule = {
      type: 'microblog',
      id: Date.now().toString(),
      title,
      content,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      embedCode: embedCode || undefined,
      seo: {
        title: seoTitle || undefined,
        description: seoDescription || undefined
      },
      date: new Date().toISOString(),
      tags: bgColor ? [bgColor] : []
    };
    setPage({ ...page, modules: [newModule, ...(page.modules || [])] });
    setTitle('');
    setContent('');
    setImageUrl('');
    setVideoUrl('');
    setEmbedCode('');
    setSeoTitle('');
    setSeoDescription('');
    setShowSeo(false);
    alert('Post aggiunto alla pagina!');
  };`;

const newHandlePost = `  const handlePost = () => {
    if (!title || !content) return;
    const newModule: any = {
      type: 'microblog',
      id: editingId || Date.now().toString(),
      title,
      content,
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      embedCode: embedCode || undefined,
      seo: {
        title: seoTitle || undefined,
        description: seoDescription || undefined
      },
      date: new Date().toISOString(),
      tags: bgColor ? [bgColor] : []
    };
    
    if (editingId) {
      setPage({ ...page, modules: page.modules.map(m => m.id === editingId ? newModule : m) });
    } else {
      setPage({ ...page, modules: [newModule, ...(page.modules || [])] });
    }
    
    setTitle('');
    setContent('');
    setImageUrl('');
    setVideoUrl('');
    setEmbedCode('');
    setSeoTitle('');
    setSeoDescription('');
    setShowSeo(false);
    setShowCode(false);
    setEditingId(null);
    setBgColor('');
    toast.success(editingId ? 'Post modificato!' : 'Post aggiunto alla pagina!');
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setTitle(m.title || '');
    setContent(m.content || '');
    setImageUrl(m.imageUrl || '');
    setVideoUrl(m.videoUrl || '');
    setEmbedCode(m.embedCode || '');
    setSeoTitle(m.seo?.title || '');
    setSeoDescription(m.seo?.description || '');
    setBgColor(m.tags?.[0] || '');
    setShowSeo(!!(m.seo?.title || m.seo?.description));
    setShowCode(!!m.embedCode);
    
    // Scroll to form
    const form = document.getElementById('microblog-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo post?')) {
      setPage({ ...page, modules: page.modules.filter(m => m.id !== id) });
    }
  };`;

content = content.replace(handlePostTarget, newHandlePost);

const returnTarget = `      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">`;
const newReturnTarget = `      <div id="microblog-form" className="p-5 bg-gray-50 rounded-2xl border border-gray-100">`;
content = content.replace(returnTarget, newReturnTarget);

const submitButtonTarget = `            <button 
              onClick={handlePost}
              className="px-6 py-2 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:opacity-90 w-full sm:w-auto"
            >Pubblica</button>`;
const newSubmitButton = `            <button 
              onClick={handlePost}
              className="px-6 py-2 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:opacity-90 w-full sm:w-auto"
            >{editingId ? 'Salva Modifiche' : 'Pubblica'}</button>
            {editingId && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setTitle('');
                  setContent('');
                  setImageUrl('');
                  setVideoUrl('');
                  setEmbedCode('');
                  setSeoTitle('');
                  setSeoDescription('');
                  setShowSeo(false);
                  setShowCode(false);
                  setBgColor('');
                }}
                className="px-6 py-2 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg uppercase tracking-widest hover:bg-gray-300 w-full sm:w-auto mt-2 sm:mt-0"
              >Annulla</button>
            )}`;
content = content.replace(submitButtonTarget, newSubmitButton);

const postsList = `
      {page.modules && page.modules.filter(m => m.type === 'microblog').length > 0 && (
        <div className="mt-12 space-y-4">
          <h3 className="font-bold uppercase tracking-widest text-xs text-gray-500 mb-4">Post Pubblicati</h3>
          {page.modules.filter(m => m.type === 'microblog').map((m: any) => (
            <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between group">
              <div>
                <h4 className="font-black italic text-lg">{m.title}</h4>
                <p className="text-gray-500 text-xs truncate max-w-sm mt-1">{m.content.substring(0, 100)}...</p>
                <div className="text-[10px] text-gray-400 mt-2 font-mono">{new Date(m.date).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(m)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition-colors"
                  title="Modifica"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}`;

const wrapperEndTarget = `      </div>
    </div>
  );
}`;
const newWrapperEnd = `      </div>
${postsList}
    </div>
  );
}`;
content = content.replace(wrapperEndTarget, newWrapperEnd);

// ensure Trash2 is imported
if (!content.includes("Trash2")) {
  content = content.replace("import { Trash2 } from 'lucide-react';", "");
  content = content.replace("import { Video, Code } from 'lucide-react';", "import { Video, Code, Trash2 } from 'lucide-react';");
}

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Updated MicroblogEditor with Edit/Delete");
