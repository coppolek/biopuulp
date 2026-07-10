const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

content = content.replace(/'monetization' \| /g, '');
content = content.replace(/\s*<NavItem icon={<DollarSign \/>} label="Monetizzazione".*?\/>\n/g, '\n');
content = content.replace(/\s*\{activeTab === 'monetization' && <MonetizationEditor page=\{page\} setPage=\{setPage\} \/>\}\n/g, '\n');

// Now remove the MonetizationEditor component
const startStr = "function MonetizationEditor({ page, setPage }: { page: BioPage, setPage: (page: BioPage) => void }) {";
const startIdx = content.indexOf(startStr);
if (startIdx !== -1) {
    // Find the end of the component. It should end with a closing brace on a new line right before another component or EOF.
    // Let's find the next function declaration
    const nextFuncStr = "\nfunction MicroblogEditor";
    const endIdx = content.indexOf(nextFuncStr, startIdx);
    if (endIdx !== -1) {
        content = content.substring(0, startIdx) + content.substring(endIdx + 1); // +1 to keep the newline
    } else {
        console.error("Could not find end of MonetizationEditor");
    }
} else {
    console.error("Could not find MonetizationEditor");
}

fs.writeFileSync('src/components/EditorDashboard.tsx', content);
