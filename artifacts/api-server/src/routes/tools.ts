import { Router } from "express";
import { db } from "@workspace/db";
import { toolsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /tools — only non-hidden tools
router.get("/tools", async (req, res) => {
  try {
    const tools = await db
      .select()
      .from(toolsTable)
      .where(eq(toolsTable.isHidden, false))
      .orderBy(desc(toolsTable.usageCount));
    res.json(tools);
  } catch (err) {
    req.log.error({ err }, "Failed to list tools");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tools/stats
router.get("/tools/stats", async (req, res) => {
  try {
    const tools = await db
      .select()
      .from(toolsTable)
      .where(eq(toolsTable.isHidden, false))
      .orderBy(desc(toolsTable.usageCount));

    const totalConversions = tools.reduce((acc, t) => acc + t.usageCount, 0);
    const categoryMap: Record<string, number> = {};
    for (const t of tools) {
      categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.usageCount;
    }
    const conversionsByCategory = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));
    const topTools = tools.slice(0, 6);

    res.json({ totalConversions, totalTools: tools.length, topTools, conversionsByCategory });
  } catch (err) {
    req.log.error({ err }, "Failed to get tool stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tools/categories
router.get("/tools/categories", async (req, res) => {
  try {
    const tools = await db
      .select()
      .from(toolsTable)
      .where(eq(toolsTable.isHidden, false));

    const categoryMeta: Record<string, { name: string; description: string; icon: string; color: string }> = {
      pdf: { name: "PDF Tools", description: "Edit, convert and manage PDF files", icon: "FileText", color: "#ef4444" },
      image: { name: "Image Tools", description: "Compress, resize and convert images", icon: "Image", color: "#3b82f6" },
      convert: { name: "Convert Tools", description: "Convert between popular file formats", icon: "RefreshCw", color: "#8b5cf6" },
      text: { name: "Text Tools", description: "Analyze, format and transform text", icon: "AlignLeft", color: "#10b981" },
      calculator: { name: "Calculators", description: "Math, finance and utility calculators", icon: "Calculator", color: "#f59e0b" },
    };

    const counts: Record<string, number> = {};
    for (const t of tools) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }

    const categories = Object.entries(categoryMeta)
      .filter(([slug]) => counts[slug])
      .map(([slug, meta]) => ({
        slug,
        name: meta.name,
        description: meta.description,
        toolCount: counts[slug] ?? 0,
        icon: meta.icon,
        color: meta.color,
      }));

    res.json(categories);
  } catch (err) {
    req.log.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /tools/:toolSlug/track
router.post("/tools/:toolSlug/track", async (req, res) => {
  const toolSlug = req.params.toolSlug as string;
  const filesProcessed: number = req.body.filesProcessed ?? 1;

  try {
    const [tool] = await db
      .select()
      .from(toolsTable)
      .where(eq(toolsTable.slug, toolSlug))
      .limit(1);

    if (!tool) return res.status(404).json({ error: "Tool not found" });

    const [updated] = await db
      .update(toolsTable)
      .set({ usageCount: tool.usageCount + filesProcessed })
      .where(eq(toolsTable.slug, toolSlug))
      .returning({ newCount: toolsTable.usageCount });

    res.json({ success: true, newCount: updated.newCount });
  } catch (err) {
    req.log.error({ err }, "Failed to track tool usage");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tools/:toolSlug
router.get("/tools/:toolSlug", async (req, res) => {
  const toolSlug = req.params.toolSlug as string;

  try {
    const [tool] = await db
      .select()
      .from(toolsTable)
      .where(eq(toolsTable.slug, toolSlug))
      .limit(1);

    if (!tool) return res.status(404).json({ error: "Tool not found" });
    res.json(tool);
  } catch (err) {
    req.log.error({ err }, "Failed to get tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
