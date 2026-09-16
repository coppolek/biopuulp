const fs = require('fs');
let content = fs.readFileSync('src/components/EditorDashboard.tsx', 'utf8');

const oldHandleDelete = `  const handleDelete = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo post?')) {
      setPage({ ...page, modules: page.modules.filter(m => m.id !== id) });
    }
  };`;

const newHandleDelete = `  const handleDelete = (id: string) => {
    setPage({ ...page, modules: page.modules.filter(m => m.id !== id) });
    toast.success('Post eliminato');
  };`;

content = content.replace(oldHandleDelete, newHandleDelete);
fs.writeFileSync('src/components/EditorDashboard.tsx', content);
console.log("Fixed handleDelete");
