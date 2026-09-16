const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update Banner form to include 'text'
content = content.replace(
  "const [newBannerType, setNewBannerType] = useState<'image' | 'code'>('image');",
  "const [newBannerType, setNewBannerType] = useState<'image' | 'code' | 'text'>('image');\n  const [newBannerText, setNewBannerText] = useState('');\n  const [newBannerTextColor, setNewBannerTextColor] = useState('#000000');\n  const [newBannerBgColor, setNewBannerBgColor] = useState('#ffffff');"
);

content = content.replace(
  "const [newBannerPosition, setNewBannerPosition] = useState<'top' | 'bottom'>('top');",
  "const [newBannerPosition, setNewBannerPosition] = useState<'top' | 'bottom' | 'short_url'>('top');"
);

// Reset text fields
content = content.replace(
  "setNewBannerImageUrl('');\n    setNewBannerLinkUrl('');",
  "setNewBannerImageUrl('');\n    setNewBannerLinkUrl('');\n    setNewBannerText('');\n    setNewBannerTextColor('#000000');\n    setNewBannerBgColor('#ffffff');"
);

content = content.replace(
  "if (newBannerType === 'image') {\n      banner.imageUrl = newBannerImageUrl;\n      banner.linkUrl = newBannerLinkUrl;\n    } else {\n      banner.code = newBannerCode;\n    }",
  "if (newBannerType === 'image') {\n      banner.imageUrl = newBannerImageUrl;\n      banner.linkUrl = newBannerLinkUrl;\n    } else if (newBannerType === 'text') {\n      banner.text = newBannerText;\n      banner.textColor = newBannerTextColor;\n      banner.backgroundColor = newBannerBgColor;\n      banner.linkUrl = newBannerLinkUrl;\n    } else {\n      banner.code = newBannerCode;\n    }"
);

content = content.replace(
  "<option value=\"bottom\">In basso</option>",
  "<option value=\"bottom\">In basso</option>\n                  <option value=\"short_url\">Short URL (Ad)</option>"
);

content = content.replace(
  "<option value=\"code\">Codice personalizzato / AdSense</option>",
  "<option value=\"code\">Codice personalizzato / AdSense</option>\n                  <option value=\"text\">Testo</option>"
);

let formCode = `
              {newBannerType === 'image' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1">URL Immagine</label>
                    <input 
                      type="url" 
                      value={newBannerImageUrl}
                      onChange={e => setNewBannerImageUrl(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1">URL Destinazione</label>
                    <input 
                      type="url" 
                      value={newBannerLinkUrl}
                      onChange={e => setNewBannerLinkUrl(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                      placeholder="https://..."
                      required
                    />
                  </div>
                </>
              ) : newBannerType === 'text' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1">Testo Banner</label>
                    <input 
                      type="text" 
                      value={newBannerText}
                      onChange={e => setNewBannerText(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                      placeholder="Scopri la nostra nuova offerta..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1">Colore Testo</label>
                      <input 
                        type="color" 
                        value={newBannerTextColor}
                        onChange={e => setNewBannerTextColor(e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-1">Colore Sfondo</label>
                      <input 
                        type="color" 
                        value={newBannerBgColor}
                        onChange={e => setNewBannerBgColor(e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1">URL Destinazione</label>
                    <input 
                      type="url" 
                      value={newBannerLinkUrl}
                      onChange={e => setNewBannerLinkUrl(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black"
                      placeholder="https://..."
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1">Codice (HTML/JS)</label>
                  <textarea 
                    value={newBannerCode}
                    onChange={e => setNewBannerCode(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-black font-mono text-xs"
                    rows={6}
                    placeholder="<script>...</script>"
                    required
                  ></textarea>
                </div>
              )}`;

const targetFormCodeStart = `{newBannerType === 'image' ? (`;
const targetFormCodeEnd = `></textarea>\n                </div>\n              )}`;
const fullTarget = content.substring(content.indexOf(targetFormCodeStart), content.indexOf(targetFormCodeEnd) + targetFormCodeEnd.length);

content = content.replace(fullTarget, formCode);

fs.writeFileSync('src/App.tsx', content);
console.log("Success admin form");
