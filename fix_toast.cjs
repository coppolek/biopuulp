const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

if (!content.includes("import toast from 'react-hot-toast';") && !content.includes("import { toast } from 'react-hot-toast';")) {
  content = content.replace("import { Video, Code, Trash2 } from 'lucide-react';", "import { Video, Code, Trash2 } from 'lucide-react';\nimport { toast } from 'react-hot-toast';");
}

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
