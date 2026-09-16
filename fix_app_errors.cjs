const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix imports
content = content.replace(
  "import { getUserPages, createNewPage, savePage, getAllPages, deletePage, getAllBanners, saveBanner, deleteBanner } from './lib/db';",
  "import { getUserPages, createNewPage, savePage, getAllPages, deletePage, getAllBanners, saveBanner, deleteBanner, getUserShortLinks, createShortLink, deleteShortLink } from './lib/db';"
);

// Add handlers
const handlers = `  const handleCreateShortLink = async (data: any) => {
    if (!user) return;
    const newLink = await createShortLink(user.uid, data);
    setShortLinks([newLink, ...shortLinks]);
  };

  const handleDeleteShortLink = async (id: string) => {
    await deleteShortLink(id);
    setShortLinks(shortLinks.filter(l => l.id !== id));
  };
`;

if (!content.includes('handleCreateShortLink = async')) {
  content = content.replace("  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);", handlers + "\n  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);");
}

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed App.tsx");
