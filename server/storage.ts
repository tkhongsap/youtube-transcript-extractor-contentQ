import { 
  users, 
  videos, 
  summaries, 
  reports, 
  flashcardSets, 
  flashcards, 
  ideaSets, 
  ideas, 
  type User, 
  type UpsertUser,
  type Video,
  type InsertVideo,
  type Summary,
  type InsertSummary,
  type Report,
  type InsertReport,
  type FlashcardSet,
  type InsertFlashcardSet,
  type Flashcard,
  type InsertFlashcard,
  type IdeaSet,
  type InsertIdeaSet,
  type Idea,
  type InsertIdea
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Video operations
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByYoutubeId(youtubeId: string, userId: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  getUserVideos(userId: string, limit?: number): Promise<Video[]>;
  
  // Summary operations
  createSummary(summary: InsertSummary): Promise<Summary>;
  getVideoSummary(videoId: number): Promise<Summary | undefined>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getVideoReports(videoId: number): Promise<Report[]>;
  getUserReports(userId: string, limit?: number): Promise<Report[]>;
  deleteReport(id: number): Promise<void>;
  
  // Flashcard operations
  createFlashcardSet(set: InsertFlashcardSet): Promise<FlashcardSet>;
  createFlashcard(card: InsertFlashcard): Promise<Flashcard>;
  getFlashcardSets(videoId: number): Promise<FlashcardSet[]>;
  getUserFlashcardSets(userId: string, limit?: number): Promise<FlashcardSet[]>;
  getFlashcards(setId: number): Promise<Flashcard[]>;
  deleteFlashcardSet(id: number): Promise<void>;
  
  // Idea operations
  createIdeaSet(set: InsertIdeaSet): Promise<IdeaSet>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  getIdeaSets(videoId: number): Promise<IdeaSet[]>;
  getUserIdeaSets(userId: string, type?: string, limit?: number): Promise<IdeaSet[]>;
  getIdeas(setId: number): Promise<Idea[]>;
  deleteIdeaSet(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Video operations
  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }
  
  async getVideoByYoutubeId(youtubeId: string, userId: string): Promise<Video | undefined> {
    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.youtubeId, youtubeId), eq(videos.userId, userId)));
    return video;
  }
  
  async createVideo(video: InsertVideo): Promise<Video> {
    const [createdVideo] = await db.insert(videos).values(video).returning();
    return createdVideo;
  }
  
  async getUserVideos(userId: string, limit: number = 10): Promise<Video[]> {
    return db
      .select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }
  
  // Summary operations
  async createSummary(summary: InsertSummary): Promise<Summary> {
    const [createdSummary] = await db.insert(summaries).values(summary).returning();
    return createdSummary;
  }
  
  async getVideoSummary(videoId: number): Promise<Summary | undefined> {
    const [summary] = await db
      .select()
      .from(summaries)
      .where(eq(summaries.videoId, videoId))
      .orderBy(desc(summaries.createdAt))
      .limit(1);
    return summary;
  }
  
  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const [createdReport] = await db.insert(reports).values(report).returning();
    return createdReport;
  }
  
  async getVideoReports(videoId: number): Promise<Report[]> {
    return db
      .select()
      .from(reports)
      .where(eq(reports.videoId, videoId))
      .orderBy(desc(reports.createdAt));
  }
  
  async getUserReports(userId: string, limit: number = 10): Promise<Report[]> {
    return db
      .select({
        id: reports.id,
        videoId: reports.videoId,
        title: reports.title,
        content: reports.content,
        type: reports.type,
        createdAt: reports.createdAt,
        videoTitle: videos.title
      })
      .from(reports)
      .innerJoin(videos, eq(reports.videoId, videos.id))
      .where(eq(videos.userId, userId))
      .orderBy(desc(reports.createdAt))
      .limit(limit);
  }
  
  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }
  
  // Flashcard operations
  async createFlashcardSet(set: InsertFlashcardSet): Promise<FlashcardSet> {
    const [createdSet] = await db.insert(flashcardSets).values(set).returning();
    return createdSet;
  }
  
  async createFlashcard(card: InsertFlashcard): Promise<Flashcard> {
    const [createdCard] = await db.insert(flashcards).values(card).returning();
    return createdCard;
  }
  
  async getFlashcardSets(videoId: number): Promise<FlashcardSet[]> {
    return db
      .select()
      .from(flashcardSets)
      .where(eq(flashcardSets.videoId, videoId))
      .orderBy(desc(flashcardSets.createdAt));
  }
  
  async getUserFlashcardSets(userId: string, limit: number = 10): Promise<FlashcardSet[]> {
    const sets = await db
      .select({
        id: flashcardSets.id,
        videoId: flashcardSets.videoId,
        title: flashcardSets.title,
        description: flashcardSets.description,
        createdAt: flashcardSets.createdAt,
        videoTitle: videos.title
      })
      .from(flashcardSets)
      .innerJoin(videos, eq(flashcardSets.videoId, videos.id))
      .where(eq(videos.userId, userId))
      .orderBy(desc(flashcardSets.createdAt))
      .limit(limit);
      
    // Get card count for each set
    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        const cards = await db
          .select({ count: flashcards.id })
          .from(flashcards)
          .where(eq(flashcards.flashcardSetId, set.id));
          
        return {
          ...set,
          cardCount: cards.length
        };
      })
    );
    
    return setsWithCounts;
  }
  
  async getFlashcards(setId: number): Promise<Flashcard[]> {
    return db
      .select()
      .from(flashcards)
      .where(eq(flashcards.flashcardSetId, setId));
  }
  
  async deleteFlashcardSet(id: number): Promise<void> {
    // First delete all flashcards in the set
    await db.delete(flashcards).where(eq(flashcards.flashcardSetId, id));
    // Then delete the set
    await db.delete(flashcardSets).where(eq(flashcardSets.id, id));
  }
  
  // Idea operations
  async createIdeaSet(set: InsertIdeaSet): Promise<IdeaSet> {
    const [createdSet] = await db.insert(ideaSets).values(set).returning();
    return createdSet;
  }
  
  async createIdea(idea: InsertIdea): Promise<Idea> {
    const [createdIdea] = await db.insert(ideas).values(idea).returning();
    return createdIdea;
  }
  
  async getIdeaSets(videoId: number): Promise<IdeaSet[]> {
    return db
      .select()
      .from(ideaSets)
      .where(eq(ideaSets.videoId, videoId))
      .orderBy(desc(ideaSets.createdAt));
  }
  
  async getUserIdeaSets(userId: string, type?: string, limit: number = 10): Promise<IdeaSet[]> {
    let query = db
      .select({
        id: ideaSets.id,
        videoId: ideaSets.videoId,
        type: ideaSets.type,
        createdAt: ideaSets.createdAt,
        videoTitle: videos.title
      })
      .from(ideaSets)
      .innerJoin(videos, eq(ideaSets.videoId, videos.id))
      .where(eq(videos.userId, userId));
      
    if (type) {
      query = query.where(eq(ideaSets.type, type));
    }
      
    return query
      .orderBy(desc(ideaSets.createdAt))
      .limit(limit);
  }
  
  async getIdeas(setId: number): Promise<Idea[]> {
    return db
      .select()
      .from(ideas)
      .where(eq(ideas.ideaSetId, setId));
  }
  
  async deleteIdeaSet(id: number): Promise<void> {
    // First delete all ideas in the set
    await db.delete(ideas).where(eq(ideas.ideaSetId, id));
    // Then delete the set
    await db.delete(ideaSets).where(eq(ideaSets.id, id));
  }
}

export const storage = new DatabaseStorage();
