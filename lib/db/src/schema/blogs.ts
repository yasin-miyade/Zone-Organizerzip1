import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blogsTable = pgTable("blogs", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  coverImage: text("cover_image"),
  authorName: text("author_name").notNull().default("5toolbox Team"),
  authorAvatar: text("author_avatar"),
  readTime: integer("read_time").notNull().default(5),
  tags: text("tags").array().notNull().default([]),
  category: text("category").notNull().default("General"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  bookmarks: integer("bookmarks").notNull().default(0),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogSchema = createInsertSchema(blogsTable).omit({ id: true, publishedAt: true, updatedAt: true });
export type InsertBlog = z.infer<typeof insertBlogSchema>;
export type Blog = typeof blogsTable.$inferSelect;
