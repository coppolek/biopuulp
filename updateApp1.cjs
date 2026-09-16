const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importStr = `import { getUserPages, createNewPage, savePage, duplicatePage } from './lib/db';`;
const newImportStr = `import { getUserPages, createNewPage, savePage, duplicatePage, getUserShortLinks, createShortLink, deleteShortLink } from './lib/db';`;
content = content.replace(importStr, newImportStr);

const stateStr = `  const [pages, setPages] = useState<BioPage[]>([]);`;
const newStateStr = `  const [pages, setPages] = useState<BioPage[]>([]);
  const [shortLinks, setShortLinks] = useState<any[]>([]);`;
content = content.replace(stateStr, newStateStr);

const fetchStr = `        const userPages = await getUserPages(user.uid);
        setPages(userPages);`;
const newFetchStr = `        const userPages = await getUserPages(user.uid);
        setPages(userPages);
        const userShortLinks = await getUserShortLinks(user.uid);
        setShortLinks(userShortLinks);`;
content = content.replace(fetchStr, newFetchStr);

const elseFetchStr = `      } else {
        setPages([]);
      }`;
const newElseFetchStr = `      } else {
        setPages([]);
        setShortLinks([]);
      }`;
content = content.replace(elseFetchStr, newElseFetchStr);

const createShortLinkStr = `  const handleDuplicatePage = async (page: BioPage, newSlug: string) => {
    if (!user) return;
    const newPage = await duplicatePage(user.uid, page, newSlug);
    setPages([...pages, newPage]);
  };`;

const newCreateShortLinkStr = `  const handleDuplicatePage = async (page: BioPage, newSlug: string) => {
    if (!user) return;
    const newPage = await duplicatePage(user.uid, page, newSlug);
    setPages([...pages, newPage]);
  };

  const handleCreateShortLink = async (data: any) => {
    if (!user) return;
    const newLink = await createShortLink(user.uid, data);
    setShortLinks([newLink, ...shortLinks]);
  };

  const handleDeleteShortLink = async (id: string) => {
    await deleteShortLink(id);
    setShortLinks(shortLinks.filter(l => l.id !== id));
  };`;
content = content.replace(createShortLinkStr, newCreateShortLinkStr);

const dashboardViewStr = `        <DashboardView 
          pages={pages}
          onEdit={handleEditPage} 
          onCreate={handleCreatePage}
          onSignOut={() => auth.signOut()}
          onDuplicate={handleDuplicatePage}
          isAdmin={user.email === 'coppolek@gmail.com'}
          onAdminClick={() => setView('admin')}
        />`;

const newDashboardViewStr = `        <DashboardView 
          pages={pages}
          shortLinks={shortLinks}
          onEdit={handleEditPage} 
          onCreate={handleCreatePage}
          onSignOut={() => auth.signOut()}
          onDuplicate={handleDuplicatePage}
          onCreateShortLink={handleCreateShortLink}
          onDeleteShortLink={handleDeleteShortLink}
          isAdmin={user.email === 'coppolek@gmail.com'}
          onAdminClick={() => setView('admin')}
        />`;
content = content.replace(dashboardViewStr, newDashboardViewStr);

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
