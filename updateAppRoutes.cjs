const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `import { BrowserRouter, Routes, Route } from 'react-router-dom';`;

if (!content.includes('import ShortLinkRedirect from')) {
  content = content.replace("import PublicBioPage from './components/PublicBioPage';", "import PublicBioPage from './components/PublicBioPage';\nimport ShortLinkRedirect from './components/ShortLinkRedirect';");
}

const routesStr = `<Route path="/" element={<AppDashboard />} />
          <Route path="/:slug" element={<PublicView />} />`;
const newRoutesStr = `<Route path="/" element={<AppDashboard />} />
          <Route path="/s/:shortCode" element={<ShortLinkRedirect />} />
          <Route path="/:slug" element={<PublicView />} />`;
content = content.replace(routesStr, newRoutesStr);

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
