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
    try {
      console.log('Creating analysis:', analysis);
      const [result] = await db.insert(analyses).values([analysis]).returning();
      console.log('Analysis created:', result);
      return result;
    } catch (error) {
      console.error('Error creating analysis:', error);
      throw error;
    }
  }

  async getAnalysisByVideoId(videoId: string): Promise<Analysis | undefined> {
    try {
      console.log('Getting analysis for videoId:', videoId);
      const [result] = await db.select().from(analyses).where(eq(analyses.videoId, videoId));
      console.log('Found analysis:', result);
      return result;
    } catch (error) {
      console.error('Error getting analysis:', error);
      throw error;
    }
  }

  async createSavedContent(content: InsertSavedContent): Promise<SavedContent> {
    try {
      console.log('Creating saved content:', content);
      const [result] = await db.insert(savedContent).values([content]).returning();
      console.log('Saved content created:', result);
      return result;
    } catch (error) {
      console.error('Error creating saved content:', error);
      throw error;
    }
  }

  async getSavedContent(): Promise<SavedContent[]> {
    try {
      console.log('Getting all saved content');
      const results = await db.select().from(savedContent).orderBy(savedContent.createdAt);
      console.log('Found saved content count:', results.length);
      return results;
    } catch (error) {
      console.error('Error getting saved content:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();