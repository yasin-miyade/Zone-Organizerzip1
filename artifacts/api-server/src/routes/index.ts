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
  const { content } = req.body as { content?: string };
  if (!content?.trim()) return res.status(400).json({ error: "Content is required" });
  try {
    const [row] = await db.select().from(clipboardsTable).where(eq(clipboardsTable.handle, handle)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (new Date() > row.expiresAt) {
      await db.delete(clipboardsTable).where(eq(clipboardsTable.handle, handle));
      return res.status(410).json({ error: "Expired" });
    }
    await db.update(clipboardsTable).set({ content }).where(eq(clipboardsTable.handle, handle));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update clipboard" });
  }
});

// GET /sitemap.xml
router.get("/sitemap.xml", async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable);
    const blogs = await db.select().from(blogsTable);
    const articles = await db.select().from(articlesTable);

    const host = process.env.FRONTEND_URL
      ?? (process.env.REPLIT_DOMAINS?.split(",")[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "https://5toolbox.app");
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages.map((p) => `  <url>
    <loc>${host}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch {
    res.status(500).send("Error generating sitemap");
  }
});

// GET /robots.txt
router.get("/robots.txt", (req, res) => {
  const host = process.env.FRONTEND_URL ?? "https://5toolbox.app";
  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *\nAllow: /\n\nSitemap: ${host}/sitemap.xml\n\nDisallow: /admin\nDisallow: /api/admin/`);
});

export default router;
