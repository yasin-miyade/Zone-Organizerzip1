import { Router } from "express";
import { db } from "@workspace/db";
import { toolsTable, siteSettingsTable, contactsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// ----- Auth middleware -----
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7);
  try {
    if (!db) {
      throw new Error("Database not initialized");
    }
    const [setting] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "admin_password"))
      .limit(1);
    const adminPassword = setting?.value ?? "admin123";
    if (token !== adminPassword) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  } catch (err) {
    req.log.warn({ err }, "Database offline during admin authentication check, using default credential fallback");
    if (token === "admin123") {
      return next();
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// POST /admin/login
router.post("/admin/login", async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password) return res.status(400).json({ error: "Password required" });
  try {
    if (!db) {
      throw new Error("Database not initialized");
    }
    const [setting] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "admin_password"))
      .limit(1);
    const adminPassword = setting?.value ?? "admin123";
    if (password !== adminPassword) {
      return res.status(401).json({ error: "Wrong password" });
    }
    res.json({ token: password });
  } catch (err) {
    req.log.warn({ err }, "Database offline during login, checking against default admin123");
    if (password === "admin123") {
      return res.json({ token: "admin123" });
    }
    res.status(401).json({ error: "Wrong password" });
  }
});

// GET /admin/stats — real aggregate stats for the dashboard
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable);

    const totalFilesProcessed = tools.reduce((acc, t) => acc + t.usageCount, 0);
    const totalTools = tools.length;
    const hiddenTools = tools.filter(t => t.isHidden).length;
    const featuredTools = tools.filter(t => t.isFeatured).length;

    const categoryMap: Record<string, number> = {};
    for (const t of tools) {
      categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.usageCount;
    }

    const topTools = [...tools]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(t => ({ slug: t.slug, name: t.name, category: t.category, usageCount: t.usageCount }));

    // Visitor count from settings
    const [visitorSetting] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "total_visitors"))
      .limit(1);
    const totalVisitors = parseInt(visitorSetting?.value ?? "0", 10);

    res.json({
      totalFilesProcessed,
      totalTools,
      hiddenTools,
      featuredTools,
      totalVisitors,
      topTools,
      conversionsByCategory: Object.entries(categoryMap).map(([category, count]) => ({ category, count })),
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/tools — all tools including hidden
router.get("/admin/tools", requireAdmin, async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable).orderBy(desc(toolsTable.usageCount));
    res.json(tools);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/tools/:slug — update tool metadata
router.put("/admin/tools/:slug", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  const body = req.body as {
    name?: string;
    description?: string;
    category?: string;
    icon?: string;
    isFeatured?: boolean;
    isHidden?: boolean;
    sortOrder?: number;
    inputFormats?: string[];
    outputFormats?: string[];
    metaTitle?: string | null;
    metaDescription?: string | null;
    introduction?: string | null;
    features?: string | null;
    benefits?: string | null;
    steps?: string | null;
    faqs?: string | null;
    advantages?: string | null;
    commonErrors?: string | null;
    useCases?: string | null;
    examples?: string | null;
    tips?: string | null;
    version?: string;
    license?: string;
    developer?: string;
  };

  try {
    const [existing] = await db
      .select()
      .from(toolsTable)
      .where(eq(toolsTable.slug, slug))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Tool not found" });

    const [updated] = await db
      .update(toolsTable)
      .set({
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        category: body.category ?? existing.category,
        icon: body.icon ?? existing.icon,
        isFeatured: body.isFeatured ?? existing.isFeatured,
        isHidden: body.isHidden ?? existing.isHidden,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        inputFormats: body.inputFormats ?? existing.inputFormats,
        outputFormats: body.outputFormats ?? existing.outputFormats,
        metaTitle: body.metaTitle !== undefined ? body.metaTitle : existing.metaTitle,
        metaDescription: body.metaDescription !== undefined ? body.metaDescription : existing.metaDescription,
        introduction: body.introduction !== undefined ? body.introduction : existing.introduction,
        features: body.features !== undefined ? body.features : existing.features,
        benefits: body.benefits !== undefined ? body.benefits : existing.benefits,
        steps: body.steps !== undefined ? body.steps : existing.steps,
        faqs: body.faqs !== undefined ? body.faqs : existing.faqs,
        advantages: body.advantages !== undefined ? body.advantages : existing.advantages,
        commonErrors: body.commonErrors !== undefined ? body.commonErrors : existing.commonErrors,
        useCases: body.useCases !== undefined ? body.useCases : existing.useCases,
        examples: body.examples !== undefined ? body.examples : existing.examples,
        tips: body.tips !== undefined ? body.tips : existing.tips,
        version: body.version ?? existing.version,
        license: body.license ?? existing.license,
        developer: body.developer ?? existing.developer,
        lastUpdated: new Date(),
      })
      .where(eq(toolsTable.slug, slug))
      .returning();

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/tools/:slug
router.delete("/admin/tools/:slug", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  try {
    await db.delete(toolsTable).where(eq(toolsTable.slug, slug));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/tools", requireAdmin, async (req, res) => {
  const body = req.body as {
    slug: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    route?: string;
    isFeatured?: boolean;
    isHidden?: boolean;
    sortOrder?: number;
    inputFormats?: string[];
    outputFormats?: string[];
    metaTitle?: string;
    metaDescription?: string;
    introduction?: string;
    features?: string;
    benefits?: string;
    steps?: string;
    faqs?: string;
    advantages?: string;
    commonErrors?: string;
    useCases?: string;
    examples?: string;
    tips?: string;
    version?: string;
    license?: string;
    developer?: string;
  };

  if (!body.slug || !body.name || !body.description || !body.category) {
    return res.status(400).json({ error: "slug, name, description and category are required" });
  }

  try {
    const [created] = await db
      .insert(toolsTable)
      .values({
        slug: body.slug,
        name: body.name,
        description: body.description,
        category: body.category,
        icon: body.icon ?? "FileText",
        route: body.route ?? `/tools/${body.slug}`,
        isFeatured: body.isFeatured ?? false,
        isHidden: body.isHidden ?? false,
        sortOrder: body.sortOrder ?? 0,
        inputFormats: body.inputFormats ?? [],
        outputFormats: body.outputFormats ?? [],
        usageCount: 0,
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        introduction: body.introduction || null,
        features: body.features || null,
        benefits: body.benefits || null,
        steps: body.steps || null,
        faqs: body.faqs || null,
        advantages: body.advantages || null,
        commonErrors: body.commonErrors || null,
        useCases: body.useCases || null,
        examples: body.examples || null,
        tips: body.tips || null,
        version: body.version || "1.0.0",
        license: body.license || "MIT",
        developer: body.developer || "5toolbox",
      })
      .returning();
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/settings
router.get("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const settings = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const s of settings) {
      if (s.key !== "admin_password") {
        map[s.key] = s.value;
      }
    }
    res.json(map);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /admin/settings
router.put("/admin/settings", requireAdmin, async (req, res) => {
  const body = req.body as Record<string, string>;
  try {
    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(siteSettingsTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
    }
    const settings = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/tools/:slug/reset-usage — reset usage count
router.post("/admin/tools/:slug/reset-usage", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  try {
    await db.update(toolsTable).set({ usageCount: 0 }).where(eq(toolsTable.slug, slug));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/contacts — list all contact submissions
router.get("/admin/contacts", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/contacts/:id/read — mark as read
router.patch("/admin/contacts/:id/read", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.update(contactsTable).set({ isRead: true }).where(eq(contactsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/contacts/:id — delete a contact submission
router.delete("/admin/contacts/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
