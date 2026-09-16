const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `function DashboardView({ pages, onEdit, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick }: { pages: BioPage[], onEdit: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<BioPage | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');`;

const replaceStr = `function DashboardView({ pages, shortLinks = [], onEdit, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick, onCreateShortLink, onDeleteShortLink }: { pages: BioPage[], shortLinks?: any[], onEdit: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void, onCreateShortLink?: (data: any) => void, onDeleteShortLink?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'bio' | 'short'>('bio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<BioPage | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Short link form states
  const [isShortModalOpen, setIsShortModalOpen] = useState(false);
  const [shortTargetUrl, setShortTargetUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [shortMonetized, setShortMonetized] = useState(false);`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
