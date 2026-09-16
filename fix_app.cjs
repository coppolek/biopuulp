const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Import AnalyticsDashboard
content = content.replace(
  "import EditorDashboard from './components/EditorDashboard';",
  "import EditorDashboard from './components/EditorDashboard';\nimport AnalyticsDashboard from './components/AnalyticsDashboard';"
);

// Add 'analytics' to view state types
content = content.replace(
  "const [view, setView] = useState<'dashboard' | 'editor' | 'admin'>('dashboard');",
  "const [view, setView] = useState<'dashboard' | 'editor' | 'admin' | 'analytics'>('dashboard');"
);

// Add handleViewAnalytics
const viewAnalyticsFn = `  const handleViewAnalytics = (page: BioPage) => {
    setCurrentPage(page);
    setView('analytics');
  };

  const handleEditPage`;

content = content.replace("  const handleEditPage", viewAnalyticsFn);

// Add view logic
const appRender = `      {view === 'admin' ? (
        <AdminView onBack={() => setView('dashboard')} />
      ) : view === 'analytics' && currentPage ? (
        <AnalyticsDashboard page={currentPage} onBack={() => setView('dashboard')} />
      ) : view === 'dashboard' ? (`;

content = content.replace(`      {view === 'admin' ? (
        <AdminView onBack={() => setView('dashboard')} />
      ) : view === 'dashboard' ? (`, appRender);

// Update DashboardView props
content = content.replace(
  "function DashboardView({ pages, shortLinks = [], onEdit, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick, onCreateShortLink, onDeleteShortLink }: { pages: BioPage[], shortLinks?: any[], onEdit: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void, onCreateShortLink?: (data: any) => void, onDeleteShortLink?: (id: string) => void }) {",
  "function DashboardView({ pages, shortLinks = [], onEdit, onViewAnalytics, onCreate, onDuplicate, onSignOut, isAdmin, onAdminClick, onCreateShortLink, onDeleteShortLink }: { pages: BioPage[], shortLinks?: any[], onEdit: (page: BioPage) => void, onViewAnalytics?: (page: BioPage) => void, onCreate: (slug: string) => void, onDuplicate: (page: BioPage, newSlug: string) => void, onSignOut: () => void, isAdmin?: boolean, onAdminClick?: () => void, onCreateShortLink?: (data: any) => void, onDeleteShortLink?: (id: string) => void }) {"
);

// Pass to DashboardView
content = content.replace(
  "          onEdit={handleEditPage} ",
  "          onEdit={handleEditPage} \n          onViewAnalytics={handleViewAnalytics}"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx view logic");
