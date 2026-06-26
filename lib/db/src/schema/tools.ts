import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
  route: text("route").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isHidden: boolean("is_hidden").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  inputFormats: text("input_formats").array().notNull().default([]),
  outputFormats: text("output_formats").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  introduction: text("introduction"),
  features: text("features"), // JSON string array
  benefits: text("benefits"), // JSON string array
  steps: text("steps"), // JSON string array of steps
  faqs: text("faqs"), // JSON string array of Q&As
  advantages: text("advantages"), // JSON string array
  commonErrors: text("common_errors"), // JSON string array
  useCases: text("use_cases"), // JSON string array
  examples: text("examples"), // JSON string array
  tips: text("tips"), // JSON string array
  version: text("version").notNull().default("1.0.0"),
  license: text("license").notNull().default("MIT"),
  developer: text("developer").notNull().default("5toolbox"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true, lastUpdated: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
