import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import healthRouter from "./health";
import toolsRouter from "./tools";
import adminRouter from "./admin";
import blogsRouter from "./blogs";
import commentsRouter from "./comments";
import { db } from "@workspace/db";
import { toolsTable, siteSettingsTable, contactsTable, clipboardsTable, blogsTable, articlesTable } from "@workspace/db";

const router: IRouter = Router();

router.use(healthRouter);
router.use(toolsRouter);
router.use(adminRouter);
router.use(blogsRouter);
router.use(commentsRouter);

// GET /public-settings
router.get("/public-settings", async (req, res) => {
  const PUBLIC_KEYS = [
    "adsense_enabled", "adsense_client",
    "adsense_slot_leaderboard", "adsense_slot_rectangle", "adsense_slot_responsive",
    "site_title", "site_description", "maintenance_mode", "maintenance_message",
    "hidden_pages", "footer_copyright", "title_animation", "website_animations",
    "analytics_code", "email_contact", "email_privacy", "email_legal",
  ];
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (PUBLIC_KEYS.includes(row.key)) map[row.key] = row.value;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(map);
  } catch {
    res.json({});
  }
});

// POST /visit
router.post("/visit", async (req, res) => {
  try {
    const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "total_visitors")).limit(1);
    const current = parseInt(existing?.value ?? "0", 10);
    const newCount = current + 1;
    await db.insert(siteSettingsTable).values({ key: "total_visitors", value: String(newCount) })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: String(newCount), updatedAt: new Date() } });
    res.json({ success: true, totalVisitors: newCount });
  } catch {
    res.json({ success: true });
  }
});

// POST /contact — save contact form submission
router.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body as { name?: string; email?: string; subject?: string; message?: string };
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }
  try {
    await db.insert(contactsTable).values({ name, email, subject, message });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save message" });
  }
});

// POST /clipboard — save clipboard content, return handle
router.post("/clipboard", async (req, res) => {
  const { content, expiresInHours } = req.body as { content?: string; expiresInHours?: number };
  if (!content?.trim()) return res.status(400).json({ error: "Content is required" });
  const hours = typeof expiresInHours === "number" && expiresInHours > 0 && expiresInHours <= 168
    ? expiresInHours : 24;
  try {
    const handle = Math.random().toString(36).slice(2, 9);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    await db.insert(clipboardsTable).values({ handle, content, expiresAt });
    res.json({ handle });
  } catch {
    res.status(500).json({ error: "Failed to save clipboard" });
  }
});

// GET /clipboard/:handle — retrieve clipboard content
router.get("/clipboard/:handle", async (req, res) => {
  const handle = req.params.handle as string;
  try {
    const [row] = await db.select().from(clipboardsTable).where(eq(clipboardsTable.handle, handle)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (new Date() > row.expiresAt) {
      await db.delete(clipboardsTable).where(eq(clipboardsTable.handle, handle));
      return res.status(410).json({ error: "Expired" });
    }
    res.json({ content: row.content, expiresAt: row.expiresAt });
  } catch {
    res.status(500).json({ error: "Failed to retrieve clipboard" });
  }
});

// PUT /clipboard/:handle — update clipboard content
router.put("/clipboard/:handle", async (req, res) => {
  const handle = req.params.handle as string;
  const { content, expiresInHours } = req.body as { content?: string; expiresInHours?: number };
  if (!content?.trim()) return res.status(400).json({ error: "Content is required" });
  try {
    const [row] = await db.select().from(clipboardsTable).where(eq(clipboardsTable.handle, handle)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (new Date() > row.expiresAt) {
      await db.delete(clipboardsTable).where(eq(clipboardsTable.handle, handle));
      return res.status(410).json({ error: "Expired" });
    }
    
    const hours = typeof expiresInHours === "number" && expiresInHours > 0 && expiresInHours <= 168
      ? expiresInHours : null;
    const expiresAt = hours ? new Date(Date.now() + hours * 60 * 60 * 1000) : undefined;

    await db.update(clipboardsTable)
      .set({ content, ...(expiresAt ? { expiresAt } : {}) })
      .where(eq(clipboardsTable.handle, handle));

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update clipboard" });
  }
});

// GET /sitemap.xsl
router.get("/sitemap.xsl", (req, res) => {
  res.setHeader("Content-Type", "text/xsl");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | 5toolbox</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 2rem;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #fff;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.025);
          }
          h1 {
            font-size: 24px;
            color: #0f172a;
            margin-bottom: 5px;
          }
          p {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 25px;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 12px;
            font-weight: 600;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          tr:hover td {
            background-color: #f8fafc;
          }
          .priority-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            background-color: #dbeafe;
            color: #1e40af;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>XML Sitemap</h1>
          <p>This is an XML Sitemap generated for search engines like Google and Bing. You can find more information about XML sitemaps on <a href="https://sitemaps.org">sitemaps.org</a>.</p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Priority</th>
                <th>Change Freq</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <span class="priority-badge">
                      <xsl:value-of select="sitemap:priority"/>
                    </span>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                  <td>
                    <xsl:value-of select="sitemap:lastmod"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`);
});

// GET /sitemap.xml
router.get("/sitemap.xml", async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable);
    const blogs = await db.select().from(blogsTable);
    const articles = await db.select().from(articlesTable);

    const forwardedHost = req.headers["x-forwarded-host"];
    let reqHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    if (reqHost && reqHost.includes(",")) {
      reqHost = reqHost.split(",")[0].trim();
    }
    if (!reqHost) {
      reqHost = req.get("host");
    }
    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = reqHost ? `${proto}://${reqHost}` : (process.env.FRONTEND_URL ?? "https://5toolbox.app");

    const now = new Date().toISOString().split("T")[0];
    
    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/pdf", priority: "0.9", changefreq: "weekly" },
      { url: "/image", priority: "0.9", changefreq: "weekly" },
      { url: "/convert", priority: "0.9", changefreq: "weekly" },
      { url: "/calculator", priority: "0.9", changefreq: "weekly" },
      { url: "/text", priority: "0.8", changefreq: "weekly" },
      { url: "/blog", priority: "0.8", changefreq: "daily" },
      { url: "/about", priority: "0.6", changefreq: "monthly" },
      { url: "/privacy", priority: "0.4", changefreq: "yearly" },
      { url: "/terms", priority: "0.4", changefreq: "yearly" },
      { url: "/contact", priority: "0.5", changefreq: "monthly" },
      { url: "/faq", priority: "0.6", changefreq: "monthly" },
    ];

    const toolPages = tools.filter((t) => !t.isHidden).map((t) => ({
      url: `/tools/${t.slug}`,
      priority: t.isFeatured ? "0.8" : "0.7",
      changefreq: "monthly",
    }));

    const blogPages = blogs.map((b) => ({
      url: `/blog/${b.slug}`,
      priority: "0.7",
      changefreq: "weekly",
    }));

    const articlePages = articles.map((a) => ({
      url: `/articles/${a.slug}`,
      priority: "0.7",
      changefreq: "weekly",
    }));

    const allPages = [...staticPages, ...toolPages, ...blogPages, ...articlePages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map((p) => `  <url>
    <loc>${host}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Vary", "Accept-Encoding");
    res.send(xml);
  } catch {
    res.status(500).send("Error generating sitemap");
  }
});

// GET /robots.txt
router.get("/robots.txt", (req, res) => {
  const forwardedHost = req.headers["x-forwarded-host"];
  let reqHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  if (reqHost && reqHost.includes(",")) {
    reqHost = reqHost.split(",")[0].trim();
  }
  if (!reqHost) {
    reqHost = req.get("host");
  }
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const host = reqHost ? `${proto}://${reqHost}` : (process.env.FRONTEND_URL ?? "https://5toolbox.app");

  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *\nAllow: /\n\nSitemap: ${host}/sitemap.xml\n\nDisallow: /admin\nDisallow: /api/admin/`);
});

export default router;
