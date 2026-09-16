const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');
content = content.replace("React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })", "React.cloneElement(icon as any, { className: 'w-4 h-4' })");
fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Fixed cloneElement");
