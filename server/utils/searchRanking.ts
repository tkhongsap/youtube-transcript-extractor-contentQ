export interface SearchableItem {
  title: string;
  content: string;
  createdAt: Date;
  viewCount?: number;
}

export const calculateRelevance = (item: SearchableItem, query: string) => {
  let score = 0;
  if (item.title.toLowerCase().includes(query.toLowerCase())) {
    score += 100;
  }
  if (item.content.toLowerCase().includes(query.toLowerCase())) {
    score += 50;
  }
  const daysSince = Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  score += Math.max(0, 30 - daysSince);
  if (item.viewCount) {
    score += item.viewCount * 2;
  }
  return score;
};
