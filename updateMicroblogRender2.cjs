const fs = require('fs');
let content = fs.readFileSync('src/components/PublicBioPage.tsx', 'utf8');

const targetStr = `                        {module.imageUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <img src={module.imageUrl} alt="" className="w-full h-auto object-cover" />
                          </div>
                        )}
                      </div>
                    )}`;

const replaceStr = `                        {module.imageUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <img src={module.imageUrl} alt="" className="w-full h-auto object-cover" />
                          </div>
                        )}
                        {module.videoUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100/10">
                            <video src={module.videoUrl} controls className="w-full h-auto object-cover" />
                          </div>
                        )}
                      </div>
                    )}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/PublicBioPage.tsx', content);
  console.log("Success");
} else {
  console.log("Not found");
}
