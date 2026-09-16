const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `            )}
          </>
        )}

        {activeTab === 'short' && (`;

const replaceStr = `            )}
          </>
        )}
        </>
        )}

        {activeTab === 'short' && (`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', content);
console.log("Success");
