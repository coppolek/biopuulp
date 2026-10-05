import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import { 
  unifiedDb as mysqlDb, 
  getFullDatabaseStatus, 
  setActiveEngine, 
  getActiveEngine, 
  initActiveDatabase, 
  syncDataToOracle 
} from "./server/databaseHub.ts";
import { 
  testConnection as testMySQLConnection, 
  updateDatabaseConfig as updateMySQLConfig, 
  exportDatabaseBackup, 
  generateSqlDump, 
  importDatabaseBackup 
} from "./server/mysql.ts";
import { 
  testOracleConnection, 
  updateOracleConfig, 
  extractWalletZip 
} from "./server/oracle.ts";

async function getShortLinkData(shortCode: string) {
  try {
    const link = await mysqlDb.getShortLinkByCode(shortCode);
    if (!link) return null;
    return {
      id: link.id,
      title: link.title || "",
      targetUrl: link.targetUrl || link.originalUrl || "",
      monetized: link.monetized || false,
      shortCode: link.shortCode || shortCode,
      seo: {
        title: link.seo?.title || link.title || "BioLink Pro",
        description: link.seo?.description || link.description || "Clicca per aprire il link su BioLink Pro",
        imageUrl: link.seo?.imageUrl || link.image || ""
      }
    };
  } catch (e) {
    return null;
  }
}

async function getBioPageData(slug: string) {
  try {
    const page = await mysqlDb.getPageBySlug(slug);
    if (!page) return null;
    return {
      slug: page.slug || slug,
      profile: {
        displayName: page.profile?.displayName || page.profile?.name || `@${slug}`,
        bio: page.profile?.bio || "",
        avatarUrl: page.profile?.avatarUrl || ""
      },
      seo: {
        title: page.seo?.title || page.profile?.displayName || page.profile?.name || `@${slug}`,
        description: page.seo?.description || page.profile?.bio || "Visita la mia pagina su BioLink Pro",
        imageUrl: page.seo?.imageUrl || page.profile?.avatarUrl || ""
      }
    };
  } catch (e) {
    return null;
  }
}

function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  // Ignore static assets, api routes, or files with extensions
  if (slug.startsWith("api") || slug.startsWith("s/") || slug.includes(".") || slug === "favicon.ico") {
    return false;
  }
  return true;
}

function getOrigin(req: express.Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function injectMetaTags(html: string, meta: { title: string; description: string; imageUrl?: string; url: string }): string {
  const escapedTitle = escapeHtml(meta.title);
  const escapedDesc = escapeHtml(meta.description);
  const escapedUrl = escapeHtml(meta.url);
  const escapedImage = meta.imageUrl ? escapeHtml(meta.imageUrl) : "";

  const newTags = `
    <!-- Dynamic Server-Side Injected OpenGraph & Twitter Meta Tags -->
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDesc}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDesc}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:type" content="website" />
    ${escapedImage ? `<meta property="og:image" content="${escapedImage}" />` : ""}
    ${escapedImage ? `<meta property="og:image:alt" content="${escapedTitle}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDesc}" />
    ${escapedImage ? `<meta name="twitter:image" content="${escapedImage}" />` : ""}
  `;

  let cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");

  return cleaned.replace("</head>", `${newTags}\n  </head>`);
}

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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Active Database Connection & Schema (Oracle or MySQL)
  initActiveDatabase().catch(err => {
    console.warn("[DB Hub] Async initialization note:", err);
  });

  // API health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", activeEngine: getActiveEngine() });
  });

  // --- Database Admin & Management Endpoints ---
  app.get("/api/admin/db/status", async (req, res) => {
    try {
      res.json(await getFullDatabaseStatus());
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/admin/db/engine", async (req, res) => {
    try {
      const { engine } = req.body;
      if (engine !== 'oracle' && engine !== 'mysql') {
        return res.status(400).json({ error: "Motore non valido (supportati: oracle, mysql)" });
      }
      setActiveEngine(engine);
      await initActiveDatabase();
      const status = await getFullDatabaseStatus();
      res.json({ success: true, activeEngine: engine, status });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // MySQL routes
  app.post("/api/admin/db/test", async (req, res) => {
    try {
      const result = await testMySQLConnection(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, message: e?.message });
    }
  });

  app.post("/api/admin/db/config", async (req, res) => {
    try {
      const result = await updateMySQLConfig(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message });
    }
  });

  // Oracle routes
  app.post("/api/admin/db/oracle/test", async (req, res) => {
    try {
      const result = await testOracleConnection(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, message: e?.message });
    }
  });

  app.post("/api/admin/db/oracle/config", async (req, res) => {
    try {
      const result = await updateOracleConfig(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message });
    }
  });

  app.post("/api/admin/db/oracle/wallet", async (req, res) => {
    try {
      const { zipBase64, walletPassword } = req.body;
      if (!zipBase64) {
        return res.status(400).json({ error: "File zip mancante" });
      }
      const buffer = Buffer.from(zipBase64.replace(/^data:application\/[^;]+;base64,/, ''), 'base64');
      const result = await extractWalletZip(buffer, walletPassword);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message });
    }
  });

  app.post("/api/admin/db/oracle/sync", async (req, res) => {
    try {
      const result = await syncDataToOracle();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message });
    }
  });

  app.get("/api/admin/db/backup", async (req, res) => {
    try {
      const format = req.query.format === 'sql' ? 'sql' : 'json';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (format === 'sql') {
        const sql = await generateSqlDump();
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="biolink_backup_${timestamp}.sql"`);
        return res.send(sql);
      } else {
        const backup = await exportDatabaseBackup();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="biolink_backup_${timestamp}.json"`);
        return res.send(JSON.stringify(backup, null, 2));
      }
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore durante la generazione del backup" });
    }
  });

  app.post("/api/admin/db/import", async (req, res) => {
    try {
      const { data, mode = 'merge' } = req.body;
      if (!data) {
        return res.status(400).json({ error: "Dati di backup mancanti" });
      }
      const result = await importDatabaseBackup(data, mode);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore durante l'importazione" });
    }
  });

  // --- MySQL Authentication & Users ---
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) return res.status(400).json({ error: "Email richiesta" });
      const existing = await mysqlDb.findUserByEmail(email);
      if (existing) {
        return res.json({ user: { uid: existing.id, email: existing.email } });
      }
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email,
        password_hash: password || 'default_hash'
      };
      await mysqlDb.createUser(newUser);
      res.json({ user: { uid: newUser.id, email: newUser.email } });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore durante la registrazione" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) return res.status(400).json({ error: "Email richiesta" });
      let user = await mysqlDb.findUserByEmail(email);
      if (!user) {
        user = {
          id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          email,
          password_hash: password || 'default_hash'
        };
        await mysqlDb.createUser(user);
      }
      res.json({ user: { uid: user.id, email: user.email } });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore durante l'accesso" });
    }
  });

  // --- MySQL Pages CRUD ---
  app.get("/api/pages", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.json([]);
      const pages = await mysqlDb.getUserPages(userId);
      res.json(pages);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore lettura pagine" });
    }
  });

  app.get("/api/pages/all", async (req, res) => {
    try {
      const pages = await mysqlDb.getAllPages();
      res.json(pages);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore lettura pagine" });
    }
  });

  app.get("/api/pages/by-slug/:slug", async (req, res) => {
    try {
      const page = await mysqlDb.getPageBySlug(req.params.slug);
      if (!page) return res.status(404).json({ error: "Pagina non trovata" });
      res.json(page);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore lettura pagina" });
    }
  });

  app.post("/api/pages", async (req, res) => {
    try {
      await mysqlDb.savePage(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore salvataggio pagina" });
    }
  });

  app.delete("/api/pages/:id", async (req, res) => {
    try {
      await mysqlDb.deletePage(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Errore eliminazione pagina" });
    }
  });

  // --- MySQL Analytics ---
  app.get("/api/analytics/:pageId", async (req, res) => {
    try {
      const data = await mysqlDb.getPageAnalytics(req.params.pageId);
      res.json(data || {});
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/analytics/:pageId", async (req, res) => {
    try {
      await mysqlDb.savePageAnalytics(req.params.pageId, req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/analytics/:pageId/view", async (req, res) => {
    try {
      await mysqlDb.incrementPageView(req.params.pageId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/analytics/:pageId/click", async (req, res) => {
    try {
      const { linkId } = req.body;
      const analytics = (await mysqlDb.getPageAnalytics(req.params.pageId)) || { pageId: req.params.pageId, dailyStats: [] };
      const today = new Date().toISOString().split('T')[0];
      if (!analytics.dailyStats) analytics.dailyStats = [];
      const stat = analytics.dailyStats.find((s: any) => s.date === today);
      if (stat) {
        stat.clicks = (stat.clicks || 0) + 1;
      } else {
        analytics.dailyStats.push({ date: today, views: 0, clicks: 1 });
      }
      await mysqlDb.savePageAnalytics(req.params.pageId, analytics);

      const all = await mysqlDb.getAllPages();
      const page = all.find((p: any) => p.id === req.params.pageId || p.slug === req.params.pageId);
      if (page && page.links) {
        const link = page.links.find((l: any) => l.id === linkId);
        if (link) {
          link.clicks = (link.clicks || 0) + 1;
          await mysqlDb.savePage(page);
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // --- MySQL Subscribers ---
  app.get("/api/subscribers", async (req, res) => {
    try {
      const pageId = req.query.pageId as string;
      const subs = await mysqlDb.getPageSubscribers(pageId);
      res.json(subs);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/subscribers", async (req, res) => {
    try {
      const { pageId, email } = req.body;
      const sub = {
        id: `sub_${Date.now()}`,
        pageId,
        email,
        subscribedAt: new Date().toISOString()
      };
      await mysqlDb.addSubscriber(sub);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // --- MySQL Short Links ---
  app.get("/api/short-links", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const links = await mysqlDb.getUserShortLinks(userId);
      res.json(links);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/short-links", async (req, res) => {
    try {
      const id = `link_${Date.now()}`;
      const link = { id, ...req.body, clicks: 0, createdAt: new Date().toISOString() };
      await mysqlDb.saveShortLink(link);
      res.json(link);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.put("/api/short-links/:id", async (req, res) => {
    try {
      await mysqlDb.saveShortLink({ id: req.params.id, ...req.body });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.delete("/api/short-links/:id", async (req, res) => {
    try {
      await mysqlDb.deleteShortLink(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.get("/api/short-links/by-code/:code", async (req, res) => {
    try {
      const link = await mysqlDb.getShortLinkByCode(req.params.code);
      if (!link) return res.status(404).json({ error: "Link non trovato" });
      res.json(link);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/short-links/:id/click", async (req, res) => {
    try {
      await mysqlDb.incrementShortLinkClick(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // --- MySQL Banners ---
  app.get("/api/banners", async (req, res) => {
    try {
      const banners = await mysqlDb.getAllBanners();
      res.json(banners);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.post("/api/banners", async (req, res) => {
    try {
      await mysqlDb.saveBanner(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.delete("/api/banners/:id", async (req, res) => {
    try {
      await mysqlDb.deleteBanner(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
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

      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          if (data) {
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
        $('img').each((i, el) => {
          const src = $(el).attr('src');
          if (src && !src.startsWith('data:')) {
            image = src;
            return false;
          }
        });
      }

      if (url.includes('amazon.') && (!image || response.status === 503)) {
        const match = url.match(/(?:dp|o|ASIN|gp\/product)\/([a-zA-Z0-9]{10})/);
        if (match) {
          const asin = match[1];
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
