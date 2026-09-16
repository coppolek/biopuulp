const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

const targetToRemove = `      {page.modules && page.modules.filter(m => m.type === 'microblog').length > 0 && (
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

if (content.indexOf(targetToRemove) !== -1) {
  content = content.replace(targetToRemove, '');
  fs.writeFileSync('src/components/EditorDashboard.tsx', content);
  console.log("Removed rogue page reference in SortableLayoutItem");
} else {
  console.log("Target not found");
}
