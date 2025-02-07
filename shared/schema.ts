import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  videoId: text("video_id").notNull(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail").notNull(),
  hooks: json("hooks").$type<string[]>().notNull(),
  summary: text("summary").notNull(),
  flashcards: json("flashcards").$type<{question: string, answer: string}[]>().notNull(),
  keyPoints: json("key_points").$type<string[]>().notNull(),
  llmProvider: text("llm_provider").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({ 
  id: true,
  createdAt: true
});

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

// Add Video type for frontend
export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  date: string;
}