const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

if (!content.includes("import toast from 'react-hot-toast';") && !content.includes("import { toast } from 'react-hot-toast';")) {
  content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { toast } from 'react-hot-toast';");
}

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Added toast import to EditorDashboard.tsx");
