const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateInfo {
  count: number;
  windowStart: number;
}

const userLimits = new Map<string, RateInfo>();

export function consume(userId: string): boolean {
  const now = Date.now();
  const info = userLimits.get(userId);
  if (!info || now - info.windowStart > WINDOW_MS) {
    userLimits.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (info.count >= RATE_LIMIT) {
    return false;
  }

  info.count++;
  return true;
}

export function getRemaining(userId: string): number {
  const info = userLimits.get(userId);
  if (!info || Date.now() - info.windowStart > WINDOW_MS) {
    return RATE_LIMIT;
  }
  return Math.max(0, RATE_LIMIT - info.count);
}
