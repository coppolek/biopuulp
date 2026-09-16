const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

const target = `          </div>
        </div>
      {page.modules && page.modules.filter(m => m.type === 'microblog').length > 0 && (`

const newTarget = `          </div>
        </div>
      </div>
      {page.modules && page.modules.filter(m => m.type === 'microblog').length > 0 && (`

content = content.replace(target, newTarget);
fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Fixed missing div");
