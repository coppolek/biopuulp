const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

content = content.replace(
  "ShoppingCart, Youtube} from 'lucide-react';",
  "ShoppingCart, Youtube, Bold, Italic, Type, Quote, Link2, Palette, Image as ImageIcon, Smile} from 'lucide-react';"
);

content = content.replace(
  "const [imageUrl, setImageUrl] = useState('');",
  `const [imageUrl, setImageUrl] = useState('');
  const [bgColor, setBgColor] = useState('');

  const insertFormat = (format: string) => {
    const textarea = document.getElementById('microblog-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    let newText = text;
    if (format === 'bold') newText = before + '**' + (selected || 'grassetto') + '**' + after;
    if (format === 'italic') newText = before + '_' + (selected || 'corsivo') + '_' + after;
    if (format === 'quote') newText = before + '\n> ' + (selected || 'citazione') + after;
    if (format === 'link') newText = before + '[' + (selected || 'testo') + '](url)' + after;
    if (format === 'h1') newText = before + '\n# ' + (selected || 'Titolo') + after;
    
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
    }, 0);
  };`
);

content = content.replace(
  "imageUrl: imageUrl || undefined,",
  "imageUrl: imageUrl || undefined,\n      tags: bgColor ? [bgColor] : [],"
);

content = content.replace(
  `<textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Scrivi qui il tuo pensiero breve..." 
          className="w-full bg-transparent border-none text-sm text-gray-600 resize-none h-24 focus:outline-none"
        ></textarea>`,
  `<div className="flex items-center gap-1 mb-2 border-b border-gray-100 pb-2 overflow-x-auto">
          <button type="button" onClick={() => insertFormat('bold')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Grassetto"><Bold className="w-4 h-4" /></button>
          <button type="button" onClick={() => insertFormat('italic')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Corsivo"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button type="button" onClick={() => insertFormat('h1')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Titolo"><Type className="w-4 h-4" /></button>
          <button type="button" onClick={() => insertFormat('quote')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Citazione"><Quote className="w-4 h-4" /></button>
          <button type="button" onClick={() => insertFormat('link')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Link"><Link2 className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <div className="flex items-center gap-1 relative group">
            <button type="button" className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1" title="Colore Sfondo">
              <Palette className="w-4 h-4" />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white shadow-lg border border-gray-200 rounded-lg p-2 gap-1 z-10">
              {['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e5e7eb', '#1a1a1a'].map(c => (
                <button type="button" key={c} onClick={() => setBgColor(c === 'transparent' ? '' : c)} className="w-6 h-6 rounded-full border border-gray-300" style={{ background: c }}></button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setContent(c => c + ' 😊')} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-md transition-colors" title="Emoji"><Smile className="w-4 h-4" /></button>
        </div>
        <textarea 
          id="microblog-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Scrivi qui la tua storia..." 
          className="w-full bg-transparent border-none text-sm text-gray-800 resize-none h-32 focus:outline-none"
          style={{ backgroundColor: bgColor || 'transparent', padding: bgColor ? '12px' : '0', borderRadius: '8px', color: bgColor === '#1a1a1a' ? 'white' : 'inherit' }}
        ></textarea>`
);

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Success");
