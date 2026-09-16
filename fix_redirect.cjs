const fs = require('fs');
let content = fs.readFileSync('src/components/ShortLinkRedirect.tsx', 'utf8');

content = content.replace(
  "import { useParams } from 'react-router-dom';",
  "import { useParams } from 'react-router-dom';\nimport { Helmet } from 'react-helmet-async';"
);

const returnTarget = "return (\n    <div className=\"min-h-screen flex flex-col bg-gray-50\">";

const newReturn = `return (
    <>
      {linkData?.seo && (
        <Helmet>
          {linkData.seo.title && <title>{linkData.seo.title}</title>}
          {linkData.seo.title && <meta property="og:title" content={linkData.seo.title} />}
          {linkData.seo.title && <meta name="twitter:title" content={linkData.seo.title} />}
          
          {linkData.seo.description && <meta name="description" content={linkData.seo.description} />}
          {linkData.seo.description && <meta property="og:description" content={linkData.seo.description} />}
          {linkData.seo.description && <meta name="twitter:description" content={linkData.seo.description} />}
          
          {linkData.seo.imageUrl && <meta property="og:image" content={linkData.seo.imageUrl} />}
          {linkData.seo.imageUrl && <meta name="twitter:image" content={linkData.seo.imageUrl} />}
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
      )}
      <div className="min-h-screen flex flex-col bg-gray-50">`;

content = content.replace(returnTarget, newReturn);
content = content.replace("    </div>\n  );\n}", "    </div>\n    </>\n  );\n}");

fs.writeFileSync('src/components/ShortLinkRedirect.tsx', content);
console.log("Updated ShortLinkRedirect");
