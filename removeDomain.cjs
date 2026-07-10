const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

const regex = /<div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-8 space-y-6">\s*<div>\s*<h3 className="text-lg font-bold tracking-tight mb-1">Dominio Personalizzato<\/h3>[\s\S]*?<\/div>\s*<\/div>/;

if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync('src/components/EditorDashboard.tsx', content);
    console.log("Success");
} else {
    console.log("Failed to find pattern");
}
