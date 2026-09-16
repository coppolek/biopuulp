const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      <main>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">I tuoi Bio Site</h1>
            <p className="text-gray-500 mt-2 font-medium">Gestisci le tue pagine e monitora le analytics.</p>
          </div>`;

const replaceStr = `      <main>
        <div className="flex border-b-2 border-gray-100 mb-8">
          <button 
            onClick={() => setActiveTab('bio')}
            className={\`pb-3 px-4 font-bold text-xs uppercase tracking-widest transition-colors \${activeTab === 'bio' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black'}\`}
          >
            Bio Sites
          </button>
          <button 
            onClick={() => setActiveTab('short')}
            className={\`pb-3 px-4 font-bold text-xs uppercase tracking-widest transition-colors \${activeTab === 'short' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black'}\`}
          >
            Short Links
          </button>
        </div>

        {activeTab === 'bio' && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">I tuoi Bio Site</h1>
                <p className="text-gray-500 mt-2 font-medium">Gestisci le tue pagine e monitora le analytics.</p>
              </div>`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', content);
console.log("Success");
