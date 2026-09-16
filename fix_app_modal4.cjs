const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetButtonsContainer = `<div className="flex justify-end gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsShortModalOpen(false)}
                    className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-all"
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Crea Link
                  </button>
                </div>`;

const newFormSection = `
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="font-black italic uppercase tracking-widest text-sm mb-4">Meta Tags & Anteprima</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">Titolo Anteprima</label>
                        <input 
                          type="text" 
                          value={shortSeoTitle}
                          onChange={(e) => setShortSeoTitle(e.target.value)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium focus:border-black transition-colors"
                          placeholder="es. Scopri la nuova collezione..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">Descrizione Anteprima</label>
                        <textarea 
                          value={shortSeoDescription}
                          onChange={(e) => setShortSeoDescription(e.target.value)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium focus:border-black transition-colors resize-none h-20"
                          placeholder="Testo visibile quando condividi su WhatsApp, Facebook..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-2">Immagine Copertina (URL)</label>
                        <input 
                          type="url" 
                          value={shortSeoImage}
                          onChange={(e) => setShortSeoImage(e.target.value)}
                          className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium focus:border-black transition-colors"
                          placeholder="https://.../immagine.jpg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8">
                  <button 
                    type="button" 
                    onClick={() => setIsShortModalOpen(false)}
                    className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-all"
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    {editingShortLink ? 'Salva Modifiche' : 'Crea Link'}
                  </button>
                </div>`;

content = content.replace(targetButtonsContainer, newFormSection);

// Fix title if not already fixed
content = content.replace(
  "<h2 className=\"text-2xl font-black italic tracking-tighter mb-4\">Crea Short Link</h2>",
  "<h2 className=\"text-2xl font-black italic tracking-tighter mb-4\">{editingShortLink ? 'Modifica Short Link' : 'Crea Short Link'}</h2>"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated Short Link form with SEO fields");
