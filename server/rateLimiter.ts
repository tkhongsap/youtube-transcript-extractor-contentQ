import { db } from './db';
import { sql } from 'drizzle-orm';
import { rateLimits } from '@shared/schema';

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10;

export async function consume(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    // Get current rate limit record
    const [existing] = await db
      .select()
      .from(rateLimits)
      .where(sql`${rateLimits.userId} = ${userId}`)
      .limit(1);

    if (!existing) {
      // First request for this user
      await db.insert(rateLimits).values({
        userId,
        requestCount: 1,
        windowStart: now,
      });
      return true;
    }

    // Check if we need to reset the window
    if (existing.windowStart < windowStart) {
      // Reset the window
      await db
        .update(rateLimits)
        .set({
          requestCount: 1,
          windowStart: now,
        })
        .where(sql`${rateLimits.userId} = ${userId}`);
      return true;
    }

    // Check if user has exceeded the limit
    if (existing.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    // Increment the request count
    await db
      .update(rateLimits)
      .set({
        requestCount: existing.requestCount + 1,
      })
      .where(sql`${rateLimits.userId} = ${userId}`);

    return true;
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request to proceed
    return true;
  }
}

export async function getRemainingRequests(userId: string): Promise<number> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    const [existing] = await db
      .select()
      .from(rateLimits)
      .where(sql`${rateLimits.userId} = ${userId}`)
      .limit(1);

    if (!existing || existing.windowStart < windowStart) {
      return MAX_REQUESTS_PER_WINDOW;
    }

    return Math.max(0, MAX_REQUESTS_PER_WINDOW - existing.requestCount);
  } catch (error) {
    console.error('Error getting remaining requests:', error);
    return MAX_REQUESTS_PER_WINDOW;
  }
}
