import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, commentsTable, ratingsTable } from "@workspace/db";
import { requireAdmin } from "./admin";

const router = Router();

// GET /comments/:pageType/:slug - get comments list
router.get("/comments/:pageType/:slug", async (req, res) => {
  const { pageType, slug } = req.params;
  try {
    const list = await db
      .select()
      .from(commentsTable)
      .where(and(eq(commentsTable.pageType, pageType), eq(commentsTable.pageSlug, slug)))
      .orderBy(desc(commentsTable.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST /comments/:pageType/:slug - add a comment
router.post("/comments/:pageType/:slug", async (req, res) => {
  const { pageType, slug } = req.params;
  const { userName, content } = req.body as { userName?: string; content?: string };
  if (!userName?.trim() || !content?.trim()) {
    return res.status(400).json({ error: "Username and content are required" });
  }
  try {
    const [newComment] = await db
      .insert(commentsTable)
      .values({
        pageType,
        pageSlug: slug,
        userName: userName.trim(),
        content: content.trim()
      })
      .returning();
    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// GET /ratings/:toolSlug - get average rating and total ratings count
router.get("/ratings/:toolSlug", async (req, res) => {
  const { toolSlug } = req.params;
  try {
    const list = await db
      .select()
      .from(ratingsTable)
      .where(eq(ratingsTable.toolSlug, toolSlug));

    if (list.length === 0) {
      return res.json({ average: 0, count: 0 });
    }

    const total = list.reduce((acc, r) => acc + r.rating, 0);
    const average = Number((total / list.length).toFixed(1));

    res.json({ average, count: list.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

// POST /ratings/:toolSlug - post a rating (1-5)
router.post("/ratings/:toolSlug", async (req, res) => {
  const { toolSlug } = req.params;
  const { rating } = req.body as { rating?: number };
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating value (must be between 1 and 5)" });
  }
  const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "anonymous";

  try {
    // Basic IP spam check: verify if rated in the last 1 minute
    const existing = await db
      .select()
      .from(ratingsTable)
      .where(
        and(
          eq(ratingsTable.toolSlug, toolSlug),
          eq(ratingsTable.ipAddress, ipAddress)
        )
      )
      .orderBy(desc(ratingsTable.createdAt))
      .limit(1);

    if (existing[0] && Date.now() - new Date(existing[0].createdAt).getTime() < 60000) {
      return res.status(429).json({ error: "You can submit a rating once per minute" });
    }

    const [newRating] = await db
      .insert(ratingsTable)
      .values({
        toolSlug,
        rating,
        ipAddress
      })
      .returning();
    res.json(newRating);
  } catch (error) {
    res.status(500).json({ error: "Failed to post rating" });
  }
});

// GET /admin/comments - list all comments across tools/blogs (Admin only)
router.get("/admin/comments", requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select()
      .from(commentsTable)
      .orderBy(desc(commentsTable.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// DELETE /admin/comments/:id - delete a comment (Admin only)
router.delete("/admin/comments/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db
      .delete(commentsTable)
      .where(eq(commentsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Comment not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// GET /admin/ratings - list all ratings (Admin only)
router.get("/admin/ratings", requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select()
      .from(ratingsTable)
      .orderBy(desc(ratingsTable.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

// DELETE /admin/ratings/:id - delete a rating (Admin only)
router.delete("/admin/ratings/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db
      .delete(ratingsTable)
      .where(eq(ratingsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Rating not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete rating" });
  }
});

// DELETE /admin/ratings/tool/:toolSlug - reset all ratings for a tool (Admin only)
router.delete("/admin/ratings/tool/:toolSlug", requireAdmin, async (req, res) => {
  const toolSlug = req.params.toolSlug as string;
  try {
    await db
      .delete(ratingsTable)
      .where(eq(ratingsTable.toolSlug, toolSlug));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset ratings" });
  }
});

export default router;
