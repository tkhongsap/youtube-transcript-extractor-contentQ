import { db } from '../db';
import { videos, reports, flashcards, ideas, ideaSets } from '@shared/schema';
import { ilike, and, eq } from 'drizzle-orm';
import { calculateRelevance } from '../utils/searchRanking';

export type ResultType = 'video' | 'report' | 'flashcard' | 'idea';

export interface SearchResult {
  id: number;
  type: ResultType;
  title: string;
  excerpt: string;
  createdAt: Date;
  score: number;
}

export async function searchContent(
  userId: string,
  query: string,
  type?: ResultType,
  limit: number = 20
): Promise<SearchResult[]> {
  const like = `%${query}%`;
  let results: SearchResult[] = [];

  if (!type || type === 'video') {
    const rows = await db
      .select({ id: videos.id, title: videos.title, description: videos.description, createdAt: videos.createdAt })
      .from(videos)
      .where(and(eq(videos.userId, userId), ilike(videos.title, like)))
      .limit(limit);
    results = results.concat(
      rows.map(r => ({
        id: r.id,
        type: 'video' as const,
        title: r.title,
        excerpt: r.description || '',
        createdAt: r.createdAt as Date,
        score: calculateRelevance({ title: r.title, content: r.description || '', createdAt: r.createdAt as Date }, query)
      }))
    );
  }

  if (!type || type === 'report') {
    const rows = await db
      .select({ id: reports.id, title: reports.title, content: reports.content, createdAt: reports.createdAt })
      .from(reports)
      .innerJoin(videos, eq(reports.videoId, videos.id))
      .where(and(eq(videos.userId, userId), ilike(reports.title, like)))
      .limit(limit);
    results = results.concat(
      rows.map(r => ({
        id: r.id,
        type: 'report' as const,
        title: r.title,
        excerpt: r.content.slice(0, 200),
        createdAt: r.createdAt as Date,
        score: calculateRelevance({ title: r.title, content: r.content, createdAt: r.createdAt as Date }, query)
      }))
    );
  }

  if (!type || type === 'flashcard') {
    const rows = await db
      .select({ id: flashcards.id, question: flashcards.question, answer: flashcards.answer, createdAt: flashcards.createdAt })
      .from(flashcards)
      .where(ilike(flashcards.question, like))
      .limit(limit);
    results = results.concat(
      rows.map(r => ({
        id: r.id,
        type: 'flashcard' as const,
        title: r.question,
        excerpt: r.answer,
        createdAt: r.createdAt as Date,
        score: calculateRelevance({ title: r.question, content: r.answer, createdAt: r.createdAt as Date }, query)
      }))
    );
  }

  if (!type || type === 'idea') {
    const rows = await db
      .select({ id: ideas.id, content: ideas.content, createdAt: ideas.createdAt })
      .from(ideas)
      .innerJoin(ideaSets, eq(ideas.ideaSetId, ideaSets.id))
      .innerJoin(videos, eq(ideaSets.videoId, videos.id))
      .where(and(eq(videos.userId, userId), ilike(ideas.content, like)))
      .limit(limit);
    results = results.concat(
      rows.map(r => ({
        id: r.id,
        type: 'idea' as const,
        title: r.content.slice(0, 50),
        excerpt: r.content,
        createdAt: r.createdAt as Date,
        score: calculateRelevance({ title: r.content, content: r.content, createdAt: r.createdAt as Date }, query)
      }))
    );
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
