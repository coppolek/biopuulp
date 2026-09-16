const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

// Remove from SortableLayoutItem
const badTargetStart = `      {page.modules && page.modules.filter(m => m.type === 'microblog').length > 0 && (`
const badTargetEnd = `        </div>
      )}
    </div>
  );
}`;

const badIndexStart = content.indexOf(badTargetStart);
const badIndexEnd = content.indexOf(badTargetEnd) + badTargetEnd.length;

if (badIndexStart !== -1 && badIndexEnd > badIndexStart) {
  const badContent = content.substring(badIndexStart, badIndexEnd);
  content = content.replace(badContent, `    </div>\n  );\n}`);
}

// Find MicroblogEditor end
const microblogEditorEndTarget = `          </div>
        </div>
      </div>
    </div>
  );
}`;

const postsList = `      </div>
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
      )}
    </div>
  );
}`;

// I need to be more precise about replacing the end of MicroblogEditor.
// Let's use string replace carefully by finding the string before AnalyticsEditor
const findTarget = `            {editingId && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`;

const replaceTarget = `            {editingId && (
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
            )}
          </div>
        </div>
${postsList.replace('      </div>\n', '')}`;

content = content.replace(findTarget, replaceTarget);

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Fixed microblog list");
