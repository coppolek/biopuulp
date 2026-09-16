const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `            )}
          </>
        )}`;

const replaceStr = `            )}
          </>
        )}

        {activeTab === 'short' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">Short Links</h1>
                <p className="text-gray-500 mt-2 font-medium">Abbrevia link e monetizza i click con gli annunci.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsShortModalOpen(true)}
                  className="bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 whitespace-nowrap"
                >
                  + Crea Link
                </button>
              </div>
            </div>

            {shortLinks.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
                <h3 className="text-xl font-bold mb-2">Nessuno short link</h3>
                <p className="text-gray-500 mb-6">Inizia ad abbreviare i tuoi link per tracciarli e monetizzarli.</p>
                <button 
                  onClick={() => setIsShortModalOpen(true)}
                  className="bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90"
                >
                  + Crea Short Link
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shortLinks.map(link => (
                  <div key={link.id} className="bg-white border-2 border-black rounded-[2rem] p-6 hover:shadow-xl transition-all duration-300 flex flex-col group relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black uppercase tracking-widest text-lg mb-1">{link.title || link.shortCode}</h3>
                        <p className="text-gray-400 text-[10px] break-all">{link.targetUrl}</p>
                      </div>
                      {link.monetized && (
                         <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">Monetizzato</span>
                      )}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-black">{window.location.origin}/s/{link.shortCode}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(\`\${window.location.origin}/s/\${link.shortCode}\`); toast.success('Link copiato!'); }}
                        className="p-1.5 bg-white border border-gray-200 hover:border-black text-gray-500 hover:text-black rounded-md transition-colors"
                        title="Copia link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-auto border-t-2 border-dashed border-gray-100 pt-4">
                      <div>
                        <div className="text-[10px] uppercase opacity-60 mb-1">Click</div>
                        <div className="text-xl font-black tracking-tighter">{link.clicks || 0}</div>
                      </div>
                      <div className="flex items-end justify-end">
                        <button 
                          onClick={() => onDeleteShortLink && onDeleteShortLink(link.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isShortModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-black shadow-lg">
              <h2 className="text-2xl font-black italic tracking-tighter mb-4">Crea Short Link</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (shortTargetUrl.trim() && shortCode.trim()) {
                  onCreateShortLink && onCreateShortLink({
                    title: shortTitle.trim(),
                    targetUrl: shortTargetUrl.trim(),
                    shortCode: shortCode.trim(),
                    monetized: shortMonetized
                  });
                  setIsShortModalOpen(false);
                  setShortTitle('');
                  setShortTargetUrl('');
                  setShortCode('');
                  setShortMonetized(false);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Titolo (opzionale)</label>
                    <input 
                      type="text" 
                      value={shortTitle}
                      onChange={(e) => setShortTitle(e.target.value)}
                      className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold focus:border-black transition-colors"
                      placeholder="Mio Link"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">URL di destinazione</label>
                    <input 
                      type="url" 
                      value={shortTargetUrl}
                      onChange={(e) => setShortTargetUrl(e.target.value)}
                      className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold focus:border-black transition-colors"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2">Short Code custom</label>
                    <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden focus-within:border-black transition-all">
                      <span className="px-4 py-3 text-gray-500 font-medium">/s/</span>
                      <input 
                        type="text" 
                        value={shortCode}
                        onChange={(e) => setShortCode(e.target.value)}
                        className="w-full py-3 pr-4 bg-transparent outline-none font-bold"
                        placeholder="il-mio-link"
                        required
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-black transition-colors">
                    <input 
                      type="checkbox" 
                      checked={shortMonetized}
                      onChange={(e) => setShortMonetized(e.target.checked)}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <div>
                      <div className="font-bold text-sm">Monetizza Click</div>
                      <div className="text-[10px] text-gray-500 mt-1">Mostra annunci per 5 secondi prima del redirect per guadagnare</div>
                    </div>
                  </label>
                </div>
                <div className="flex justify-end gap-3 mt-6">
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
                </div>
              </form>
            </div>
          </div>
        )}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', content);
console.log("Success");
