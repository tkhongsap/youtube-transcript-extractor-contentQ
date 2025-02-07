import { analyses, type Analysis, type InsertAnalysis } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysisByVideoId(videoId: string): Promise<Analysis | undefined>;
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
}

export const storage = new DatabaseStorage();