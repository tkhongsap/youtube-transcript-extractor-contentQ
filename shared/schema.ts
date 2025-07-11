import { createInsertSchema } from "drizzle-zod";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  serial,
  index,
  json,
  jsonb
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session table for express-session
export const sessions = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Videos table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  youtubeId: varchar("youtube_id").notNull(),
  title: text("title").notNull(),
  channelTitle: varchar("channel_title"),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  duration: varchar("duration"),
  transcript: text("transcript"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoRelations = relations(videos, ({ one, many }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  summaries: many(summaries),
  reports: many(reports),
  flashcardSets: many(flashcardSets),
  ideaSets: many(ideaSets),
  additionalTexts: many(additionalTexts),
}));

// Summaries table
export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  summary: text("summary").notNull(),
  keyTopics: text("key_topics").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const summaryRelations = relations(summaries, ({ one }) => ({
  video: one(videos, {
    fields: [summaries.videoId],
    references: [videos.id],
  }),
}));

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // "medium" or "linkedin"
  editCount: integer("edit_count").default(0).notNull(),
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportRelations = relations(reports, ({ one }) => ({
  video: one(videos, {
    fields: [reports.videoId],
    references: [videos.id],
  }),
}));

// Flashcard sets table
export const flashcardSets = pgTable("flashcard_sets", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flashcardSetRelations = relations(flashcardSets, ({ one, many }) => ({
  video: one(videos, {
    fields: [flashcardSets.videoId],
    references: [videos.id],
  }),
  flashcards: many(flashcards),
}));

// Flashcards table
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  flashcardSetId: integer("flashcard_set_id").notNull().references(() => flashcardSets.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flashcardRelations = relations(flashcards, ({ one }) => ({
  flashcardSet: one(flashcardSets, {
    fields: [flashcards.flashcardSetId],
    references: [flashcardSets.id],
  }),
}));

// Idea sets table
export const ideaSets = pgTable("idea_sets", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  type: text("type").notNull(), // "blog_titles", "social_media_hooks", "questions"
  createdAt: timestamp("created_at").defaultNow(),
});

export const ideaSetRelations = relations(ideaSets, ({ one, many }) => ({
  video: one(videos, {
    fields: [ideaSets.videoId],
    references: [videos.id],
  }),
  ideas: many(ideas),
}));

// Ideas table
export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  ideaSetId: integer("idea_set_id").notNull().references(() => ideaSets.id),
  content: text("content").notNull(),
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ideaRelations = relations(ideas, ({ one }) => ({
  ideaSet: one(ideaSets, {
    fields: [ideas.ideaSetId],
    references: [ideaSets.id],
  }),
}));

// Additional text table for transcript enhancements
export const additionalTexts = pgTable("additional_texts", {
  id: varchar("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  content: text("content").notNull(),
  label: varchar("label").notNull(), // 'Context', 'Correction', 'Insight', 'Question', 'Note'
  timestamp: integer("timestamp"), // timestamp in seconds (optional)
  position: varchar("position"), // 'before', 'after', 'inline' (optional)
  segmentId: varchar("segment_id"), // reference to transcript segment (optional)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const additionalTextRelations = relations(additionalTexts, ({ one }) => ({
  video: one(videos, {
    fields: [additionalTexts.videoId],
    references: [videos.id],
  }),
}));

// Insert schemas for all tables
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true });
export const insertSummarySchema = createInsertSchema(summaries).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, editCount: true, lastModified: true });
export const insertFlashcardSetSchema = createInsertSchema(flashcardSets).omit({ id: true, createdAt: true });
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true, lastModified: true });
export const insertIdeaSetSchema = createInsertSchema(ideaSets).omit({ id: true, createdAt: true });
export const insertIdeaSchema = createInsertSchema(ideas).omit({ id: true, createdAt: true, lastModified: true });
export const insertAdditionalTextSchema = createInsertSchema(additionalTexts).omit({ createdAt: true, updatedAt: true });

// Export types
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertFlashcardSet = z.infer<typeof insertFlashcardSetSchema>;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type InsertIdeaSet = z.infer<typeof insertIdeaSetSchema>;
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type InsertAdditionalText = z.infer<typeof insertAdditionalTextSchema>;

export type Video = typeof videos.$inferSelect;
export type Summary = typeof summaries.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type FlashcardSet = typeof flashcardSets.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
export type IdeaSet = typeof ideaSets.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type AdditionalText = typeof additionalTexts.$inferSelect;

// YouTube URL validation schema
export const youtubeUrlSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      return youtubeRegex.test(url);
    },
    {
      message: "Must be a valid YouTube URL",
    }
  ),
});