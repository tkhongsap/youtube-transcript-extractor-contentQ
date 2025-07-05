import {
  type UpsertUser,
  type User,
  users,
  videos,
  summaries,
  reports,
  flashcardSets,
  flashcards,
  ideaSets,
  ideas,
  additionalTexts,
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
  type InsertIdea,
  type AdditionalText,
  type InsertAdditionalText
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Video operations
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByYoutubeId(youtubeId: string, userId: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video | null>;
  getUserVideos(userId: string, limit?: number): Promise<Video[]>;
  
  // Summary operations
  createSummary(summary: InsertSummary): Promise<Summary>;
  getVideoSummary(videoId: number): Promise<Summary | undefined>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReport(id: number): Promise<(Report & { userId: string }) | undefined>;
  updateReport(id: number, data: Partial<InsertReport>): Promise<Report | null>;
  getVideoReports(videoId: number): Promise<Report[]>;
  getUserReports(userId: string, limit?: number): Promise<Report[]>;
  deleteReport(id: number): Promise<void>;
  
  // Flashcard operations
  createFlashcardSet(set: InsertFlashcardSet): Promise<FlashcardSet>;
  createFlashcard(card: InsertFlashcard): Promise<Flashcard>;
  getFlashcardSet(id: number): Promise<(FlashcardSet & { userId: string }) | undefined>;
  updateFlashcardSet(id: number, data: Partial<InsertFlashcardSet>): Promise<FlashcardSet | null>;
  getFlashcard(id: number): Promise<(Flashcard & { userId: string }) | undefined>;
  updateFlashcard(id: number, data: Partial<InsertFlashcard>): Promise<Flashcard | null>;
  deleteFlashcard(id: number): Promise<void>;
  getFlashcardSets(videoId: number): Promise<FlashcardSet[]>;
  getUserFlashcardSets(userId: string, limit?: number): Promise<FlashcardSet[]>;
  getFlashcards(setId: number): Promise<Flashcard[]>;
  deleteFlashcardSet(id: number): Promise<void>;
  
  // Idea operations
  createIdeaSet(set: InsertIdeaSet): Promise<IdeaSet>;
  createIdea(idea: InsertIdea): Promise<Idea>;
  getIdeaSet(id: number): Promise<(IdeaSet & { userId: string }) | undefined>;
  updateIdeaSet(id: number, data: Partial<InsertIdeaSet>): Promise<IdeaSet | null>;
  getIdea(id: number): Promise<(Idea & { userId: string }) | undefined>;
  updateIdea(id: number, data: Partial<InsertIdea>): Promise<Idea | null>;
  deleteIdea(id: number): Promise<void>;
  getIdeaSets(videoId: number): Promise<IdeaSet[]>;
  getUserIdeaSets(userId: string, type?: string, limit?: number): Promise<IdeaSet[]>;
  getIdeas(setId: number): Promise<Idea[]>;
  deleteIdeaSet(id: number): Promise<void>;

  // Additional text operations
  createAdditionalText(text: InsertAdditionalText): Promise<AdditionalText>;
  getAdditionalText(id: string): Promise<AdditionalText | undefined>;
  getAdditionalTextByVideoId(videoId: number): Promise<AdditionalText[]>;
  updateAdditionalText(videoId: number, id: string, data: Partial<InsertAdditionalText>): Promise<AdditionalText | null>;
  deleteAdditionalText(videoId: number, id: string): Promise<boolean>;

  // Deletion helpers
  deleteVideo(id: number): Promise<void>;
  deleteUser(id: string): Promise<void>;
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
  
  async updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video | null> {
    const [updated] = await db
      .update(videos)
      .set(data)
      .where(eq(videos.id, id))
      .returning();
    return updated || null;
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
    const [createdSummary] = await db.insert(summaries).values({
      videoId: summary.videoId,
      summary: summary.summary,
      keyTopics: Array.isArray(summary.keyTopics) ? summary.keyTopics as string[] : []
    }).returning();
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

  async getReport(id: number): Promise<(Report & { userId: string }) | undefined> {
    const [report] = await db
      .select({
        id: reports.id,
        videoId: reports.videoId,
        title: reports.title,
        content: reports.content,
        type: reports.type,
        editCount: reports.editCount,
        lastModified: reports.lastModified,
        createdAt: reports.createdAt,
        userId: videos.userId
      })
      .from(reports)
      .innerJoin(videos, eq(reports.videoId, videos.id))
      .where(eq(reports.id, id));
    return report;
  }

  async updateReport(id: number, data: Partial<InsertReport>): Promise<Report | null> {
    const [updated] = await db
      .update(reports)
      .set({
        ...data,
        editCount: sql`${reports.editCount} + 1`,
        lastModified: new Date(),
        videoId: undefined
      })
      .where(eq(reports.id, id))
      .returning();
    return updated || null;
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
        editCount: reports.editCount,
        lastModified: reports.lastModified,
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

  async getFlashcardSet(id: number): Promise<(FlashcardSet & { userId: string }) | undefined> {
    const [set] = await db
      .select({
        id: flashcardSets.id,
        videoId: flashcardSets.videoId,
        title: flashcardSets.title,
        description: flashcardSets.description,
        createdAt: flashcardSets.createdAt,
        userId: videos.userId
      })
      .from(flashcardSets)
      .innerJoin(videos, eq(flashcardSets.videoId, videos.id))
      .where(eq(flashcardSets.id, id));
    return set;
  }

  async updateFlashcardSet(id: number, data: Partial<InsertFlashcardSet>): Promise<FlashcardSet | null> {
    const [updated] = await db
      .update(flashcardSets)
      .set({
        ...data,
        videoId: undefined
      })
      .where(eq(flashcardSets.id, id))
      .returning();
    return updated || null;
  }

  async getFlashcard(id: number): Promise<(Flashcard & { userId: string }) | undefined> {
    const [card] = await db
      .select({
        id: flashcards.id,
        flashcardSetId: flashcards.flashcardSetId,
        question: flashcards.question,
        answer: flashcards.answer,
        lastModified: flashcards.lastModified,
        createdAt: flashcards.createdAt,
        userId: videos.userId
      })
      .from(flashcards)
      .innerJoin(flashcardSets, eq(flashcards.flashcardSetId, flashcardSets.id))
      .innerJoin(videos, eq(flashcardSets.videoId, videos.id))
      .where(eq(flashcards.id, id));
    return card;
  }

  async updateFlashcard(id: number, data: Partial<InsertFlashcard>): Promise<Flashcard | null> {
    const [updated] = await db
      .update(flashcards)
      .set({
        ...data,
        lastModified: new Date(),
        flashcardSetId: undefined
      })
      .where(eq(flashcards.id, id))
      .returning();
    return updated || null;
  }

  async deleteFlashcard(id: number): Promise<void> {
    await db.delete(flashcards).where(eq(flashcards.id, id));
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
    
    // Get card counts for each set
    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        const cards = await this.getFlashcards(set.id);
        return { ...set, cardCount: cards.length };
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

  async getIdeaSet(id: number): Promise<(IdeaSet & { userId: string }) | undefined> {
    const [set] = await db
      .select({
        id: ideaSets.id,
        videoId: ideaSets.videoId,
        type: ideaSets.type,
        createdAt: ideaSets.createdAt,
        userId: videos.userId
      })
      .from(ideaSets)
      .innerJoin(videos, eq(ideaSets.videoId, videos.id))
      .where(eq(ideaSets.id, id));
    return set;
  }

  async updateIdeaSet(id: number, data: Partial<InsertIdeaSet>): Promise<IdeaSet | null> {
    const [updated] = await db
      .update(ideaSets)
      .set({
        ...data,
        videoId: undefined
      })
      .where(eq(ideaSets.id, id))
      .returning();
    return updated || null;
  }
  
  async getUserIdeaSets(userId: string, type?: string, limit: number = 10): Promise<IdeaSet[]> {
    const condition = type
      ? and(eq(videos.userId, userId), eq(ideaSets.type, type))
      : eq(videos.userId, userId);

    return db
      .select({
        id: ideaSets.id,
        videoId: ideaSets.videoId,
        type: ideaSets.type,
        createdAt: ideaSets.createdAt,
        videoTitle: videos.title
      })
      .from(ideaSets)
      .innerJoin(videos, eq(ideaSets.videoId, videos.id))
      .where(condition)
      .orderBy(desc(ideaSets.createdAt))
      .limit(limit);
  }
  
  async getIdeas(setId: number): Promise<Idea[]> {
    return db
      .select()
      .from(ideas)
      .where(eq(ideas.ideaSetId, setId));
  }

  async getIdea(id: number): Promise<(Idea & { userId: string }) | undefined> {
    const [idea] = await db
      .select({
        id: ideas.id,
        ideaSetId: ideas.ideaSetId,
        content: ideas.content,
        lastModified: ideas.lastModified,
        createdAt: ideas.createdAt,
        userId: videos.userId
      })
      .from(ideas)
      .innerJoin(ideaSets, eq(ideas.ideaSetId, ideaSets.id))
      .innerJoin(videos, eq(ideaSets.videoId, videos.id))
      .where(eq(ideas.id, id));
    return idea;
  }

  async updateIdea(id: number, data: Partial<InsertIdea>): Promise<Idea | null> {
    const [updated] = await db
      .update(ideas)
      .set({
        ...data,
        lastModified: new Date(),
        ideaSetId: undefined
      })
      .where(eq(ideas.id, id))
      .returning();
    return updated || null;
  }

  async deleteIdea(id: number): Promise<void> {
    await db.delete(ideas).where(eq(ideas.id, id));
  }
  
  async deleteIdeaSet(id: number): Promise<void> {
    // First delete all ideas in the set
    await db.delete(ideas).where(eq(ideas.ideaSetId, id));
    // Then delete the set
    await db.delete(ideaSets).where(eq(ideaSets.id, id));
  }

  // Additional text operations
  async createAdditionalText(text: InsertAdditionalText): Promise<AdditionalText> {
    const [created] = await db
      .insert(additionalTexts)
      .values(text)
      .returning();
    return created;
  }

  async getAdditionalText(id: string): Promise<AdditionalText | undefined> {
    const [additionalText] = await db
      .select()
      .from(additionalTexts)
      .where(eq(additionalTexts.id, id));
    return additionalText;
  }

  async getAdditionalTextByVideoId(videoId: number): Promise<AdditionalText[]> {
    return db
      .select()
      .from(additionalTexts)
      .where(eq(additionalTexts.videoId, videoId))
      .orderBy(additionalTexts.timestamp, additionalTexts.createdAt);
  }

  async updateAdditionalText(videoId: number, id: string, data: Partial<InsertAdditionalText>): Promise<AdditionalText | null> {
    const [updated] = await db
      .update(additionalTexts)
      .set({
        ...data,
        updatedAt: new Date(),
        videoId: undefined, // Don't allow videoId updates
        id: undefined // Don't allow id updates
      })
      .where(and(
        eq(additionalTexts.id, id),
        eq(additionalTexts.videoId, videoId)
      ))
      .returning();
    return updated || null;
  }

  async deleteAdditionalText(videoId: number, id: string): Promise<boolean> {
    const result = await db
      .delete(additionalTexts)
      .where(and(
        eq(additionalTexts.id, id),
        eq(additionalTexts.videoId, videoId)
      ));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Delete a video and all related data
  async deleteVideo(id: number): Promise<void> {
    // Delete flashcard sets and cards
    const fSets = await db
      .select({ id: flashcardSets.id })
      .from(flashcardSets)
      .where(eq(flashcardSets.videoId, id));
    for (const set of fSets) {
      await this.deleteFlashcardSet(set.id);
    }

    // Delete idea sets and ideas
    const iSets = await db
      .select({ id: ideaSets.id })
      .from(ideaSets)
      .where(eq(ideaSets.videoId, id));
    for (const set of iSets) {
      await this.deleteIdeaSet(set.id);
    }

    // Delete summaries and reports
    await db.delete(summaries).where(eq(summaries.videoId, id));
    await db.delete(reports).where(eq(reports.videoId, id));

    // Delete additional texts
    await db.delete(additionalTexts).where(eq(additionalTexts.videoId, id));

    // Finally delete the video record
    await db.delete(videos).where(eq(videos.id, id));
  }

  // Delete user and all associated data
  async deleteUser(id: string): Promise<void> {
    const vids = await this.getUserVideos(id, 1000);
    for (const vid of vids) {
      await this.deleteVideo(vid.id);
    }
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();