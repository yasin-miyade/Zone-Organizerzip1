import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  authorName: text("author_name").notNull().default("5toolbox Team"),
  readTime: integer("read_time").notNull().default(5),
  views: integer("views").notNull().default(0),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  socialLinks: jsonb("social_links").$type<{ platform: string; url: string }[]>().default([]).notNull(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, publishedAt: true, updatedAt: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
