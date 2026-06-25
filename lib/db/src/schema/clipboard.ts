import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const clipboardsTable = pgTable("clipboards", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
