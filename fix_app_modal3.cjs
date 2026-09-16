const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const buttonsTarget = `<div className="flex items-end justify-end">
                        <button 
                          onClick={() => onDeleteShortLink && onDeleteShortLink(link.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>`;

const newButtons = `<div className="flex items-end justify-end gap-2">
                        <button 
                          onClick={() => openShortLinkModal(link)}
                          className="p-2 text-gray-400 hover:text-black transition-colors"
                          title="Modifica"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button 
                          onClick={() => onDeleteShortLink && onDeleteShortLink(link.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Elimina"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>`;

content = content.replace(buttonsTarget, newButtons);
fs.writeFileSync('src/App.tsx', content);
console.log("Updated Short Link buttons");
