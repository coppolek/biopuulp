const fs = require('fs');
let content = fs.readFileSync('src/components/PublicBioPage.tsx', 'utf8');

const target = `                        {module.videoUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <video src={module.videoUrl} controls className="w-full h-auto object-cover" />
                          </div>
                        )}`;
const newTarget = `                        {module.videoUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <video src={module.videoUrl} controls className="w-full h-auto object-cover" />
                          </div>
                        )}
                        {module.embedCode && (
                          <div className="mt-3 rounded-lg overflow-hidden w-full" dangerouslySetInnerHTML={{ __html: module.embedCode }} />
                        )}`;

content = content.replace(target, newTarget);
fs.writeFileSync('src/components/PublicBioPage.tsx', content);
console.log("Updated PublicBioPage");
