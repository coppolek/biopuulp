import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

// Load Firebase configuration for SSR queries
let firebaseConfig: any = null;
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json:", e);
}

// In-memory cache for SSR metadata (15 seconds TTL)
const metadataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15000;

async function getShortLinkData(shortCode: string) {
  if (!firebaseConfig) return null;
  const cacheKey = `short_${shortCode}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: "shortLinks" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "shortCode" },
            op: "EQUAL",
            value: { stringValue: shortCode }
          }
        },
        limit: 1
      }
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data[0]?.document;
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const result = {
      id: doc.name.split("/").pop(),
      title: f.title?.stringValue || "",
      targetUrl: f.targetUrl?.stringValue || "",
      monetized: f.monetized?.booleanValue || false,
      shortCode: f.shortCode?.stringValue || shortCode,
      seo: {
        title: f.seo?.mapValue?.fields?.title?.stringValue || "",
        description: f.seo?.mapValue?.fields?.description?.stringValue || "",
        imageUrl: f.seo?.mapValue?.fields?.imageUrl?.stringValue || ""
      }
    };
    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (e) {
    console.error("Error querying shortlink for SSR:", e);
    return null;
  }
}

async function getBioPageData(slug: string) {
  if (!firebaseConfig) return null;
  const cacheKey = `bio_${slug}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: "pages" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "slug" },
            op: "EQUAL",
            value: { stringValue: slug }
          }
        },
        limit: 1
      }
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data[0]?.document;
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const result = {
      slug: f.slug?.stringValue || slug,
      profile: {
        displayName: f.profile?.mapValue?.fields?.displayName?.stringValue || "",
        bio: f.profile?.mapValue?.fields?.bio?.stringValue || "",
        avatarUrl: f.profile?.mapValue?.fields?.avatarUrl?.stringValue || ""
      },
      seo: {
        title: f.seo?.mapValue?.fields?.title?.stringValue || "",
        description: f.seo?.mapValue?.fields?.description?.stringValue || "",
        imageUrl: f.seo?.mapValue?.fields?.imageUrl?.stringValue || ""
      }
    };
    metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (e) {
    console.error("Error querying bio page for SSR:", e);
    return null;
  }
}

const reservedPaths = new Set([
  "api", "admin", "login", "editor", "analytics", "assets", "favicon.ico", "robots.txt", "ads.txt", "s", "og-default.png"
]);

function isValidSlug(slug: string) {
  if (!slug || reservedPaths.has(slug)) return false;
  if (slug.includes(".") || slug.startsWith("@") || slug.startsWith("_")) return false;
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

function getOrigin(req: express.Request) {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

function injectMetaTags(html: string, meta: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}) {
  const escapeAttr = (str: string) =>
    (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeContent = (str: string) =>
    (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const newTags = `
    <title>${escapeContent(meta.title)}</title>
    <meta name="description" content="${escapeAttr(meta.description)}" />
    
    <!-- OpenGraph Social Tags -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="BioLink Pro" />
    <meta property="og:title" content="${escapeAttr(meta.title)}" />
    <meta property="og:description" content="${escapeAttr(meta.description)}" />
    <meta property="og:image" content="${escapeAttr(meta.imageUrl)}" />
    <meta property="og:image:alt" content="${escapeAttr(meta.title)}" />
    <meta property="og:url" content="${escapeAttr(meta.url)}" />
    
    <!-- Twitter Social Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(meta.title)}" />
    <meta name="twitter:description" content="${escapeAttr(meta.description)}" />
    <meta name="twitter:image" content="${escapeAttr(meta.imageUrl)}" />
  `;

  // Strip placeholder tags if present
  let cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");

  return cleaned.replace("</head>", `${newTags}\n  </head>`);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dedicated Open Graph Image endpoints for Social Networks (Facebook, WhatsApp, Twitter, etc.)
  app.get("/api/og-image/s/:shortCode", async (req, res) => {
    try {
      const link = await getShortLinkData(req.params.shortCode);
      const rawImage = link?.seo?.imageUrl;
      if (rawImage && rawImage.startsWith("data:")) {
        const matches = rawImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
          return res.send(buffer);
        }
      } else if (rawImage && rawImage.startsWith("http")) {
        return res.redirect(rawImage);
      }
      return res.sendFile(path.resolve(process.cwd(), "public", "og-default.png"));
    } catch (e) {
      return res.sendFile(path.resolve(process.cwd(), "public", "og-default.png"));
    }
  });

  app.get("/api/og-image/bio/:slug", async (req, res) => {
    try {
      const page = await getBioPageData(req.params.slug);
      const rawImage = page?.seo?.imageUrl || page?.profile?.avatarUrl;
      if (rawImage && rawImage.startsWith("data:")) {
        const matches = rawImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
          return res.send(buffer);
        }
      } else if (rawImage && rawImage.startsWith("http")) {
        return res.redirect(rawImage);
      }
      return res.sendFile(path.resolve(process.cwd(), "public", "og-default.png"));
    } catch (e) {
      return res.sendFile(path.resolve(process.cwd(), "public", "og-default.png"));
    }
  });
  
  app.get("/api/careerjet", async (req, res) => {
    try {
      const { keywords, location, maxResults = 5, affid: queryAffid, apiKey } = req.query;
      const affid = queryAffid || process.env.CAREERJET_AFFID || "22222222222222222222222222222222";
      const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || "1.1.1.1";
      const userIp = rawIp.split(",")[0].trim();
      const userAgent = (req.headers['user-agent'] as string) || "Mozilla/5.0";

      let data: any = null;
      let fallbackReason: string | null = null;

      // 1. If apiKey is provided, attempt v4 query
      if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
        try {
          const v4Url = `https://api.careerjet.net/v4/query?locale_code=it_IT&keywords=${encodeURIComponent((keywords as string) || "")}&location=${encodeURIComponent((location as string) || "")}&affid=${affid}&user_ip=${encodeURIComponent(userIp)}&user_agent=${encodeURIComponent(userAgent)}`;
          const v4Res = await fetch(v4Url, {
            headers: {
              'Referer': 'https://example.com',
              'Authorization': 'Basic ' + Buffer.from(apiKey.trim() + ":").toString("base64")
            }
          });
          const v4Data = await v4Res.json().catch(() => null);
          if (v4Res.ok && v4Data && Array.isArray(v4Data.jobs) && v4Data.jobs.length > 0) {
            data = v4Data;
          } else {
            fallbackReason = v4Data?.error || `Status ${v4Res.status}`;
            console.warn(`[Careerjet] v4 query failed (${fallbackReason}), seamlessly using public search endpoint.`);
          }
        } catch (v4Err: any) {
          fallbackReason = v4Err?.message || "v4 fetch error";
          console.warn("[Careerjet] v4 query exception, using public search endpoint:", v4Err?.message);
        }
      }

      // 2. Fallback to public search endpoint if v4 was not used or failed
      if (!data) {
        try {
          const publicUrl = `http://public.api.careerjet.net/search?locale_code=it_IT&keywords=${encodeURIComponent((keywords as string) || "")}&location=${encodeURIComponent((location as string) || "")}&affid=${affid}&user_ip=${encodeURIComponent(userIp)}&user_agent=${encodeURIComponent(userAgent)}`;
          const publicRes = await fetch(publicUrl, {
            headers: {
              'Referer': 'https://example.com'
            }
          });
          const publicData = await publicRes.json().catch(() => null);
          if (publicRes.ok && publicData && Array.isArray(publicData.jobs)) {
            data = publicData;
          } else {
            console.warn("[Careerjet] Public search did not return jobs:", publicData?.error || publicRes.statusText);
            data = publicData || { jobs: [] };
          }
        } catch (pubErr: any) {
          console.warn("[Careerjet] Public search exception:", pubErr?.message);
          data = { jobs: [] };
        }
      }

      if (data && Array.isArray(data.jobs)) {
        const limit = parseInt(maxResults as string) || 5;
        data.jobs = data.jobs.slice(0, Math.min(Math.max(limit, 1), 10));
      } else {
        data = { jobs: [] };
      }

      if (fallbackReason) {
        data.notice = `Risultati caricati via API pubblica (v4: ${fallbackReason})`;
      }

      res.json(data);
    } catch (error: any) {
      console.warn("[Careerjet] Gracefully handled error:", error?.message);
      res.json({ jobs: [], error: error?.message || "Failed to fetch jobs" });
    }
  });

  app.post("/api/scrape", async (req, res) => {
    try {
      let { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // YouTube oEmbed
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
          const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            return res.json({
              title: ytData.title || "Video YouTube",
              description: ytData.author_name || "",
              image: ytData.thumbnail_url || "",
            });
          }
        } catch(e) {}
      }

      // Spotify oEmbed
      if (url.includes('spotify.com')) {
        try {
          const spRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
          if (spRes.ok) {
            const spData = await spRes.json();
            return res.json({
              title: spData.title || "Spotify",
              description: "",
              image: spData.thumbnail_url || "",
            });
          }
        } catch(e) {}
      }

      let response;
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
      } catch (e) {
        throw new Error("Network error fetching URL");
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  $('title').text() || 
                  '';
                  
      let description = $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="twitter:description"]').attr('content') || 
                        $('meta[name="description"]').attr('content') || 
                        '';

      let image = $('meta[property="og:image"]').attr('content') || 
                  $('meta[name="twitter:image"]').attr('content') || 
                  $('meta[itemprop="image"]').attr('content') ||
                  $('link[rel="apple-touch-icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="icon"]').attr('href') ||
                  '';

      // Parse structured data (JSON-LD) for better metadata, especially for Amazon
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          if (data) {
            // Can be array of objects or single object
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item.image) {
                if (Array.isArray(item.image)) image = item.image[0];
                else if (typeof item.image === 'string') image = item.image;
                else if (item.image.url) image = item.image.url;
              }
              if (item.name && !title) title = item.name;
              if (item.description && !description) description = item.description;
            }
          }
        } catch (e) {}
      });

      if (!image) {
        // try to find first image with valid src
        $('img').each((i, el) => {
          const src = $(el).attr('src');
          if (src && !src.startsWith('data:')) {
            image = src;
            return false; // break
          }
        });
      }

      // Amazon fallback if blocked or image missing
      if (url.includes('amazon.') && (!image || response.status === 503)) {
        const match = url.match(/(?:dp|o|ASIN|gp\/product)\/([a-zA-Z0-9]{10})/);
        if (match) {
          const asin = match[1];
          // Try to get Amazon thumbnail image using a common pattern
          if (!image) {
             image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
          }
          if (!title || response.status === 503) {
             title = "Prodotto Amazon";
          }
        }
      }

      if (image && !image.startsWith('http')) {
        try {
          const urlObj = new URL(url);
          if (image.startsWith('//')) {
            image = `${urlObj.protocol}${image}`;
          } else if (image.startsWith('/')) {
            image = `${urlObj.protocol}//${urlObj.host}${image}`;
          } else {
            image = `${urlObj.protocol}//${urlObj.host}/${image}`;
          }
        } catch(e) {}
      }

      res.json({
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
      });
    } catch (error: any) {
      console.error('Scraping error:', error);
      res.status(500).json({ error: error.message || "Failed to scrape URL" });
    }
  });

  // Handler for /s/:shortCode with dynamic OpenGraph meta tags
  const handleShortCodeSSR = async (req: express.Request, res: express.Response, next: express.NextFunction, getTemplate: () => Promise<string>) => {
    try {
      const shortCode = req.params.shortCode;
      const link = await getShortLinkData(shortCode);
      if (!link) {
        return next();
      }

      const origin = getOrigin(req);
      const imgUrl = (link.seo?.imageUrl?.startsWith("data:") || !link.seo?.imageUrl)
        ? `${origin}/api/og-image/s/${shortCode}`
        : link.seo.imageUrl;

      const meta = {
        title: link.seo?.title || link.title || "BioLink Pro",
        description: link.seo?.description || "Clicca per aprire il link su BioLink Pro",
        imageUrl: imgUrl,
        url: `${origin}/s/${shortCode}`
      };

      const template = await getTemplate();
      const html = injectMetaTags(template, meta);
      return res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      console.error("ShortLink SSR error:", err);
      next();
    }
  };

  // Handler for /:slug (Bio Page) with dynamic OpenGraph meta tags
  const handleBioPageSSR = async (req: express.Request, res: express.Response, next: express.NextFunction, getTemplate: () => Promise<string>) => {
    try {
      const slug = req.params.slug;
      if (!isValidSlug(slug)) {
        return next();
      }

      const page = await getBioPageData(slug);
      if (!page) {
        return next();
      }

      const origin = getOrigin(req);
      const rawImg = page.seo?.imageUrl || page.profile?.avatarUrl;
      const imgUrl = (rawImg?.startsWith("data:") || !rawImg)
        ? `${origin}/api/og-image/bio/${slug}`
        : rawImg;

      const meta = {
        title: page.seo?.title || page.profile?.displayName || page.slug,
        description: page.seo?.description || page.profile?.bio || "Visita la mia pagina su BioLink Pro",
        imageUrl: imgUrl,
        url: `${origin}/${slug}`
      };

      const template = await getTemplate();
      const html = injectMetaTags(template, meta);
      return res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      console.error("BioPage SSR error:", err);
      next();
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    const getDevTemplate = async (url: string) => {
      const raw = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
      return await vite.transformIndexHtml(url, raw);
    };

    app.get("/s/:shortCode", (req, res, next) => handleShortCodeSSR(req, res, next, () => getDevTemplate(req.originalUrl)));
    app.get("/:slug", (req, res, next) => handleBioPageSSR(req, res, next, () => getDevTemplate(req.originalUrl)));

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    const getProdTemplate = async () => {
      return fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
    };

    app.get("/s/:shortCode", (req, res, next) => handleShortCodeSSR(req, res, next, getProdTemplate));
    app.get("/:slug", (req, res, next) => handleBioPageSSR(req, res, next, getProdTemplate));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
