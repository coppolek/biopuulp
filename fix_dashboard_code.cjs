const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

// Ensure Code icon is imported
if (!content.includes('import { Video, Code } from \'lucide-react\';')) {
  content = content.replace("import { Video } from 'lucide-react';", "import { Video, Code } from 'lucide-react';");
}

// Update MicroblogEditor state
const stateTarget = `  const [videoUrl, setVideoUrl] = useState('');
  const [bgColor, setBgColor] = useState('');`;
const newState = `  const [videoUrl, setVideoUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [bgColor, setBgColor] = useState('');`;
content = content.replace(stateTarget, newState);

// Update handlePost
const handlePostTarget = `      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      seo: {`;
const newHandlePostTarget = `      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      embedCode: embedCode || undefined,
      seo: {`;
content = content.replace(handlePostTarget, newHandlePostTarget);

const clearStateTarget = `    setImageUrl('');
    setVideoUrl('');
    setSeoTitle('');`;
const newClearStateTarget = `    setImageUrl('');
    setVideoUrl('');
    setEmbedCode('');
    setSeoTitle('');`;
content = content.replace(clearStateTarget, newClearStateTarget);

// Add text area for Code inside the UI (maybe just a text area that appears when you click the Code button?)
// Wait, for FOTO and VIDEO it shows a preview, and the button is a label.
// For Code, we can add a toggle button and show a text area like SEO.
const seoStateTarget = `  const [showSeo, setShowSeo] = useState(false);`;
const newSeoStateTarget = `  const [showSeo, setShowSeo] = useState(false);
  const [showCode, setShowCode] = useState(false);`;
content = content.replace(seoStateTarget, newSeoStateTarget);

const postCodeTarget = `        {videoUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 max-h-48">
            <video src={videoUrl} controls className="w-full h-full object-contain" />
            <button 
              onClick={() => setVideoUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}`;

const newPostCode = `        {videoUrl && (
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
        
        {showCode && (
          <div className="mb-4 space-y-3 bg-white p-3 rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Embed Code (HTML/JS)</h4>
            <textarea 
              value={embedCode}
              onChange={e => setEmbedCode(e.target.value)}
              placeholder="Incolla qui il codice iframe, script o HTML..." 
              className="w-full bg-transparent border border-gray-200 p-2 text-sm resize-none h-24 focus:outline-none focus:border-black font-mono rounded"
            ></textarea>
          </div>
        )}`;

content = content.replace(postCodeTarget, newPostCode);

const buttonsTarget = `            <button 
              onClick={() => setShowSeo(!showSeo)}
              className={\`text-[10px] flex flex-col items-center gap-1 font-bold uppercase tracking-wider transition-colors \${showSeo ? 'text-black' : 'text-gray-400 hover:text-black'}\`}
            >
              <Globe className="w-4 h-4" />
              <span>SEO</span>
            </button>
          </div>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">`;

const newButtons = `            <button 
              onClick={() => setShowSeo(!showSeo)}
              className={\`text-[10px] flex flex-col items-center gap-1 font-bold uppercase tracking-wider transition-colors \${showSeo ? 'text-black' : 'text-gray-400 hover:text-black'}\`}
            >
              <Globe className="w-4 h-4" />
              <span>SEO</span>
            </button>
            <button 
              onClick={() => setShowCode(!showCode)}
              className={\`text-[10px] flex flex-col items-center gap-1 font-bold uppercase tracking-wider transition-colors \${showCode || embedCode ? 'text-black' : 'text-gray-400 hover:text-black'}\`}
            >
              <Code className="w-4 h-4" />
              <span>Codice</span>
            </button>
          </div>
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">`;

content = content.replace(buttonsTarget, newButtons);

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Updated EditorDashboard");
