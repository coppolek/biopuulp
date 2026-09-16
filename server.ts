import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

    app.get("/api/careerjet", async (req, res) => {
    try {
      const { keywords, location, maxResults = 5, affid: queryAffid, apiKey } = req.query;
      const affid = queryAffid || process.env.CAREERJET_AFFID || "22222222222222222222222222222222";
      const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "1.1.1.1";
      const userAgent = req.headers['user-agent'] || "Mozilla/5.0";
      
      let url = `http://public.api.careerjet.net/search?locale_code=it_IT&keywords=${encodeURIComponent(keywords || '')}&location=${encodeURIComponent(location || '')}&affid=${affid}&user_ip=${userIp}&user_agent=${encodeURIComponent(userAgent)}`;
      let headers = {
        'Referer': 'https://example.com'
      };

      if (apiKey) {
        url = `https://search.api.careerjet.net/v4/query?locale_code=it_IT&keywords=${encodeURIComponent(keywords || '')}&location=${encodeURIComponent(location || '')}&affid=${affid}&user_ip=${userIp}&user_agent=${encodeURIComponent(userAgent)}`;
        headers['Authorization'] = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');
      }
      
      const response = await fetch(url, { headers });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Careerjet API Error: ${data.error || response.statusText}`);
      }
      
      if (data.jobs) {
        // limit results
        data.jobs = data.jobs.slice(0, parseInt(maxResults));
      }
      
      res.json(data);
    } catch (error) {
      console.error('Careerjet API error:', error);
      res.status(500).json({ error: error.message || "Failed to fetch jobs" });
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
