const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { getUserPages, createPage, updatePage, deletePage, duplicatePage, getUserShortLinks, createShortLink, deleteShortLink } from './lib/db';",
  "import { getUserPages, createPage, updatePage, deletePage, duplicatePage, getUserShortLinks, createShortLink, deleteShortLink, updateShortLink } from './lib/db';"
);

// 2. handleUpdateShortLink
const createFn = `  const handleCreateShortLink = async (data: any) => {
    if (!user) return;
    const newLink = await createShortLink(user.uid, data);
    setShortLinks([newLink, ...shortLinks]);
  };`;
const updateFn = `  const handleUpdateShortLink = async (id: string, data: any) => {
    if (!user) return;
    await updateShortLink(id, data);
    setShortLinks(shortLinks.map(l => l.id === id ? { ...l, ...data } : l));
  };`;
content = content.replace(createFn, createFn + '\n' + updateFn);

// 3. Pass to DashboardView
content = content.replace(
  "onCreateShortLink={handleCreateShortLink}",
  "onCreateShortLink={handleCreateShortLink}\n          onUpdateShortLink={handleUpdateShortLink}"
);

// 4. DashboardView props
content = content.replace(
  "function DashboardView({ pages, shortLinks = [], onEdit, onViewAnalytics, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick, onCreateShortLink, onDeleteShortLink }: { pages: BioPage[], shortLinks?: any[], onEdit: (page: BioPage) => void, onViewAnalytics?: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void, onCreateShortLink?: (data: any) => void, onDeleteShortLink?: (id: string) => void }) {",
  "function DashboardView({ pages, shortLinks = [], onEdit, onViewAnalytics, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick, onCreateShortLink, onUpdateShortLink, onDeleteShortLink }: { pages: BioPage[], shortLinks?: any[], onEdit: (page: BioPage) => void, onViewAnalytics?: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void, onCreateShortLink?: (data: any) => void, onUpdateShortLink?: (id: string, data: any) => void, onDeleteShortLink?: (id: string) => void }) {"
);

// 5. DashboardView state
const shortStates = `  // Short link form states
  const [isShortModalOpen, setIsShortModalOpen] = useState(false);
  const [shortTargetUrl, setShortTargetUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [shortMonetized, setShortMonetized] = useState(false);`;
const newShortStates = `  // Short link form states
  const [isShortModalOpen, setIsShortModalOpen] = useState(false);
  const [editingShortLink, setEditingShortLink] = useState<string | null>(null);
  const [shortTargetUrl, setShortTargetUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [shortMonetized, setShortMonetized] = useState(false);
  const [shortSeoTitle, setShortSeoTitle] = useState('');
  const [shortSeoDescription, setShortSeoDescription] = useState('');
  const [shortSeoImage, setShortSeoImage] = useState('');

  const openShortLinkModal = (link?: any) => {
    if (link) {
      setEditingShortLink(link.id);
      setShortTitle(link.title || '');
      setShortTargetUrl(link.targetUrl || '');
      setShortCode(link.shortCode || '');
      setShortMonetized(link.monetized || false);
      setShortSeoTitle(link.seo?.title || '');
      setShortSeoDescription(link.seo?.description || '');
      setShortSeoImage(link.seo?.imageUrl || '');
    } else {
      setEditingShortLink(null);
      setShortTitle('');
      setShortTargetUrl('');
      setShortCode('');
      setShortMonetized(false);
      setShortSeoTitle('');
      setShortSeoDescription('');
      setShortSeoImage('');
    }
    setIsShortModalOpen(true);
  };`;
content = content.replace(shortStates, newShortStates);

// 6. Update open modal click handler
content = content.replace(
  "onClick={() => setIsShortModalOpen(true)}",
  "onClick={() => openShortLinkModal()}"
);

// 7. Update short link form submit logic
const submitLogic = `if (shortTargetUrl.trim() && shortCode.trim()) {
                  onCreateShortLink && onCreateShortLink({
                    title: shortTitle.trim(),
                    targetUrl: shortTargetUrl.trim(),
                    shortCode: shortCode.trim(),
                    monetized: shortMonetized
                  });
                  setIsShortModalOpen(false);
                  setShortTitle('');
                  setShortTargetUrl('');
                  setShortCode('');
                  setShortMonetized(false);
                }`;
const newSubmitLogic = `if (shortTargetUrl.trim() && shortCode.trim()) {
                  const data = {
                    title: shortTitle.trim(),
                    targetUrl: shortTargetUrl.trim(),
                    shortCode: shortCode.trim(),
                    monetized: shortMonetized,
                    seo: {
                      title: shortSeoTitle.trim(),
                      description: shortSeoDescription.trim(),
                      imageUrl: shortSeoImage.trim()
                    }
                  };
                  if (editingShortLink) {
                    onUpdateShortLink && onUpdateShortLink(editingShortLink, data);
                  } else {
                    onCreateShortLink && onCreateShortLink(data);
                  }
                  setIsShortModalOpen(false);
                }`;
content = content.replace(submitLogic, newSubmitLogic);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx modal logic");
