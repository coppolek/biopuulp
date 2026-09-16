const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Title
content = content.replace(
  "<h2 className=\"text-2xl font-black italic tracking-tighter mb-4\">Crea Short Link</h2>",
  "<h2 className=\"text-2xl font-black italic tracking-tighter mb-4\">{editingShortLink ? 'Modifica Short Link' : 'Crea Short Link'}</h2>"
);

// Add fields to form
const formEndTarget = `                  <button 
                    type="submit"
                    className="w-full py-4 bg-black text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-gray-900 transition-colors"
                  >
                    Crea Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}`;

const newFields = `
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-bold uppercase tracking-widest text-xs mb-4">Meta Tags (SEO / Anteprima)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">Titolo Anteprima</label>
                        <input 
                          type="text" 
                          value={shortSeoTitle}
                          onChange={(e) => setShortSeoTitle(e.target.value)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold focus:border-black transition-colors text-sm"
                          placeholder="Titolo mostrato su social..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">Descrizione Anteprima</label>
                        <textarea 
                          value={shortSeoDescription}
                          onChange={(e) => setShortSeoDescription(e.target.value)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-colors text-sm resize-none h-20"
                          placeholder="Descrizione mostrata su social..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">URL Immagine Copertina</label>
                        <input 
                          type="url" 
                          value={shortSeoImage}
                          onChange={(e) => setShortSeoImage(e.target.value)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold focus:border-black transition-colors text-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-black text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-gray-900 transition-colors mt-6"
                  >
                    {editingShortLink ? 'Salva Modifiche' : 'Crea Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(formEndTarget, newFields);

// Add Edit button to Short Links mapping
const buttonsTarget = `<div className="flex items-end justify-end">
                        <button 
                          onClick={() => onDeleteShortLink && onDeleteShortLink(link.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>`;

const newButtons = `<div className="flex items-end justify-end gap-2">
                        <button 
                          onClick={() => openShortLinkModal(link)}
                          className="p-2 text-gray-400 hover:text-black transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteShortLink && onDeleteShortLink(link.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-100 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>`;

content = content.replace(buttonsTarget, newButtons);

// Ensure Edit3 is imported from lucide-react
if (!content.includes('Edit3')) {
  content = content.replace("import { Trash2, Edit2,", "import { Trash2, Edit2, Edit3,");
}

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx form and buttons");
