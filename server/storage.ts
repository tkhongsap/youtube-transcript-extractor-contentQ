import { analyses, savedContent, type Analysis, type InsertAnalysis, type SavedContent, type InsertSavedContent } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysisByVideoId(videoId: string): Promise<Analysis | undefined>;
  createSavedContent(content: InsertSavedContent): Promise<SavedContent>;
  getSavedContent(): Promise<SavedContent[]>;
}

export class DatabaseStorage implements IStorage {
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [result] = await db.insert(analyses).values(analysis).returning();
    return result;
  }

  async getAnalysisByVideoId(videoId: string): Promise<Analysis | undefined> {
    const [result] = await db.select().from(analyses).where(eq(analyses.videoId, videoId));
    return result;
  }

  async createSavedContent(content: InsertSavedContent): Promise<SavedContent> {
    const [result] = await db.insert(savedContent).values(content).returning();
    return result;
  }

  async getSavedContent(): Promise<SavedContent[]> {
    return db.select().from(savedContent).orderBy(savedContent.createdAt);
  }
}

export const storage = new DatabaseStorage();