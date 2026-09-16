const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

content = content.replace(
  "import { Video, Code } from 'lucide-react';",
  "import { Video, Code, Trash2 } from 'lucide-react';"
);

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Added Trash2 import");
