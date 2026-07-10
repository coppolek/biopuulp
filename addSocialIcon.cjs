const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const insertPos = content.indexOf('export default function App() {');

const socialIconStr = `
const SocialIcon = ({ platform, className }: { platform: string, className?: string }) => {
  switch (platform) {
    case 'instagram': return <Instagram className={className} />;
    case 'twitter': return <Twitter className={className} />;
    case 'youtube': return <Youtube className={className} />;
    case 'linkedin': return <Linkedin className={className} />;
    case 'github': return <Github className={className} />;
    case 'facebook': return <Facebook className={className} />;
    case 'tiktok': return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>;
    default: return <ExternalLink className={className} />;
  }
};

`;

fs.writeFileSync('src/App.tsx', content.substring(0, insertPos) + socialIconStr + content.substring(insertPos));
