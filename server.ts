import { GoogleGenAI, Type } from "@google/genai";
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
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to avoid burning free tier quota
let firestoreQuotaCircuitBreakerUntil = 0;

async function getShortLinkData(shortCode: string) {
  if (!firebaseConfig) return null;
  const cacheKey = `short_${shortCode}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (Date.now() < firestoreQuotaCircuitBreakerUntil) {
    return cached ? cached.data : null;
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

    if (res.status === 429) {
      firestoreQuotaCircuitBreakerUntil = Date.now() + 30 * 60 * 1000;
      console.warn("[Server] Firestore 429 quota reached. Circuit breaker active for 30m.");
      return cached ? cached.data : null;
    }

    if (!res.ok) return cached ? cached.data : null;
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
    return cached ? cached.data : null;
  }
}

async function getBioPageData(slug: string) {
  if (!firebaseConfig) return null;
  const cacheKey = `bio_${slug}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (Date.now() < firestoreQuotaCircuitBreakerUntil) {
    return cached ? cached.data : null;
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

    if (res.status === 429) {
      firestoreQuotaCircuitBreakerUntil = Date.now() + 30 * 60 * 1000;
      console.warn("[Server] Firestore 429 quota reached. Circuit breaker active for 30m.");
      return cached ? cached.data : null;
    }

    if (!res.ok) return cached ? cached.data : null;
    const data = await res.json();
    const doc = data[0]?.document;
    if (!doc || !doc.fields) return null;
    const f = doc.fields;
    const result = {
      slug: f.slug?.stringValue || slug,
      profile: {
        displayName: f.profile?.mapValue?.fields?.displayName?.stringValue || f.profile?.mapValue?.fields?.name?.stringValue || "",
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
    return cached ? cached.data : null;
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

      // 1. If apiKey is provided, attempt v4 query on search.api.careerjet.net
      if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
        try {
          const v4Url = `https://search.api.careerjet.net/v4/query?locale_code=it_IT&keywords=${encodeURIComponent((keywords as string) || "")}&location=${encodeURIComponent((location as string) || "")}&affid=${affid}&user_ip=${encodeURIComponent(userIp)}&user_agent=${encodeURIComponent(userAgent)}`;
          const v4Res = await fetch(v4Url, {
            headers: {
              "Referer": "https://example.com",
              "Authorization": "Basic " + Buffer.from(apiKey.trim() + ":").toString("base64")
            }
          });
          const v4Data = await v4Res.json().catch(() => null);
          if (v4Res.ok && v4Data && Array.isArray(v4Data.jobs) && v4Data.jobs.length > 0) {
            data = v4Data;
          } else {
            const errObj = v4Data?.error;
            fallbackReason = typeof errObj === "object" && errObj !== null 
              ? (errObj.message || JSON.stringify(errObj))
              : (typeof errObj === "string" ? errObj : `Status ${v4Res.status}`);
          }
        } catch (v4Err: any) {
          fallbackReason = v4Err?.message || "v4 fetch error";
        }
      }

      // 2. Fallback to public search endpoint if v4 was not used or failed
      if (!data) {
        try {
          const publicUrl = `http://public.api.careerjet.net/search?locale_code=it_IT&keywords=${encodeURIComponent((keywords as string) || "")}&location=${encodeURIComponent((location as string) || "")}&affid=${affid}&user_ip=${encodeURIComponent(userIp)}&user_agent=${encodeURIComponent(userAgent)}`;
          const publicRes = await fetch(publicUrl, {
            headers: {
              "Referer": "https://example.com"
            }
          });
          const publicData = await publicRes.json().catch(() => null);
          if (publicRes.ok && publicData && Array.isArray(publicData.jobs)) {
            data = publicData;
          } else {
            data = publicData || { jobs: [] };
          }
        } catch (pubErr: any) {
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
      res.json({ jobs: [], error: error?.message || "Failed to fetch jobs" });
    }
  });

  
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function rewriteArticleWithGemini({
  rawTitle,
  rawContent,
  sourceUrl,
  siteName,
  author,
  style = "editorial"
}: {
  rawTitle: string;
  rawContent: string;
  sourceUrl: string;
  siteName?: string;
  author?: string;
  style?: string;
}) {
  let styleInstruction = "";
  if (style === "storytelling") {
    styleInstruction = "Tono narrativo, coinvolgente, personale, stile creator moderno, con un forte hook emotivo e aneddoti stimolanti.";
  } else if (style === "summary") {
    styleInstruction = "Tono sintetico, chiaro, diretto ai punti essenziali, con analisi rapida dei punti chiave (TL;DR) e bullet points.";
  } else {
    styleInstruction = "Tono editoriale di altissimo livello, autorevole, scorrevole, analitico e affascinante, ideale per una rivista moderna o newsletter di successo.";
  }

  const prompt = `Sei un esperto saggista, giornalista e content creator per la piattaforma BioLink Pro.
Il tuo compito fondamentale è trasformare ed elaborare il seguente articolo importato dal web in un testo COMPLETAMENTE UNICO, ORIGINALE AL 100%, accattivante, ricco di valore e impeccabile in lingua ITALIANA.

Linee guida indispensabili:
1. NON copiare o tradurre mai le frasi alla lettera: rielabora totalmente i concetti, aggiungi prospettiva e adotta una voce originale e accattivante.
2. ${styleInstruction}
3. Utilizza una ricca e raffinata formattazione Markdown:
   - Crea un titolo nuovo, unico, magnetico ed elegante (evita clickbait scadenti).
   - Introduzione d'impatto (hook) che cattura subito il lettore.
   - Sviluppa il corpo dell'articolo scandito da sottotitoli Markdown (## e ###).
   - Inserisci punti elenco o numerati dove opportuno per facilitare la lettura visiva.
   - Inserisci almeno una citazione o riflessione profonda formattata come blockquote Markdown (> Citazione o riflessione chiave).
   - Conclusione stimolante con take-away o domanda aperta per la community.
   - In fondo al testo, mantieni sempre la trasparenza indicando: "*Fonte ispiratrice: [${siteName || "Articolo Originale"}](${sourceUrl})*".
4. Fornisci un estratto breve e i metadati SEO (titolo max 60 car, descrizione max 155 car).

ARTICOLO DA ELABORARE:
Titolo originale: ${rawTitle || "Senza titolo"}
${siteName ? `Fonte originale: ${siteName}` : ""}
${author ? `Autore: ${author}` : ""}
Link originale: ${sourceUrl}

Testo originale:
${rawContent.slice(0, 10000)}
`;

  const models = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
  let lastErr = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Nuovo titolo originale e accattivante in italiano per l'articolo",
              },
              content: {
                type: Type.STRING,
                description: "Testo completo dell'articolo rielaborato e formattato in Markdown (con sezioni ##, citazioni > e link fonte)",
              },
              excerpt: {
                type: Type.STRING,
                description: "Breve estratto riassuntivo del pezzo (2-3 frasi)",
              },
              seoTitle: {
                type: Type.STRING,
                description: "Titolo SEO ottimizzato (massimo 60 caratteri)",
              },
              seoDescription: {
                type: Type.STRING,
                description: "Descrizione SEO (massimo 155 caratteri)",
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 punti chiave dell'articolo rielaborato",
              },
            },
            required: ["title", "content", "excerpt", "seoTitle", "seoDescription"],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return parsed;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Gemini rewrite failed with model ${model}:`, (err as any)?.message);
      continue;
    }
  }

  throw lastErr || new Error("Tutti i modelli Gemini non sono al momento disponibili.");
}



  // Endpoint to rewrite & make any article draft unique with Gemini
  app.post("/api/ai/rewrite", async (req, res) => {
    try {
      const { title, content, sourceUrl = "", siteName = "", style = "editorial" } = req.body;
      if (!title && !content) {
        return res.status(400).json({ error: "Titolo o contenuto obbligatori" });
      }

      const aiResult = await rewriteArticleWithGemini({
        rawTitle: title || "",
        rawContent: content || "",
        sourceUrl,
        siteName,
        style
      });

      res.json({
        ...aiResult,
        isAiElaborated: true
      });
    } catch (error: any) {
      console.error("API AI Rewrite error:", error);
      res.status(500).json({ error: error?.message || "Impossibile elaborare l'articolo con Gemini" });
    }
  });


  app.post("/api/scrape", async (req, res) => {
    try {
      let { url, elaborateWithGemini = false, style = "editorial" } = req.body;
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

      let siteName = $('meta[property="og:site_name"]').attr('content') || '';
      if (!siteName) {
        try {
          siteName = new URL(url).hostname.replace(/^www\./, '');
        } catch(e) {}
      }

      let author = $('meta[name="author"]').attr('content') ||
                   $('meta[property="article:author"]').attr('content') ||
                   $('meta[name="twitter:creator"]').attr('content') ||
                   $('[rel="author"]').first().text() ||
                   $('.author').first().text() ||
                   '';

      let articleText = '';
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item.articleBody && !articleText) {
              articleText = item.articleBody;
            }
            if (item.author && !author) {
              if (typeof item.author === 'string') author = item.author;
              else if (item.author.name) author = item.author.name;
            }
            if (item.publisher?.name && !siteName) {
              siteName = item.publisher.name;
            }
          }
        } catch(e) {}
      });

      if (!articleText) {
        const clone$ = cheerio.load(html);
        clone$('script, style, nav, header, footer, noscript, aside, form, svg, iframe, .ads, .comment, .cookie').remove();
        
        const paragraphs = [];
        clone$('article p, main p, .article-body p, .article-content p, .post-content p, .entry-content p, p').each((_, el) => {
          const pText = clone$(el).text().trim();
          if (pText.length > 50 && !pText.toLowerCase().includes('cookie') && !pText.toLowerCase().includes('privacy policy')) {
            paragraphs.push(pText);
          }
        });

        if (paragraphs.length > 0) {
          articleText = paragraphs.slice(0, 5).join('\n\n');
        } else if (description) {
          articleText = description;
        }
      }

      let markdownContent = articleText ? articleText.trim() : (description || title);
      const sourceCredit = siteName ? `\n\n---\n*Fonte: [${siteName}](${url})*` : `\n\n---\n*Fonte: [Leggi l\'articolo originale](${url})*`;
      if (!markdownContent.includes(url)) {
        markdownContent += sourceCredit;
      }

      // Elaborate and make article unique with Gemini if requested
      if (elaborateWithGemini && (articleText || description || title)) {
        try {
          const aiResult = await rewriteArticleWithGemini({
            rawTitle: title,
            rawContent: articleText || description,
            sourceUrl: url,
            siteName,
            author,
            style
          });

          return res.json({
            title: aiResult.title || title.trim(),
            description: aiResult.seoDescription || description.trim(),
            image: image.trim(),
            content: aiResult.content,
            excerpt: aiResult.excerpt,
            seoTitle: aiResult.seoTitle,
            seoDescription: aiResult.seoDescription,
            keyTakeaways: aiResult.keyTakeaways || [],
            author: author.trim(),
            siteName: siteName.trim(),
            url,
            isAiElaborated: true
          });
        } catch (aiErr) {
          console.error("Gemini elaboration error during scrape:", aiErr);
          // Fallback to raw scraped content if Gemini encounters transient error
        }
      }

      res.json({
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
        content: markdownContent.trim(),
        author: author.trim(),
        siteName: siteName.trim(),
        url,
        isAiElaborated: false
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
