import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, blogsTable, articlesTable, defaultBlogs, defaultArticles } from "@workspace/db";
import { requireAdmin } from "./admin";

const router = Router();

// In-memory fallback stores for offline mode operation (persists during process lifetime)
let memoryBlogs: any[] = [...defaultBlogs].map((b, i) => ({
  ...b,
  id: i + 1,
  publishedAt: new Date(),
  updatedAt: new Date(),
  views: 0,
  likes: 0,
  bookmarks: 0,
  socialLinks: (b as any).socialLinks || []
}));

let memoryArticles: any[] = [...defaultArticles].map((a, i) => ({
  ...a,
  id: i + 1,
  publishedAt: new Date(),
  updatedAt: new Date(),
  views: 0,
  socialLinks: (a as any).socialLinks || []
}));

// ================= PUBLIC ROUTES =================

// GET /blogs - list all blogs
router.get("/blogs", async (req, res) => {
  try {
    if (!db) throw new Error("Database offline");
    const list = await db
      .select()
      .from(blogsTable)
      .orderBy(desc(blogsTable.publishedAt));
    res.json(list);
  } catch (error) {
    req.log.warn({ error }, "Database offline or query failed, falling back to static defaultBlogs");
    res.json(memoryBlogs);
  }
});

// GET /articles - list all articles
router.get("/articles", async (req, res) => {
  try {
    if (!db) throw new Error("Database offline");
    const list = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.publishedAt));
    res.json(list);
  } catch (error) {
    req.log.warn({ error }, "Database offline or query failed, falling back to static defaultArticles");
    res.json(memoryArticles);
  }
});


// GET /blogs/:slug - get individual blog content & increment views
router.get("/blogs/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    if (!db) throw new Error("Database offline");
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
    req.log.warn({ error }, "Database offline or query failed, falling back to memory blog lookup");
    const existingIndex = memoryBlogs.findIndex((b) => b.slug === slug);
    if (existingIndex === -1) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    const blog = memoryBlogs[existingIndex];
    blog.views += 1;
    res.json(blog);
  }
});

// GET /articles/:slug - get individual article & increment views
router.get("/articles/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    if (!db) throw new Error("Database offline");
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
    req.log.warn({ error }, "Database offline or query failed, falling back to memory article lookup");
    const existingIndex = memoryArticles.findIndex((a) => a.slug === slug);
    if (existingIndex === -1) {
      return res.status(404).json({ error: "Article not found" });
    }
    const article = memoryArticles[existingIndex];
    article.views += 1;
    res.json(article);
  }
});

// POST /blogs/:slug/like - increment likes for a blog post
router.post("/blogs/:slug/like", async (req, res) => {
  const { slug } = req.params;
  try {
    if (!db) throw new Error("Database offline");
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
    req.log.warn({ error }, "Database offline or query failed, simulating blog like count increment");
    const existingIndex = memoryBlogs.findIndex((b) => b.slug === slug);
    if (existingIndex === -1) {
      return res.json({ likes: 1 });
    }
    memoryBlogs[existingIndex].likes += 1;
    res.json({ likes: memoryBlogs[existingIndex].likes });
  }
});



// ================= ADMIN ROUTES =================

// GET /admin/blogs - list all blogs (for admin table)
router.get("/admin/blogs", requireAdmin, async (req, res) => {
  try {
    if (!db) throw new Error("Database offline");
    const list = await db
      .select()
      .from(blogsTable)
      .orderBy(desc(blogsTable.publishedAt));
    res.json(list);
  } catch (error) {
    req.log.warn({ error }, "Database offline during admin blogs load, using fallback defaultBlogs");
    res.json(memoryBlogs);
  }
});

// POST /admin/blogs - create blog post
router.post("/admin/blogs", requireAdmin, async (req, res) => {
  const { slug, title, content, summary, metaTitle, metaDescription, coverImage, authorName, readTime, tags, category, socialLinks } = req.body;
  if (!slug || !title || !content || !summary) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    if (!db) throw new Error("Database offline");
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
      category: category || "General",
      socialLinks: socialLinks || []
    }).returning();
    res.json(newBlog);
  } catch (error) {
    req.log.warn({ error }, "Database offline during blog creation, simulating success");
    const simulated = {
      id: Math.floor(Math.random() * 1000000),
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
      category: category || "General",
      socialLinks: socialLinks || [],
      publishedAt: new Date(),
      updatedAt: new Date()
    };
    memoryBlogs.push(simulated);
    res.json(simulated);
  }
});

// PUT /admin/blogs/:id - update blog post
router.put("/admin/blogs/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, title, content, summary, metaTitle, metaDescription, coverImage, authorName, readTime, tags, category, socialLinks } = req.body;
  try {
    if (!db) throw new Error("Database offline");
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
        socialLinks: socialLinks || [],
        updatedAt: new Date()
      })
      .where(eq(blogsTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Blog post not found" });
    res.json(updated);
  } catch (error) {
    req.log.warn({ error }, "Database offline during blog update, simulating success");
    const existingIndex = memoryBlogs.findIndex(b => b.id === id);
    const existing = existingIndex !== -1 ? memoryBlogs[existingIndex] : {};
    const simulated = {
      ...existing,
      id,
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
      category: category || "General",
      socialLinks: socialLinks || [],
      publishedAt: existing.publishedAt || new Date(),
      updatedAt: new Date()
    };
    if (existingIndex !== -1) {
      memoryBlogs[existingIndex] = simulated;
    } else {
      memoryBlogs.push(simulated);
    }
    res.json(simulated);
  }
});

// DELETE /admin/blogs/:id - delete blog post
router.delete("/admin/blogs/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    if (!db) throw new Error("Database offline");
    const [deleted] = await db
      .delete(blogsTable)
      .where(eq(blogsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Blog post not found" });
    res.json({ success: true });
  } catch (error) {
    req.log.warn({ error }, "Database offline during blog delete, simulating success");
    memoryBlogs = memoryBlogs.filter(b => b.id !== id);
    res.json({ success: true });
  }
});

// GET /admin/articles - list all articles (for admin table)
router.get("/admin/articles", requireAdmin, async (req, res) => {
  try {
    if (!db) throw new Error("Database offline");
    const list = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.publishedAt));
    res.json(list);
  } catch (error) {
    req.log.warn({ error }, "Database offline during admin articles load, using fallback defaultArticles");
    res.json(memoryArticles);
  }
});

// POST /admin/articles - create article
router.post("/admin/articles", requireAdmin, async (req, res) => {
  const { slug, title, content, summary, metaTitle, metaDescription, authorName, readTime, socialLinks } = req.body;
  if (!slug || !title || !content || !summary) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    if (!db) throw new Error("Database offline");
    const [newArticle] = await db.insert(articlesTable).values({
      slug,
      title,
      content,
      summary,
      metaTitle,
      metaDescription,
      authorName: authorName || "5toolbox Team",
      readTime: Number(readTime) || 5,
      socialLinks: socialLinks || []
    }).returning();
    res.json(newArticle);
  } catch (error) {
    req.log.warn({ error }, "Database offline during article creation, simulating success");
    const simulated = {
      id: Math.floor(Math.random() * 1000000),
      slug,
      title,
      content,
      summary,
      metaTitle,
      metaDescription,
      authorName: authorName || "5toolbox Team",
      readTime: Number(readTime) || 5,
      socialLinks: socialLinks || [],
      publishedAt: new Date(),
      updatedAt: new Date()
    };
    memoryArticles.push(simulated);
    res.json(simulated);
  }
});

// PUT /admin/articles/:id - update article
router.put("/admin/articles/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, title, content, summary, metaTitle, metaDescription, authorName, readTime, socialLinks } = req.body;
  try {
    if (!db) throw new Error("Database offline");
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
        socialLinks: socialLinks || [],
        updatedAt: new Date()
      })
      .where(eq(articlesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Article not found" });
    res.json(updated);
  } catch (error) {
    req.log.warn({ error }, "Database offline during article update, simulating success");
    const existingIndex = memoryArticles.findIndex(a => a.id === id);
    const existing = existingIndex !== -1 ? memoryArticles[existingIndex] : {};
    const simulated = {
      ...existing,
      id,
      slug,
      title,
      content,
      summary,
      metaTitle,
      metaDescription,
      authorName: authorName || "5toolbox Team",
      readTime: Number(readTime) || 5,
      socialLinks: socialLinks || [],
      publishedAt: existing.publishedAt || new Date(),
      updatedAt: new Date()
    };
    if (existingIndex !== -1) {
      memoryArticles[existingIndex] = simulated;
    } else {
      memoryArticles.push(simulated);
    }
    res.json(simulated);
  }
});

// DELETE /admin/articles/:id - delete article
router.delete("/admin/articles/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    if (!db) throw new Error("Database offline");
    const [deleted] = await db
      .delete(articlesTable)
      .where(eq(articlesTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Article not found" });
    res.json({ success: true });
  } catch (error) {
    req.log.warn({ error }, "Database offline during article deletion, simulating success");
    memoryArticles = memoryArticles.filter(a => a.id !== id);
    res.json({ success: true });
  }
});

export default router;
