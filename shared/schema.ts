import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nickname: varchar("nickname", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  cap: varchar("cap", { length: 5 }).notNull(),
  raggioKm: integer("raggio_km").notNull().default(10),
  albumSelezionato: uuid("album_selezionato"),
  startTrial: timestamp("start_trial").notNull().defaultNow(),
  isPremium: boolean("is_premium").notNull().default(false),
  role: varchar("role", { length: 10 }).notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stickers = pgTable("stickers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  albumId: uuid("album_id").notNull().references(() => albums.id, { onDelete: "cascade" }),
  number: varchar("number", { length: 10 }).notNull(),
  name: text("name").notNull(),
  team: text("team"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userStickers = pgTable("user_stickers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stickerId: uuid("sticker_id").notNull().references(() => stickers.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 10 }).notNull(), // 'yes', 'no', 'double'
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: uuid("user1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  user2Id: uuid("user2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  albumId: uuid("album_id").notNull().references(() => albums.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'completed', 'cancelled'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: uuid("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // 'user', 'error', 'spam'
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'resolved', 'dismissed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  startTrial: true,
  createdAt: true,
}).extend({
  nickname: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore"),
  cap: z.string().length(5).regex(/^\d{5}$/, "Il CAP deve essere di 5 cifre"),
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri"),
});

export const insertAlbumSchema = createInsertSchema(albums).omit({
  id: true,
  createdAt: true,
});

export const insertStickerSchema = createInsertSchema(stickers).omit({
  id: true,
  createdAt: true,
});

export const insertUserStickerSchema = createInsertSchema(userStickers).omit({
  id: true,
  updatedAt: true,
}).extend({
  status: z.enum(["yes", "no", "double"]),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Album = typeof albums.$inferSelect;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type Sticker = typeof stickers.$inferSelect;
export type InsertSticker = z.infer<typeof insertStickerSchema>;
export type UserSticker = typeof userStickers.$inferSelect;
export type InsertUserSticker = z.infer<typeof insertUserStickerSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
