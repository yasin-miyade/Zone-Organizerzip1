import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import healthRouter from "./health";
import toolsRouter from "./tools";
import adminRouter from "./admin";
import { db } from "@workspace/db";
import { toolsTable, siteSettingsTable } from "@workspace/db";

const router: IRouter = Router();

router.use(healthRouter);
router.use(toolsRouter);
router.use(adminRouter);

// GET /public-settings — returns non-sensitive settings (adsense config, site meta)
router.get("/public-settings", async (req, res) => {
  const PUBLIC_KEYS = [
    "adsense_enabled", "adsense_client",
    "adsense_slot_leaderboard", "adsense_slot_rectangle", "adsense_slot_responsive",
    "site_title", "site_description", "maintenance_mode", "maintenance_message",
  ];
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (PUBLIC_KEYS.includes(row.key)) map[row.key] = row.value;
    }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(map);
  } catch {
    res.json({});
  }
});

// POST /visit — increment unique visitor counter
router.post("/visit", async (req, res) => {
  try {
    const [existing] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "total_visitors"))
      .limit(1);

    const current = parseInt(existing?.value ?? "0", 10);
    const newCount = current + 1;

    await db
      .insert(siteSettingsTable)
      .values({ key: "total_visitors", value: String(newCount) })
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: { value: String(newCount), updatedAt: new Date() },
      });

    res.json({ success: true, totalVisitors: newCount });
  } catch {
    res.json({ success: true });
  }
});

// GET /sitemap.xml
router.get("/sitemap.xml", async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable);
    const host = process.env.FRONTEND_URL
      ?? (process.env.REPLIT_DOMAINS?.split(",")[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "https://filezone.app");

    const now = new Date().toISOString().split("T")[0];

    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/pdf", priority: "0.9", changefreq: "weekly" },
      { url: "/image", priority: "0.9", changefreq: "weekly" },
      { url: "/convert", priority: "0.9", changefreq: "weekly" },
      { url: "/calculator", priority: "0.9", changefreq: "weekly" },
      { url: "/text", priority: "0.8", changefreq: "weekly" },
      { url: "/about", priority: "0.6", changefreq: "monthly" },
      { url: "/privacy", priority: "0.4", changefreq: "yearly" },
      { url: "/terms", priority: "0.4", changefreq: "yearly" },
      { url: "/contact", priority: "0.5", changefreq: "monthly" },
    ];

    const toolPages = tools
      .filter((t) => !t.isHidden)
      .map((t) => ({
        url: `/tools/${t.slug}`,
        priority: t.isFeatured ? "0.8" : "0.7",
        changefreq: "monthly",
      }));

    const allPages = [...staticPages, ...toolPages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages
  .map(
    (p) => `  <url>
    <loc>${host}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join("\n")}
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
  const host = process.env.FRONTEND_URL ?? "https://filezone.app";
  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: ${host}/sitemap.xml

Disallow: /admin
Disallow: /api/admin/`);
});

export default router;
