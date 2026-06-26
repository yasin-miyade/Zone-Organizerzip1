import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, blogsTable, articlesTable } from "@workspace/db";
import { requireAdmin } from "./admin";

const router = Router();

// ================= PUBLIC ROUTES =================

// GET /blogs - list all blogs
router.get("/blogs", async (req, res) => {
  try {
    const list = await db
      .select()
      .from(blogsTable)
      .orderBy(desc(blogsTable.publishedAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// GET /articles - list all articles
router.get("/articles", async (req, res) => {
  try {
    const list = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.publishedAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});


// GET /blogs/:slug - get individual blog content & increment views
router.get("/blogs/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const [blog] = await db
      .select()
      .from(blogsTable)
      .where(eq(blogsTable.slug, slug))
      .limit(1);

    if (!blog) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    // Increment views asynchronously
    await db
      .update(blogsTable)
      .set({ views: blog.views + 1 })
      .where(eq(blogsTable.slug, slug));

    res.json({ ...blog, views: blog.views + 1 });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// GET /articles/:slug - get individual article & increment views
router.get("/articles/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const [article] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.slug, slug))
      .limit(1);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    await db
      .update(articlesTable)
      .set({ views: article.views + 1 })
      .where(eq(articlesTable.slug, slug));

    res.json({ ...article, views: article.views + 1 });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

// POST /blogs/:slug/like - increment likes for a blog post
router.post("/blogs/:slug/like", async (req, res) => {
  const { slug } = req.params;
  try {
    const [blog] = await db
      .select()
      .from(blogsTable)
      .where(eq(blogsTable.slug, slug))
      .limit(1);

    if (!blog) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    const [updated] = await db
      .update(blogsTable)
      .set({ likes: blog.likes + 1 })
      .where(eq(blogsTable.slug, slug))
      .returning();

    res.json({ likes: updated.likes });
  } catch (error) {
    res.status(500).json({ error: "Failed to update likes" });
  }
});



// ================= ADMIN ROUTES =================

// GET /admin/blogs - list all blogs (for admin table)
router.get("/admin/blogs", requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select()
      .from(blogsTable)
      .orderBy(desc(blogsTable.publishedAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// POST /admin/blogs - create blog post
router.post("/admin/blogs", requireAdmin, async (req, res) => {
  const { slug, title, content, summary, metaTitle, metaDescription, coverImage, authorName, readTime, tags, category } = req.body;
  if (!slug || !title || !content || !summary) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    const [newBlog] = await db.insert(blogsTable).values({
      slug,
      title,
      content,
      summary,
      metaTitle,
      metaDescription,
      coverImage,
      authorName: authorName || "5toolbox Team",
      readTime: Number(readTime) || 5,
      tags: tags || [],
      category: category || "General"
    }).returning();
    res.json(newBlog);
  } catch (error) {
    res.status(500).json({ error: "Failed to create blog post (check unique slug)" });
  }
});

// PUT /admin/blogs/:id - update blog post
router.put("/admin/blogs/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, title, content, summary, metaTitle, metaDescription, coverImage, authorName, readTime, tags, category } = req.body;
  try {
    const [updated] = await db
      .update(blogsTable)
      .set({
        slug,
        title,
        content,
        summary,
        metaTitle,
        metaDescription,
        coverImage,
        authorName,
        readTime: Number(readTime) || 5,
        tags,
        category,
        updatedAt: new Date()
      })
      .where(eq(blogsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Blog post not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

// DELETE /admin/blogs/:id - delete blog post
router.delete("/admin/blogs/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db
      .delete(blogsTable)
      .where(eq(blogsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Blog post not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

// GET /admin/articles - list all articles (for admin table)
router.get("/admin/articles", requireAdmin, async (req, res) => {
  try {
    const list = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.publishedAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// POST /admin/articles - create article
router.post("/admin/articles", requireAdmin, async (req, res) => {
  const { slug, title, content, summary, metaTitle, metaDescription, authorName, readTime } = req.body;
  if (!slug || !title || !content || !summary) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    const [newArticle] = await db.insert(articlesTable).values({
      slug,
      title,
      content,
      summary,
      metaTitle,
      metaDescription,
      authorName: authorName || "5toolbox Team",
      readTime: Number(readTime) || 5
    }).returning();
    res.json(newArticle);
  } catch (error) {
    res.status(500).json({ error: "Failed to create article (check unique slug)" });
  }
});

// PUT /admin/articles/:id - update article
router.put("/admin/articles/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, title, content, summary, metaTitle, metaDescription, authorName, readTime } = req.body;
  try {
    const [updated] = await db
      .update(articlesTable)
      .set({
        slug,
        title,
        content,
        summary,
        metaTitle,
        metaDescription,
        authorName,
        readTime: Number(readTime) || 5,
        updatedAt: new Date()
      })
      .where(eq(articlesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Article not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update article" });
  }
});

// DELETE /admin/articles/:id - delete article
router.delete("/admin/articles/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db
      .delete(articlesTable)
      .where(eq(articlesTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Article not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete article" });
  }
});

export default router;
